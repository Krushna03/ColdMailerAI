import { Types } from "mongoose";
import {
  InboundEmail,
  IInboundEmailDocument,
  InboundSource,
  ReplyCategory,
} from "../models/InboundEmail.model.js";
import { Lead } from "../models/Lead.model.js";
import { Mailbox } from "../models/Mailbox.model.js";
import { SendJob } from "../models/SendJob.model.js";
import { EmailEvent } from "../models/EmailEvent.model.js";
import { SequenceEnrollment } from "../models/SequenceEnrollment.model.js";
import { Sequence } from "../models/Sequence.model.js";
import { SequenceStep } from "../models/SequenceStep.model.js";
import { recalculateSequenceStatsService } from "./sequence.service.js";
import { classifyEmailReplyService } from "./replyClassification.service.js";
import { checkAndStopLeadSequencesService } from "./sequenceExecution.service.js";
import { recordEmailEvent } from "./sendJob.service.js";
import { logActivity } from "./activity.service.js";
import { ApiError } from "../utils/ApiError.js";

export interface ProcessInboundEmailParams {
  from: { name?: string; email: string };
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
  headers?: Record<string, string>;
  mailboxId?: string | Types.ObjectId;
  workspaceId?: string | Types.ObjectId;
  userId?: string | Types.ObjectId;
  source?: InboundSource;
  receivedAt?: Date;
}

/**
 * Core Inbound Processing Pipeline:
 * Inbound Email ➔ Find Mailbox ➔ Find Lead ➔ Find Thread/Sequence ➔
 * Stop Cadence & Cancel Pending Jobs ➔ Update Lead ➔ AI Classification ➔ Log Activity & EmailEvent
 */
