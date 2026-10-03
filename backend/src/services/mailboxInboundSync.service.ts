import { Types } from "mongoose";
import { Mailbox, IMailboxDocument } from "../models/Mailbox.model.js";
import { InboundEmail } from "../models/InboundEmail.model.js";
import { Lead } from "../models/Lead.model.js";
import { SendJob } from "../models/SendJob.model.js";
import { EmailEvent } from "../models/EmailEvent.model.js";
import {
  getDecryptedMailboxCredentials,
  saveMailboxCredentials,
} from "./mailboxEncryption.service.js";
import { refreshGoogleTokens } from "./mailboxOAuth.service.js";
import { processInboundEmailService } from "./inboundEmail.service.js";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

interface HeaderItem {
  name: string;
  value: string;
}

function getHeader(headers: HeaderItem[], name: string): string {
  if (!headers || !Array.isArray(headers)) return "";
  const found = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return found ? found.value : "";
}

function parseSender(fromHeader: string): { name: string; email: string } {
  if (!fromHeader) return { name: "", email: "" };
  const angleMatch = fromHeader.match(/^(.*?)\s*<([^>]+@[^>]+)>/);
  if (angleMatch) {
    const rawName = (angleMatch[1] || "").replace(/^["']|["']$/g, "").trim();
    return {
      name: rawName,
      email: angleMatch[2].trim().toLowerCase(),
    };
  }
  const bareMatch = fromHeader.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (bareMatch) {
    return { name: "", email: bareMatch[1].trim().toLowerCase() };
  }
  return { name: "", email: fromHeader.trim().toLowerCase() };
}

function extractGmailBody(payload: any): { text: string; html: string } {
  let text = "";
  let html = "";

  function traverse(part: any) {
    if (!part) return;

    if (part.mimeType === "text/plain" && part.body?.data) {
      const decoded = Buffer.from(part.body.data, "base64url").toString("utf-8");
      text = text ? `${text}\n${decoded}` : decoded;
    } else if (part.mimeType === "text/html" && part.body?.data) {
      const decoded = Buffer.from(part.body.data, "base64url").toString("utf-8");
      html = html ? `${html}\n${decoded}` : decoded;
    }

    if (part.parts && Array.isArray(part.parts)) {
      for (const subPart of part.parts) {
        traverse(subPart);
      }
    }
  }

  traverse(payload);

  if (!text && html) {
    // Strip tags for fallback text preview
    text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  return { text, html };
}

export interface SyncMailboxResult {
  mailboxId: string;
  email: string;
  provider: string;
  success: boolean;
  newRepliesCount: number;
  requiresReauth?: boolean;
  error?: string;
}

/**
 * Synchronizes incoming replies for a specific mailbox from its email provider (e.g. Gmail).
 */
export async function syncMailboxRepliesService(
  mailboxId: string | Types.ObjectId
): Promise<SyncMailboxResult> {
  const mailbox = await Mailbox.findById(mailboxId);
  if (!mailbox) {
    return {
      mailboxId: String(mailboxId),
      email: "",
      provider: "unknown",
      success: false,
      newRepliesCount: 0,
      error: "Mailbox not found",
    };
  }

  if (mailbox.status !== "active") {
    return {
      mailboxId: mailbox._id.toString(),
      email: mailbox.email,
      provider: mailbox.provider,
      success: true,
      newRepliesCount: 0,
    };
  }

  if (mailbox.provider === "gmail") {
    return syncGmailMailbox(mailbox);
  }

  if (mailbox.provider === "smtp") {
    return syncImapMailbox(mailbox);
  }

  return {
    mailboxId: mailbox._id.toString(),
    email: mailbox.email,
    provider: mailbox.provider,
    success: true,
    newRepliesCount: 0,
  };
}

/**
 * Gmail Sync Engine:
 * 1. Checks Gmail REST API for recent incoming messages
 * 2. Matches against CRM leads or previously sent SendJobs
 * 3. Ingests via processInboundEmailService (stops sequence, cancels jobs, AI classifies)
 */
async function syncGmailMailbox(mailbox: IMailboxDocument): Promise<SyncMailboxResult> {
  const decrypted = await getDecryptedMailboxCredentials(mailbox._id);
  if (!decrypted || !decrypted.credentials) {
    return {
      mailboxId: mailbox._id.toString(),
      email: mailbox.email,
      provider: "gmail",
      success: false,
      newRepliesCount: 0,
      requiresReauth: true,
      error: "Mailbox credentials not found. Please reconnect this mailbox.",
    };
  }

  let accessToken = decrypted.credentials.accessToken;
  const refreshToken = decrypted.credentials.refreshToken;

  if (!accessToken && !refreshToken) {
    return {
      mailboxId: mailbox._id.toString(),
      email: mailbox.email,
      provider: "gmail",
      success: false,
      newRepliesCount: 0,
      requiresReauth: true,
      error: "No access or refresh token found for mailbox. Reconnection required.",
    };
  }

  // Helper to refresh token if needed
  const ensureValidAccessToken = async (): Promise<string | null> => {
    if (refreshToken) {
      try {
        const newTokens = await refreshGoogleTokens({ refreshToken });
        if (newTokens?.accessToken) {
          accessToken = newTokens.accessToken;
          await saveMailboxCredentials({
            mailboxId: mailbox._id,
            workspaceId: mailbox.workspaceId,
            provider: mailbox.provider,
            authType: "oauth2",
            credentials: {
              ...decrypted.credentials,
              accessToken: newTokens.accessToken,
              refreshToken: newTokens.refreshToken || refreshToken,
            },
          });
          mailbox.tokenExpiresAt = newTokens.tokenExpiresAt;
          await mailbox.save();
          return newTokens.accessToken;
        }
      } catch (err: any) {
        console.warn(`[Gmail Sync] Token refresh failed for ${mailbox.email}: ${err.message}`);
        if (
          err.message?.includes("invalid_grant") ||
          err.message?.includes("expired or revoked")
        ) {
          mailbox.status = "error";
          mailbox.health.status = "poor";
          mailbox.health.lastError =
            "Google OAuth token expired or revoked. Please reconnect this mailbox.";
          await mailbox.save().catch(() => {});
        }
      }
    }
    return accessToken || null;
  };

  // If token is missing or expired, attempt proactive refresh
  if (!accessToken) {
    accessToken = await ensureValidAccessToken();
  }

  if (!accessToken) {
    if (mailbox.status === "active") {
      mailbox.status = "error";
      mailbox.health.status = "poor";
      mailbox.health.lastError =
        "Google OAuth token expired or revoked. Please reconnect this mailbox.";
      await mailbox.save().catch(() => {});
    }

    return {
      mailboxId: mailbox._id.toString(),
      email: mailbox.email,
      provider: "gmail",
      success: false,
      newRepliesCount: 0,
      requiresReauth: true,
      error: "Google token has expired or was revoked. Please reconnect this mailbox in Mailbox Settings.",
    };
  }

  // 1. Query recent incoming messages in the mailbox inbox
  const query = `is:inbox -from:${mailbox.email}`;
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
    query
  )}&maxResults=35`;

  let listResp = await fetch(listUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  // Self-heal token if 401
  if (listResp.status === 401 && refreshToken) {
    accessToken = await ensureValidAccessToken();
    if (accessToken) {
      listResp = await fetch(listUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
    }
  }

  // Handle 403 (e.g. missing read permissions)
  if (listResp.status === 403) {
    const errorBody: any = await listResp.json().catch(() => ({}));
    const errorMsg =
      errorBody?.error?.message ||
      "Insufficient permission to read Gmail messages. Re-authorization required.";
    console.warn(`[Gmail Sync] 403 for ${mailbox.email}: ${errorMsg}`);
    return {
      mailboxId: mailbox._id.toString(),
      email: mailbox.email,
      provider: "gmail",
      success: false,
      newRepliesCount: 0,
      requiresReauth: true,
      error: `Gmail read permission (gmail.readonly) missing. Please reconnect this mailbox in Mailbox Settings to enable automated reply syncing.`,
    };
  }

  if (!listResp.ok) {
    const errorBody: any = await listResp.json().catch(() => ({}));
    const errorMsg = errorBody?.error?.message || `Gmail API HTTP ${listResp.status}`;
    return {
      mailboxId: mailbox._id.toString(),
      email: mailbox.email,
      provider: "gmail",
      success: false,
      newRepliesCount: 0,
      error: `Failed to fetch messages from Gmail: ${errorMsg}`,
    };
  }

  const listData: any = await listResp.json();
  const messages: Array<{ id: string; threadId: string }> = listData.messages || [];

  let newRepliesCount = 0;

  for (const msgRef of messages) {
    try {
      // Deduplication check: did we already process this Gmail message?
      const existingInbound = await InboundEmail.findOne({
        $or: [
          { "metadata.gmailMessageId": msgRef.id },
          { messageId: `<${msgRef.id}@gmail.com>` },
        ],
      });

      if (existingInbound) {
        continue;
      }

      // Fetch message details
      const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgRef.id}?format=full`;
      const detailResp = await fetch(detailUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!detailResp.ok) {
        continue;
      }

      const msgData: any = await detailResp.json();
      const headers: HeaderItem[] = msgData.payload?.headers || [];

      const fromHeader = getHeader(headers, "From");
      const toHeader = getHeader(headers, "To") || mailbox.email;
      const subjectHeader = getHeader(headers, "Subject") || "(No Subject)";
      const rawMessageId = getHeader(headers, "Message-ID") || `<${msgRef.id}@gmail.com>`;
      const inReplyTo = getHeader(headers, "In-Reply-To") || undefined;
      const referencesHeader = getHeader(headers, "References");
      const dateHeader = getHeader(headers, "Date");

      const references = referencesHeader
        ? referencesHeader.split(/\s+/).filter(Boolean)
        : undefined;

      const from = parseSender(fromHeader);

      // Skip messages from self
      if (!from.email || from.email.toLowerCase() === mailbox.email.toLowerCase()) {
        continue;
      }

      // Relevance check:
      // Does this message correspond to an existing Lead or an outbound SendJob/EmailEvent?
      const leadExists = await Lead.findOne({
        email: from.email,
        workspaceId: mailbox.workspaceId,
      });

      const candidateIds = [inReplyTo, ...(references || [])].filter(Boolean);
      let matchingJob: any = null;

      if (candidateIds.length > 0) {
        matchingJob = await SendJob.findOne({
          $or: [
            { "providerResponse.messageId": { $in: candidateIds } },
            { "messagePayload.to": from.email },
          ],
          workspaceId: mailbox.workspaceId,
        });
      } else {
        matchingJob = await SendJob.findOne({
          "messagePayload.to": from.email,
          workspaceId: mailbox.workspaceId,
        });
      }

      // If not from a Lead and not in response to any sequence SendJob, skip to avoid cluttering sales inbox
      if (!leadExists && !matchingJob) {
        continue;
      }

      const { text: bodyText, html: bodyHtml } = extractGmailBody(msgData.payload);

      let receivedAt = new Date();
      if (msgData.internalDate) {
        const parsedMs = Number(msgData.internalDate);
        if (!isNaN(parsedMs) && parsedMs > 0) {
          receivedAt = new Date(parsedMs);
        }
      } else if (dateHeader) {
        const parsedDate = new Date(dateHeader);
        if (!isNaN(parsedDate.getTime())) {
          receivedAt = parsedDate;
        }
      }

      // Process Inbound Email (Halts active cadence, cancels pending jobs, AI classifies, updates Lead)
      const result = await processInboundEmailService({
        from,
        to: toHeader,
        subject: subjectHeader,
        bodyText,
        bodyHtml,
        messageId: rawMessageId,
        inReplyTo,
        references,
        mailboxId: mailbox._id,
        workspaceId: mailbox.workspaceId,
        userId: mailbox.userId,
        source: "gmail",
        receivedAt,
      });

      // Attach Gmail metadata for strict future deduplication
      if (result.inboundEmail) {
        result.inboundEmail.metadata = {
          ...(result.inboundEmail.metadata || {}),
          gmailMessageId: msgRef.id,
          gmailThreadId: msgRef.threadId,
        };
        await result.inboundEmail.save();
        newRepliesCount++;
      }
    } catch (msgErr: any) {
      console.error(`[Gmail Sync] Error processing message ${msgRef.id}:`, msgErr.message);
    }
  }

  // Update mailbox sync tracking
  (mailbox as any).lastReplySyncAt = new Date();
  await mailbox.save().catch(() => {});

  return {
    mailboxId: mailbox._id.toString(),
    email: mailbox.email,
    provider: "gmail",
    success: true,
    newRepliesCount,
  };
}

