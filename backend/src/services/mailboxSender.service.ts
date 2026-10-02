import nodemailer from "nodemailer";
import { Mailbox, IMailboxDocument } from "../models/Mailbox.model.js";
import { Email } from "../models/Email.model.js";
import { Lead } from "../models/Lead.model.js";
import { getDecryptedMailboxCredentials, saveMailboxCredentials } from "./mailboxEncryption.service.js";
import { refreshGoogleTokens, refreshMicrosoftTokens } from "./mailboxOAuth.service.js";
import { syncLeadStatsFromEmails } from "./lead.service.js";
import { logActivity } from "./activity.service.js";
import { ApiError } from "../utils/ApiError.js";
import { Types } from "mongoose";

/**
 * Ensures credentials have an active, non-expired access token.
 * Refreshes OAuth2 tokens automatically if within 5 minutes of expiring.
 */
async function ensureValidCredentials(mailbox: IMailboxDocument, decryptedPayload: any) {
  const { provider, authType, credentials } = decryptedPayload;

  const isOAuth = authType === "oauth2" || provider === "gmail" || provider === "outlook";
  if (!isOAuth) {
    return credentials;
  }

  const now = Date.now();
  const tokenExpiresAt = mailbox.tokenExpiresAt ? new Date(mailbox.tokenExpiresAt).getTime() : 0;
  const isExpiringSoon = tokenExpiresAt - now < 5 * 60 * 1000;

  if (!isExpiringSoon && credentials.accessToken) {
    return credentials;
  }

  // Refresh token
  let newTokens: any;
  if (provider === "gmail") {
    newTokens = await refreshGoogleTokens({ refreshToken: credentials.refreshToken });
  } else if (provider === "outlook") {
    newTokens = await refreshMicrosoftTokens({ refreshToken: credentials.refreshToken });
  }

  if (newTokens) {
    const updatedCredentials = {
      ...credentials,
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken || credentials.refreshToken,
    };

    await saveMailboxCredentials({
      mailboxId: mailbox._id,
      workspaceId: mailbox.workspaceId,
      provider: mailbox.provider,
      authType: "oauth2",
      credentials: updatedCredentials,
    });

    mailbox.tokenExpiresAt = newTokens.tokenExpiresAt;
    await mailbox.save();

    return updatedCredentials;
  }

  return credentials;
}

interface SendParams {
  mailbox: IMailboxDocument;
  credentials: any;
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

/**
 * Sends email via Gmail REST API using OAuth2 tokens and RFC 2822 base64url payload.
 * Bypasses SMTP ports (which are frequently blocked/throttled by ISPs and strict XOAUTH2 scope requirements).
 */
async function sendViaGmail({ mailbox, credentials, to, subject, html, text }: SendParams) {
  // Use nodemailer streamTransport to compile clean, RFC 2822 compliant MIME message
  const composer = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
  });

  const fromAddress = mailbox.name ? `"${mailbox.name}" <${mailbox.email}>` : mailbox.email;

  const builtMail: any = await composer.sendMail({
    from: fromAddress,
    to,
    subject,
    text: text || "",
    html: html || text,
  });

  const raw = (builtMail.message as Buffer).toString("base64url");

  let currentAccessToken = credentials.accessToken;

  let response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${currentAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  // Self-heal: if token expired during execution (401), refresh once and retry
  if (response.status === 401 && credentials.refreshToken) {
    const newTokens = await refreshGoogleTokens({ refreshToken: credentials.refreshToken });
    if (newTokens?.accessToken) {
      currentAccessToken = newTokens.accessToken;
      await saveMailboxCredentials({
        mailboxId: mailbox._id,
        workspaceId: mailbox.workspaceId,
        provider: mailbox.provider,
        authType: "oauth2",
        credentials: {
          ...credentials,
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken || credentials.refreshToken,
        },
      });
      mailbox.tokenExpiresAt = newTokens.tokenExpiresAt;
      await mailbox.save();

      response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      });
    }
  }

  if (!response.ok) {
    const errorData: any = await response.json().catch(() => ({}));
    const errMsg = errorData.error?.message || `Gmail API error (status ${response.status})`;
    throw new Error(`Gmail API failed: ${errMsg}`);
  }

  const sendData: any = await response.json();
  return { messageId: sendData.id || `gmail-${Date.now()}` };
}

/**
 * Sends email via Microsoft Graph API sendMail.
 */