export async function processInboundEmailService(
  params: ProcessInboundEmailParams
): Promise<{
  inboundEmail: IInboundEmailDocument;
  lead: any;
  sequenceStopped: boolean;
  classification: any;
}> {
  const fromEmail = (params.from.email || "").trim().toLowerCase();
  const toEmail = (params.to || "").trim().toLowerCase();
  const subject = (params.subject || "").trim();
  const bodyText = params.bodyText || "";
  const bodyHtml = params.bodyHtml || `<p>${bodyText.replace(/\n/g, "<br/>")}</p>`;
  const messageId =
    params.messageId || `<inbound-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@coldmailer.ai>`;
  const inReplyTo = params.inReplyTo || null;
  const references = params.references || [];
  const source = params.source || "webhook";
  const receivedAt = params.receivedAt || new Date();

  // 1. Check for Duplicate Inbound Message (Idempotency)
  const existingInbound = await InboundEmail.findOne({ messageId });
  if (existingInbound) {
    const lead = await Lead.findById(existingInbound.leadId);
    return {
      inboundEmail: existingInbound,
      lead,
      sequenceStopped: false,
      classification: existingInbound.classification,
    };
  }

  // 2. Resolve Mailbox Context
  let mailbox = null;
  if (params.mailboxId) {
    mailbox = await Mailbox.findById(params.mailboxId);
  }
  if (!mailbox && toEmail) {
    mailbox = await Mailbox.findOne({ email: toEmail });
  }
  if (!mailbox && params.workspaceId) {
    mailbox = await Mailbox.findOne({
      workspaceId: new Types.ObjectId(String(params.workspaceId)),
      status: "active",
    });
  }

  const workspaceId =
    mailbox?.workspaceId ||
    (params.workspaceId ? new Types.ObjectId(String(params.workspaceId)) : null);

  const userId =
    mailbox?.userId ||
    (params.userId ? new Types.ObjectId(String(params.userId)) : null);

  if (!workspaceId || !userId) {
    throw new ApiError(
      400,
      `Cannot resolve active workspace for inbound email sent to ${toEmail}`
    );
  }

  // 3. Find or Create Matching Lead
  let lead = await Lead.findOne({
    email: fromEmail,
    workspaceId,
  });

  if (!lead) {
    // Check if lead exists across another workspace owned by the same user
    lead = await Lead.findOne({ email: fromEmail, userId });
  }

  if (!lead) {
    // If prospect is not in CRM, create an inbound lead stub so no reply is lost
    const nameParts = (params.from.name || fromEmail.split("@")[0]).trim().split(/\s+/);
    lead = await Lead.create({
      name: params.from.name || fromEmail.split("@")[0],
      email: fromEmail,
      company: { name: fromEmail.split("@")[1]?.split(".")[0] || "Unknown" },
      status: "replied",
      source: "inbound_reply",
      userId,
      workspaceId,
      repliesCount: 1,
      lastRepliedAt: receivedAt,
      lastActivityAt: receivedAt,
    });
  }

  // 4. Trace Conversation / Outbound Sequence Context
  let matchedSequenceId: Types.ObjectId | null = null;
  let matchedStepId: Types.ObjectId | null = null;
  let matchedEnrollmentId: Types.ObjectId | null = null;
  let matchedEmailId: Types.ObjectId | null = null;
  let matchedSendJobId: Types.ObjectId | null = null;
  let outboundSubject = "";
  let outboundBody = "";

  // Check matching by inReplyTo or references in SendJob & EmailEvent
  const candidateMessageIds = [inReplyTo, ...references].filter(Boolean);

  if (candidateMessageIds.length > 0) {
    const matchedJob = await SendJob.findOne({
      $or: [
        { "providerResponse.messageId": { $in: candidateMessageIds } },
        { "messagePayload.to": fromEmail },
      ],
      workspaceId,
    }).sort({ createdAt: -1 });

    if (matchedJob) {
      matchedSequenceId = matchedJob.sequenceId;
      matchedStepId = matchedJob.stepId;
      matchedEnrollmentId = matchedJob.enrollmentId;
      matchedEmailId = matchedJob.emailId || null;
      matchedSendJobId = matchedJob._id;
      outboundSubject = matchedJob.messagePayload.subject;
      outboundBody = matchedJob.messagePayload.text;
    }
  }

  // Fallback: Check active sequence enrollment for lead
  if (!matchedEnrollmentId) {
    const activeEnrollment = await SequenceEnrollment.findOne({
      leadId: lead._id,
      status: "active",
    }).sort({ createdAt: -1 });

    if (activeEnrollment) {
      matchedSequenceId = activeEnrollment.sequenceId;
      matchedEnrollmentId = activeEnrollment._id;
      matchedStepId = activeEnrollment.currentStepId || null;
    }
  }

  // 5. Automatically Halt Sequences and Pending Jobs (Core Requirement)
  let sequenceStopped = false;
  if (lead._id) {
    await checkAndStopLeadSequencesService(lead._id, "replied", "replied");
    sequenceStopped = true;
  }

  // 6. Update Lead Record Stats
  lead.status = "replied";
  lead.repliesCount = (lead.repliesCount || 0) + 1;
  lead.lastRepliedAt = receivedAt;
  lead.lastActivityAt = receivedAt;
  await lead.save();

  // 7. AI Reply Classification
  const classification = await classifyEmailReplyService({
    subject,
    body: bodyText,
    fromEmail,
    outboundSubject,
    outboundBody,
  });

  // Action based on classification
  if (classification.category === "meeting_request") {
    lead.status = "meeting";
    await lead.save();
  } else if (classification.category === "unsubscribe") {
    if (!lead.tags) lead.tags = [];
    if (!lead.tags.includes("unsubscribed")) {
      lead.tags.push("unsubscribed");
      await lead.save();
    }
  }

  // 8. Create InboundEmail Record
  const inboundEmail = await InboundEmail.create({
    workspaceId,
    userId,
    mailboxId: mailbox ? mailbox._id : null,
    leadId: lead._id,
    sequenceId: matchedSequenceId,
    enrollmentId: matchedEnrollmentId,
    emailId: matchedEmailId,
    sendJobId: matchedSendJobId,
    messageId,
    inReplyTo,
    references,
    from: {
      name: params.from.name || "",
      email: fromEmail,
    },
    to: toEmail,
    subject,
    bodyText,
    bodyHtml,
    headers: params.headers || {},
    classification,
    isRead: false,
    source,
    receivedAt,
  });

  // 9. Log Activity Audit
  const senderName = params.from.name || lead.name || fromEmail;
  await logActivity({
    workspaceId,
    userId,
    leadId: lead._id,
    type: "REPLY_RECEIVED",
    title: `Lead ${senderName} replied: "${subject || "Follow-up"}" [${classification.category.toUpperCase()}]`,
    metadata: {
      inboundEmailId: inboundEmail._id,
      fromEmail,
      classification: classification.category,
      sentiment: classification.sentiment,
      summary: classification.summary,
      suggestedAction: classification.suggestedAction,
    },
  });

  // 10. Record EmailEvent
  await recordEmailEvent({
    workspaceId,
    userId,
    type: "replied",
    leadId: lead._id,
    mailboxId: mailbox ? mailbox._id : null,
    sequenceId: matchedSequenceId,
    stepId: matchedStepId,
    enrollmentId: matchedEnrollmentId,
    sendJobId: matchedSendJobId,
    messageId,
    metadata: {
      inboundEmailId: inboundEmail._id,
      category: classification.category,
      confidence: classification.confidence,
    },
  });

  // 11. Increment Step and Sequence Reply Metrics
  if (matchedStepId) {
    await SequenceStep.findByIdAndUpdate(matchedStepId, {
      $inc: { "stats.repliedCount": 1 },
    });
  }

  if (matchedSequenceId) {
    await recalculateSequenceStatsService(matchedSequenceId);
  }

  return {
    inboundEmail,
    lead,
    sequenceStopped,
    classification,
  };
}

/**
 * List Inbound Emails with filtering, search, and pagination
 */