/**
 * IMAP Sync Engine:
 * Connects to IMAP server (e.g. Gmail IMAP or custom IMAP), fetches recent INBOX messages,
 * matches with Leads or SendJobs, and triggers the inbound processing pipeline.
 */
async function syncImapMailbox(mailbox: IMailboxDocument): Promise<SyncMailboxResult> {
  const decrypted = await getDecryptedMailboxCredentials(mailbox._id);
  const user =
    decrypted?.credentials?.imapUser ||
    decrypted?.credentials?.smtpUser ||
    mailbox.email;
  const pass =
    decrypted?.credentials?.imapPass ||
    decrypted?.credentials?.smtpPass;

  if (!user || !pass) {
    return {
      mailboxId: mailbox._id.toString(),
      email: mailbox.email,
      provider: "smtp",
      success: false,
      newRepliesCount: 0,
      error: "No credentials found for IMAP connection",
    };
  }

  // Auto-detect IMAP host
  let host = mailbox.imapConfig?.host;
  let port = mailbox.imapConfig?.port || 993;
  let secure = mailbox.imapConfig?.secure ?? true;

  if (!host) {
    if (
      mailbox.email.endsWith("@gmail.com") ||
      mailbox.smtpConfig?.host?.includes("gmail.com")
    ) {
      host = "imap.gmail.com";
      port = 993;
      secure = true;
    } else if (
      mailbox.smtpConfig?.host?.includes("outlook") ||
      mailbox.smtpConfig?.host?.includes("office365")
    ) {
      host = "outlook.office365.com";
      port = 993;
      secure = true;
    } else if (mailbox.smtpConfig?.host) {
      host = mailbox.smtpConfig.host.replace(/^smtp\./i, "imap.");
    }
  }

  if (!host) {
    return {
      mailboxId: mailbox._id.toString(),
      email: mailbox.email,
      provider: "smtp",
      success: false,
      newRepliesCount: 0,
      error: "Could not resolve IMAP server host for mailbox",
    };
  }

  const client = new ImapFlow({
    host,
    port,
    secure,
    tls: { servername: host },
    auth: { user, pass },
    logger: false,
  });

  let newRepliesCount = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const mailboxObj = client.mailbox;
     
      const total = typeof mailboxObj === "object" && mailboxObj ? mailboxObj.exists : 0;
     
      if (total > 0) {
        // Fetch up to the last 40 messages in INBOX
        const startSeq = Math.max(1, total - 39);
        const range = `${startSeq}:${total}`;

        for await (const msg of client.fetch(range, {
          uid: true,
          envelope: true,
          source: true,
        })) {
          try {
            const parsed = await simpleParser(msg.source);
            const rawMessageId =
              parsed.messageId || `<imap-${msg.uid}-${Date.now()}@coldmailer.ai>`;

            // Deduplication
            const existing = await InboundEmail.findOne({
              $or: [
                { messageId: rawMessageId },
                { "metadata.imapUid": msg.uid },
              ],
            });
            if (existing) continue;

            const fromAddress =
              parsed.from?.value?.[0]?.address?.toLowerCase() || "";
            const fromName =
              parsed.from?.value?.[0]?.name || parsed.from?.text || "";

            // Skip messages from self
            if (
              !fromAddress ||
              fromAddress === mailbox.email.toLowerCase()
            ) {
              continue;
            }

            // Relevance check: must match Lead or SendJob
            const leadExists = await Lead.findOne({
              email: fromAddress,
              workspaceId: mailbox.workspaceId,
            });

            const candidateIds: string[] = [];
            if (parsed.inReplyTo) candidateIds.push(parsed.inReplyTo);
            if (Array.isArray(parsed.references)) {
              candidateIds.push(...parsed.references);
            } else if (typeof parsed.references === "string") {
              candidateIds.push(parsed.references);
            }

            let matchingJob: any = null;
            if (candidateIds.length > 0) {
              matchingJob = await SendJob.findOne({
                $or: [
                  { "providerResponse.messageId": { $in: candidateIds } },
                  { "messagePayload.to": fromAddress },
                ],
                workspaceId: mailbox.workspaceId,
              });
            } else {
              matchingJob = await SendJob.findOne({
                "messagePayload.to": fromAddress,
                workspaceId: mailbox.workspaceId,
              });
            }

            if (!leadExists && !matchingJob) {
              continue;
            }

            const toAddress =
              parsed.to && "value" in parsed.to && parsed.to.value?.[0]?.address
                ? parsed.to.value[0].address.toLowerCase()
                : mailbox.email;
            const subject = parsed.subject || "(No Subject)";
            const bodyText = parsed.text || "";
            const bodyHtml =
              typeof parsed.html === "string" ? parsed.html : undefined;
            const receivedAt = parsed.date || new Date();

            const processResult = await processInboundEmailService({
              from: { name: fromName, email: fromAddress },
              to: toAddress,
              subject,
              bodyText,
              bodyHtml,
              messageId: rawMessageId,
              inReplyTo: parsed.inReplyTo || undefined,
              references: candidateIds.length > 0 ? candidateIds : undefined,
              mailboxId: mailbox._id,
              workspaceId: mailbox.workspaceId,
              userId: mailbox.userId,
              source: "imap",
              receivedAt,
            });

            if (processResult.inboundEmail) {
              processResult.inboundEmail.metadata = {
                ...(processResult.inboundEmail.metadata || {}),
                imapUid: msg.uid,
              };
              await processResult.inboundEmail.save();
              newRepliesCount++;
            }
          } catch (itemErr: any) {
            console.error(`[IMAP Sync] Error processing message:`, itemErr.message);
          }
        }
      }
    } finally {
      lock.release();
      await client.logout().catch(() => {});
    }
  } catch (connErr: any) {
    console.warn(`[IMAP Sync] Connection error for ${mailbox.email}: ${connErr.message}`);
    return {
      mailboxId: mailbox._id.toString(),
      email: mailbox.email,
      provider: "smtp",
      success: false,
      newRepliesCount: 0,
      error: connErr.message,
    };
  }

  (mailbox as any).lastReplySyncAt = new Date();
  await mailbox.save().catch(() => {});

  return {
    mailboxId: mailbox._id.toString(),
    email: mailbox.email,
    provider: "smtp",
    success: true,
    newRepliesCount,
  };
}