async function sendViaMicrosoft({ mailbox, credentials, to, subject, html, text }: SendParams) {
  const sendMailUrl = "https://graph.microsoft.com/v1.0/me/sendMail";

  const payload = {
    message: {
      subject,
      body: {
        contentType: html ? "HTML" : "Text",
        content: html || text || "",
      },
      toRecipients: [
        {
          emailAddress: {
            address: to,
          },
        },
      ],
    },
    saveToSentItems: "true",
  };

  const response = await fetch(sendMailUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData: any = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Microsoft sendMail failed with status ${response.status}`);
  }

  return { messageId: `msg-${Date.now()}` };
}

/**
 * Sends email via Custom SMTP.
 */
async function sendViaSmtp({ mailbox, credentials, to, subject, html, text }: SendParams) {
  const { host, port, secure } = mailbox.smtpConfig || {};
  const user = credentials.smtpUser || mailbox.smtpConfig?.username || mailbox.email;
  const pass = credentials.smtpPass;

  if (!host || !port) {
    throw new ApiError(400, "SMTP host and port are not properly configured on this mailbox");
  }

  const portNum = Number(port);
  const isSecure = typeof secure === "boolean" ? (portNum === 465 ? true : secure) : portNum === 465;

  const transporter = nodemailer.createTransport({
    host,
    port: portNum,
    secure: isSecure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  } as any);

  const fromAddress = mailbox.name ? `"${mailbox.name}" <${mailbox.email}>` : mailbox.email;

  const info: any = await transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    text: text || "",
    html: html || text,
  });

  return { messageId: info.messageId };
}

export interface SendEmailViaMailboxParams {
  mailboxId: string | Types.ObjectId;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  leadId?: string | Types.ObjectId | null;
  emailId?: string | Types.ObjectId | null;
  userId?: string | Types.ObjectId | null;
  workspaceId?: string | Types.ObjectId | null;
}

/**
 * Main dispatcher to send an email through a connected mailbox.
 */
export async function sendEmailViaMailbox({
  mailboxId,
  to,
  subject,
  html,
  text,
  leadId,
  emailId,
  userId,
  workspaceId,
}: SendEmailViaMailboxParams) {
  if (!mailboxId) throw new ApiError(400, "Mailbox ID is required");
  if (!to) throw new ApiError(400, "Recipient email address is required");
  if (!subject) throw new ApiError(400, "Email subject is required");
  if (!html && !text) throw new ApiError(400, "Email body (HTML or text) is required");

  const mailbox = await Mailbox.findById(mailboxId);
  if (!mailbox) {
    throw new ApiError(404, "Mailbox not found");
  }

  if (workspaceId && String(mailbox.workspaceId) !== String(workspaceId)) {
    throw new ApiError(403, "Access denied to this mailbox in current workspace");
  }

  // Quota & state check
  const sendCheck = mailbox.canSend();
  if (!sendCheck.allowed) {
    const isLimit = sendCheck.reason?.includes("Daily sending limit");
    throw new ApiError(isLimit ? 429 : 400, sendCheck.reason || "Sending not permitted");
  }

  const decryptedRecord = await getDecryptedMailboxCredentials(mailbox._id);
  const activeCredentials = await ensureValidCredentials(mailbox, decryptedRecord);

  let sendResult: { messageId: string };
  try {
    if (mailbox.provider === "gmail") {
      sendResult = await sendViaGmail({
        mailbox,
        credentials: activeCredentials,
        to,
        subject,
        html,
        text,
      });
    } else if (mailbox.provider === "outlook") {
      sendResult = await sendViaMicrosoft({
        mailbox,
        credentials: activeCredentials,
        to,
        subject,
        html,
        text,
      });
    } else if (mailbox.provider === "smtp") {
      sendResult = await sendViaSmtp({
        mailbox,
        credentials: activeCredentials,
        to,
        subject,
        html,
        text,
      });
    } else {
      throw new ApiError(400, `Unsupported mailbox provider: ${mailbox.provider}`);
    }

    // Success bookkeeping
    await mailbox.recordSendSuccess();

    // Update Email record if provided
    let updatedEmail: any = null;
    if (emailId) {
      updatedEmail = await Email.findById(emailId);
      if (updatedEmail) {
        updatedEmail.sendStatus = "sent";
        updatedEmail.sentAt = new Date();
        await updatedEmail.save();
      }
    }

    // Update Lead pipeline status if linked
    const targetLeadId = leadId || (updatedEmail ? updatedEmail.leadId : null);
    if (targetLeadId) {
      const lead = await Lead.findById(targetLeadId);
      if (lead) {
        if (lead.status === "new") {
          lead.status = "contacted";
        }
        lead.lastContactedAt = new Date();
        lead.lastActivityAt = new Date();
        await lead.save();
        await syncLeadStatsFromEmails(lead._id);

        await logActivity({
          userId: userId || mailbox.userId,
          workspaceId: workspaceId || mailbox.workspaceId,
          leadId: lead._id,
          type: "EMAIL_SENT",
          title: `Sent cold email via ${mailbox.email}`,
          metadata: {
            mailboxId: mailbox._id,
            provider: mailbox.provider,
            emailId: emailId || null,
            messageId: sendResult.messageId,
          },
        });
      }
    }

    return {
      success: true,
      messageId: sendResult.messageId,
      mailbox: {
        id: mailbox._id,
        email: mailbox.email,
        provider: mailbox.provider,
        sentToday: mailbox.sentToday,
        dailyLimit: mailbox.dailyLimit,
      },
    };
  } catch (error: any) {
    console.error(`Failed to send email via mailbox ${mailbox.email}:`, error);
    await mailbox.recordSendFailure(error.message);
    throw new ApiError(502, `Sending failed through mailbox: ${error.message}`);
  }
}
