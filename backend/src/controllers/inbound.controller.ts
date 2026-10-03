import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import {
  processInboundEmailService,
  listInboundEmailsService,
  getInboundEmailByIdService,
  markInboundEmailReadService,
  reclassifyInboundEmailService,
  getInboundStatsService,
} from "../services/inboundEmail.service.js";
import {
  syncMailboxRepliesService,
  syncAllActiveMailboxesService,
} from "../services/mailboxInboundSync.service.js";
import { Mailbox } from "../models/Mailbox.model.js";
import { Lead } from "../models/Lead.model.js";

/**
 * Universal Inbound Webhook Parser:
 * Supports SendGrid Inbound Parse, Mailgun MIME, Postmark Inbound, and standard JSON webhooks.
 */
function parseWebhookPayload(body: any, headers: any = {}) {
  let fromEmail = "";
  let fromName = "";
  let toEmail = "";
  let subject = "";
  let bodyText = "";
  let bodyHtml = "";
  let messageId = "";
  let inReplyTo = "";
  let references: string[] = [];

  // 1. Standard JSON payload
  if (body.from) {
    if (typeof body.from === "object") {
      fromEmail = body.from.email || "";
      fromName = body.from.name || "";
    } else if (typeof body.from === "string") {
      const match = body.from.match(/(.*)<(.+@.+)>/);
      if (match) {
        fromName = match[1].trim().replace(/^["']|["']$/g, "");
        fromEmail = match[2].trim();
      } else {
        fromEmail = body.from.trim();
      }
    }
  }

  // SendGrid / Mailgun field formats
  if (!fromEmail && body.sender) fromEmail = body.sender;
  if (!fromEmail && body["from"]) fromEmail = body["from"];
  if (!toEmail && body.to) {
    toEmail = typeof body.to === "string" ? body.to : (body.to.email || body.to[0]?.email || "");
  }
  if (!toEmail && body.recipient) toEmail = body.recipient;

  subject = body.subject || "(No Subject)";
  bodyText = body.text || body.body || body["body-plain"] || body.stripped_text || "";
  bodyHtml = body.html || body["body-html"] || body.stripped_html || "";

  messageId =
    body.messageId ||
    body["Message-Id"] ||
    body["Message-ID"] ||
    body["message-id"] ||
    body.headers?.["Message-ID"] ||
    body.headers?.["message-id"] ||
    `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  inReplyTo =
    body.inReplyTo ||
    body["In-Reply-To"] ||
    body["in-reply-to"] ||
    body.headers?.["In-Reply-To"] ||
    body.headers?.["in-reply-to"] ||
    "";

  const rawRefs =
    body.references ||
    body["References"] ||
    body["references"] ||
    body.headers?.["References"] ||
    body.headers?.["references"];

  if (Array.isArray(rawRefs)) {
    references = rawRefs;
  } else if (typeof rawRefs === "string") {
    references = rawRefs.split(/\s+/).filter(Boolean);
  }

  return {
    from: { name: fromName, email: fromEmail },
    to: toEmail,
    subject,
    bodyText,
    bodyHtml,
    messageId,
    inReplyTo,
    references,
  };
}

/**
 * Public Webhook Handler: POST /api/v1/inbound/webhook
 */
export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const parsed = parseWebhookPayload(req.body, req.headers);

  if (!parsed.from.email) {
    throw new ApiError(400, "Missing sender email address in webhook payload");
  }

  const result = await processInboundEmailService({
    from: parsed.from,
    to: parsed.to,
    subject: parsed.subject,
    bodyText: parsed.bodyText,
    bodyHtml: parsed.bodyHtml,
    messageId: parsed.messageId,
    inReplyTo: parsed.inReplyTo,
    references: parsed.references,
    source: "webhook",
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        inboundEmailId: result.inboundEmail._id,
        leadId: result.lead._id,
        classification: result.classification,
        sequenceStopped: result.sequenceStopped,
      },
      "Inbound email processed successfully"
    )
  );
});

/**
 * Mailbox-scoped Webhook Handler: POST /api/v1/inbound/webhook/:mailboxId
 */
export const handleMailboxWebhook = asyncHandler(async (req: Request, res: Response) => {
  const mailboxId = String(req.params.mailboxId);
  const mailbox = await Mailbox.findById(mailboxId);
  if (!mailbox) {
    throw new ApiError(404, "Target mailbox not found");
  }

  const parsed = parseWebhookPayload(req.body, req.headers);
  if (!parsed.to) {
    parsed.to = mailbox.email;
  }

  const result = await processInboundEmailService({
    mailboxId: mailbox._id,
    workspaceId: mailbox.workspaceId,
    userId: mailbox.userId,
    from: parsed.from,
    to: parsed.to,
    subject: parsed.subject,
    bodyText: parsed.bodyText,
    bodyHtml: parsed.bodyHtml,
    messageId: parsed.messageId,
    inReplyTo: parsed.inReplyTo,
    references: parsed.references,
    source: "webhook",
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        inboundEmailId: result.inboundEmail._id,
        leadId: result.lead._id,
        classification: result.classification,
        sequenceStopped: result.sequenceStopped,
      },
      "Mailbox inbound email processed successfully"
    )
  );
});

/**
 * Authenticated Simulation Handler for Testing & UI: POST /api/v1/inbound/simulate
 */
export const simulateReply = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  const userId = req.user?._id;

  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context required");
  }

  const {
    leadId,
    mailboxId,
    fromEmail,
    fromName,
    subject,
    bodyText,
    inReplyTo,
  } = req.body;

  let resolvedFromEmail = fromEmail;
  let resolvedFromName = fromName;

  if (leadId) {
    const lead = await Lead.findOne({ _id: leadId, workspaceId });
    if (lead) {
      resolvedFromEmail = lead.email;
      resolvedFromName = lead.name;
    }
  }

  if (!resolvedFromEmail) {
    throw new ApiError(400, "Must provide leadId or valid fromEmail address");
  }

  let resolvedMailbox = null;
  if (mailboxId) {
    resolvedMailbox = await Mailbox.findById(mailboxId);
  } else {
    resolvedMailbox = await Mailbox.findOne({ workspaceId, status: "active" });
  }

  const result = await processInboundEmailService({
    workspaceId,
    userId,
    mailboxId: resolvedMailbox ? resolvedMailbox._id : undefined,
    from: { name: resolvedFromName || "", email: resolvedFromEmail },
    to: resolvedMailbox ? resolvedMailbox.email : `inbound@coldmailer.ai`,
    subject: subject || "Re: Following up",
    bodyText: bodyText || "Thanks for reaching out! Let's schedule a demo next Tuesday.",
    inReplyTo: inReplyTo || undefined,
    source: "simulation",
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        inboundEmail: result.inboundEmail,
        lead: result.lead,
        sequenceStopped: result.sequenceStopped,
        classification: result.classification,
      },
      "Inbound reply simulated and processed successfully"
    )
  );
});

/**
 * List Inbound Emails: GET /api/v1/inbound
 */
export const listInboundEmails = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context required");
  }

  const {
    leadId,
    sequenceId,
    mailboxId,
    category,
    isRead,
    search,
    page = "1",
    limit = "20",
  } = req.query;

  const result = await listInboundEmailsService({
    workspaceId,
    leadId: typeof leadId === "string" ? leadId : undefined,
    sequenceId: typeof sequenceId === "string" ? sequenceId : undefined,
    mailboxId: typeof mailboxId === "string" ? mailboxId : undefined,
    category: typeof category === "string" ? category : undefined,
    isRead: isRead !== undefined ? String(isRead) : undefined,
    search: typeof search === "string" ? search : undefined,
    page: Number(page),
    limit: Number(limit),
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Inbound emails retrieved successfully")
  );
});

/**
 * Get Inbound Email: GET /api/v1/inbound/:id
 */
export const getInboundEmail = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  const id = String(req.params.id);

  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context required");
  }

  const inboundEmail = await getInboundEmailByIdService(id, workspaceId);
  return res.status(200).json(
    new ApiResponse(200, inboundEmail, "Inbound email details retrieved")
  );
});

/**
 * Mark as Read: PATCH /api/v1/inbound/:id/read
 */
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  const id = String(req.params.id);
  const isRead = req.body.isRead !== false; // defaults to true

  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context required");
  }

  const updated = await markInboundEmailReadService(id, workspaceId, isRead);
  return res.status(200).json(
    new ApiResponse(200, updated, `Email marked as ${isRead ? "read" : "unread"}`)
  );
});

/**
 * Reclassify Reply: POST /api/v1/inbound/:id/classify
 */
export const reclassifyReply = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  const id = String(req.params.id);

  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context required");
  }

  const reclassified = await reclassifyInboundEmailService(id, workspaceId);
  return res.status(200).json(
    new ApiResponse(200, reclassified, "Email re-classified with AI successfully")
  );
});

/**
 * Get Reply Stats: GET /api/v1/inbound/stats
 */
export const getInboundStats = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context required");
  }

  const stats = await getInboundStatsService(workspaceId);
  return res.status(200).json(
    new ApiResponse(200, stats, "Inbound reply metrics retrieved successfully")
  );
});

/**
 * On-demand Single Mailbox Sync: POST /api/v1/inbound/sync/:mailboxId
 */
export const syncMailboxReplies = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  const mailboxId = String(req.params.mailboxId);

  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context required");
  }

  const mailbox = await Mailbox.findOne({
    _id: mailboxId,
    workspaceId,
  });

  if (!mailbox) {
    throw new ApiError(404, "Mailbox not found");
  }

  const result = await syncMailboxRepliesService(mailbox._id);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        mailboxId: mailbox._id,
        email: mailbox.email,
        syncedAt: new Date(),
        newRepliesFound: result.newRepliesCount,
        success: result.success,
        requiresReauth: result.requiresReauth || false,
        error: result.error,
      },
      result.requiresReauth
        ? `Mailbox requires re-connection to grant Gmail read permissions`
        : `Inbox sync cycle completed: ${result.newRepliesCount} new reply(ies) imported`
    )
  );
});

/**
 * On-demand All Mailboxes Sync for Workspace: POST /api/v1/inbound/sync
 */
export const syncAllWorkspaceMailboxes = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context required");
  }

  const summary = await syncAllActiveMailboxesService(workspaceId);

  return res.status(200).json(
    new ApiResponse(
      200,
      summary,
      `Workspace inbox sync completed: ${summary.newRepliesCount} new reply(ies) found across ${summary.syncedCount} mailbox(es)`
    )
  );
});