export async function listInboundEmailsService({
  workspaceId,
  leadId,
  sequenceId,
  mailboxId,
  category,
  isRead,
  search,
  page = 1,
  limit = 20,
}: {
  workspaceId: string | Types.ObjectId;
  leadId?: string;
  sequenceId?: string;
  mailboxId?: string;
  category?: string;
  isRead?: boolean | string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const query: any = {
    workspaceId: new Types.ObjectId(String(workspaceId)),
  };

  if (leadId) query.leadId = new Types.ObjectId(String(leadId));
  if (sequenceId) query.sequenceId = new Types.ObjectId(String(sequenceId));
  if (mailboxId) query.mailboxId = new Types.ObjectId(String(mailboxId));
  if (category && category !== "all") query["classification.category"] = category;
  if (isRead !== undefined && isRead !== "all") {
    query.isRead = isRead === true || isRead === "true";
  }

  if (search && search.trim()) {
    const term = search.trim();
    query.$or = [
      { subject: { $regex: term, $options: "i" } },
      { bodyText: { $regex: term, $options: "i" } },
      { "from.email": { $regex: term, $options: "i" } },
      { "from.name": { $regex: term, $options: "i" } },
    ];
  }

  const p = Math.max(1, Number(page));
  const l = Math.max(1, Math.min(100, Number(limit)));
  const skip = (p - 1) * l;

  const [inboundEmails, total] = await Promise.all([
    InboundEmail.find(query)
      .populate("leadId", "name email company jobTitle status tags")
      .populate("mailboxId", "email provider name health")
      .populate("sequenceId", "name status")
      .sort({ receivedAt: -1 })
      .skip(skip)
      .limit(l),
    InboundEmail.countDocuments(query),
  ]);

  return {
    inboundEmails,
    pagination: {
      page: p,
      limit: l,
      total,
      pages: Math.ceil(total / l) || 1,
    },
  };
}

/**
 * Get single inbound email with populated details
 */
export async function getInboundEmailByIdService(
  id: string | Types.ObjectId,
  workspaceId: string | Types.ObjectId
) {
  const inboundEmail = await InboundEmail.findOne({
    _id: new Types.ObjectId(String(id)),
    workspaceId: new Types.ObjectId(String(workspaceId)),
  })
    .populate("leadId", "name email company jobTitle status phone tags linkedinUrl")
    .populate("mailboxId", "email provider name")
    .populate("sequenceId", "name status")
    .populate("enrollmentId", "status currentStepOrder stepHistory");

  if (!inboundEmail) {
    throw new ApiError(404, "Inbound email not found");
  }

  return inboundEmail;
}

/**
 * Mark Inbound Email as read or unread
 */
export async function markInboundEmailReadService(
  id: string | Types.ObjectId,
  workspaceId: string | Types.ObjectId,
  isRead: boolean = true
) {
  const email = await InboundEmail.findOneAndUpdate(
    {
      _id: new Types.ObjectId(String(id)),
      workspaceId: new Types.ObjectId(String(workspaceId)),
    },
    { $set: { isRead } },
    { new: true }
  );

  if (!email) {
    throw new ApiError(404, "Inbound email not found");
  }

  return email;
}

/**
 * Re-trigger AI classification on an existing reply
 */
export async function reclassifyInboundEmailService(
  id: string | Types.ObjectId,
  workspaceId: string | Types.ObjectId
) {
  const email = await InboundEmail.findOne({
    _id: new Types.ObjectId(String(id)),
    workspaceId: new Types.ObjectId(String(workspaceId)),
  });

  if (!email) {
    throw new ApiError(404, "Inbound email not found");
  }

  const classification = await classifyEmailReplyService({
    subject: email.subject,
    body: email.bodyText,
    fromEmail: email.from.email,
  });

  email.classification = classification;
  await email.save();

  return email;
}

/**
 * Get aggregate reply detection metrics
 */
export async function getInboundStatsService(workspaceId: string | Types.ObjectId) {
  const wsId = new Types.ObjectId(String(workspaceId));

  const [categoryStats, unreadCount, total] = await Promise.all([
    InboundEmail.aggregate([
      { $match: { workspaceId: wsId } },
      { $group: { _id: "$classification.category", count: { $sum: 1 } } },
    ]),
    InboundEmail.countDocuments({ workspaceId: wsId, isRead: false }),
    InboundEmail.countDocuments({ workspaceId: wsId }),
  ]);

  const categories: Record<string, number> = {
    interested: 0,
    meeting_request: 0,
    objection: 0,
    out_of_office: 0,
    wrong_person: 0,
    not_interested: 0,
    unsubscribe: 0,
    neutral: 0,
    unknown: 0,
  };

  for (const s of categoryStats) {
    if (s._id) {
      categories[s._id] = s.count;
    }
  }

  return {
    total,
    unreadCount,
    categories,
    interestedTotal: categories.interested + categories.meeting_request,
  };
}