export interface SyncAllSummary {
  totalMailboxes: number;
  syncedCount: number;
  newRepliesCount: number;
  results: SyncMailboxResult[];
  reauthRequired: Array<{ mailboxId: string; email: string; message: string }>;
}

/**
 * Syncs incoming replies across all active mailboxes (or filtered by workspace).
 */
export async function syncAllActiveMailboxesService(
  workspaceId?: string | Types.ObjectId
): Promise<SyncAllSummary> {
  const query: any = { status: "active" };
  if (workspaceId) {
    query.workspaceId = new Types.ObjectId(String(workspaceId));
  }

  const mailboxes = await Mailbox.find(query);
  const results: SyncMailboxResult[] = [];
  let totalNewReplies = 0;
  const reauthRequired: Array<{ mailboxId: string; email: string; message: string }> = [];

  for (const mailbox of mailboxes) {
    try {
      const res = await syncMailboxRepliesService(mailbox._id);
      results.push(res);
      totalNewReplies += res.newRepliesCount;

      if (res.requiresReauth) {
        reauthRequired.push({
          mailboxId: res.mailboxId,
          email: res.email,
          message: res.error || "Reconnection required",
        });
      }
    } catch (err: any) {
      results.push({
        mailboxId: mailbox._id.toString(),
        email: mailbox.email,
        provider: mailbox.provider,
        success: false,
        newRepliesCount: 0,
        error: err.message,
      });
    }
  }

  return {
    totalMailboxes: mailboxes.length,
    syncedCount: results.filter((r) => r.success).length,
    newRepliesCount: totalNewReplies,
    results,
    reauthRequired,
  };
}
