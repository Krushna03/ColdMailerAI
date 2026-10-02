import { Types } from "mongoose";
import { SendJob, ISendJob, ISendJobDocument, SendJobStatus } from "../models/SendJob.model.js";
import { EmailEvent, EmailEventType } from "../models/EmailEvent.model.js";
import { Sequence } from "../models/Sequence.model.js";
import { SequenceStep } from "../models/SequenceStep.model.js";
import { SequenceEnrollment } from "../models/SequenceEnrollment.model.js";
import { Lead } from "../models/Lead.model.js";
import { Mailbox } from "../models/Mailbox.model.js";
import { Email } from "../models/Email.model.js";
import { sendEmailViaMailbox } from "./mailboxSender.service.js";
import { recalculateSequenceStatsService } from "./sequence.service.js";
import { ApiError } from "../utils/ApiError.js";

const DEFAULT_WORKER_ID = `worker-${process.pid}-${Math.random().toString(36).substring(2, 7)}`;

export interface CreateSendJobParams {
  workspaceId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  sequenceId: string | Types.ObjectId;
  stepId: string | Types.ObjectId;
  stepOrder: number;
  enrollmentId: string | Types.ObjectId;
  leadId: string | Types.ObjectId;
  mailboxId: string | Types.ObjectId;
  emailId?: string | Types.ObjectId | null;
  scheduledFor?: Date;
  priority?: number;
  messagePayload: {
    to: string;
    subject: string;
    html: string;
    text: string;
    replyTo?: string;
    headers?: Record<string, string>;
  };
  maxAttempts?: number;
}

/**
 * Record an audit lifecycle event in EmailEvent
 */
export async function recordEmailEvent({
  workspaceId,
  userId,
  type,
  leadId,
  sendJobId,
  sequenceId,
  stepId,
  stepOrder,
  enrollmentId,
  mailboxId,
  emailId,
  messageId,
  metadata = {},
}: {
  workspaceId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  type: EmailEventType;
  leadId: string | Types.ObjectId;
  sendJobId?: string | Types.ObjectId | null;
  sequenceId?: string | Types.ObjectId | null;
  stepId?: string | Types.ObjectId | null;
  stepOrder?: number | null;
  enrollmentId?: string | Types.ObjectId | null;
  mailboxId?: string | Types.ObjectId | null;
  emailId?: string | Types.ObjectId | null;
  messageId?: string | null;
  metadata?: Record<string, any>;
}) {
  try {
    return await EmailEvent.create({
      workspaceId: new Types.ObjectId(String(workspaceId)),
      userId: new Types.ObjectId(String(userId)),
      type,
      leadId: new Types.ObjectId(String(leadId)),
      sendJobId: sendJobId ? new Types.ObjectId(String(sendJobId)) : null,
      sequenceId: sequenceId ? new Types.ObjectId(String(sequenceId)) : null,
      stepId: stepId ? new Types.ObjectId(String(stepId)) : null,
      stepOrder: stepOrder ?? null,
      enrollmentId: enrollmentId ? new Types.ObjectId(String(enrollmentId)) : null,
      mailboxId: mailboxId ? new Types.ObjectId(String(mailboxId)) : null,
      emailId: emailId ? new Types.ObjectId(String(emailId)) : null,
      messageId: messageId || null,
      metadata,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("[EmailEvent] Failed to record event:", err);
    return null;
  }
}

/**
 * Enqueue an email to be sent asynchronously by the sending engine worker.
 * Idempotent: guarantees no duplicate jobs exist for (sequenceId, enrollmentId, stepOrder).
 */
export async function createSendJob(params: CreateSendJobParams): Promise<ISendJobDocument> {
  const sequenceId = new Types.ObjectId(String(params.sequenceId));
  const enrollmentId = new Types.ObjectId(String(params.enrollmentId));
  const stepId = new Types.ObjectId(String(params.stepId));
  const leadId = new Types.ObjectId(String(params.leadId));
  const mailboxId = new Types.ObjectId(String(params.mailboxId));
  const workspaceId = new Types.ObjectId(String(params.workspaceId));
  const userId = new Types.ObjectId(String(params.userId));
  const emailId = params.emailId ? new Types.ObjectId(String(params.emailId)) : null;

  const idempotencyKey = `seq_${sequenceId}_enr_${enrollmentId}_step_${params.stepOrder}`;

  // Check if job already exists
  const existing = await SendJob.findOne({ idempotencyKey });
  if (existing) {
    return existing;
  }

  const now = new Date();
  const scheduledFor = params.scheduledFor || now;
  const isReadyNow = scheduledFor.getTime() <= now.getTime();
  const initialStatus: SendJobStatus = isReadyNow ? "queued" : "scheduled";

  const job = await SendJob.create({
    workspaceId,
    userId,
    sequenceId,
    stepId,
    stepOrder: params.stepOrder,
    enrollmentId,
    leadId,
    mailboxId,
    emailId,
    status: initialStatus,
    priority: params.priority || 5,
    scheduledFor,
    queuedAt: isReadyNow ? now : null,
    attempts: 0,
    maxAttempts: params.maxAttempts || 3,
    errorHistory: [],
    messagePayload: params.messagePayload,
    idempotencyKey,
  });

  await recordEmailEvent({
    workspaceId,
    userId,
    type: initialStatus,
    leadId,
    sendJobId: job._id,
    sequenceId,
    stepId,
    stepOrder: params.stepOrder,
    enrollmentId,
    mailboxId,
    emailId,
    metadata: { scheduledFor },
  });

  return job;
}

/**
 * Atomically claim due SendJobs from the queue using distributed locking.
 */
export async function claimNextSendJobs(
  batchSize: number = 10,
  workerId: string = DEFAULT_WORKER_ID
): Promise<ISendJobDocument[]> {
  const now = new Date();
  const claimedJobs: ISendJobDocument[] = [];

  for (let i = 0; i < batchSize; i++) {
    // Atomically find and lock one candidate job
    const job = await SendJob.findOneAndUpdate(
      {
        $or: [
          // Ready queued jobs
          { status: "queued", lockedAt: null },
          // Scheduled jobs whose scheduled timestamp has arrived
          { status: "scheduled", scheduledFor: { $lte: now }, lockedAt: null },
          // Failed jobs whose backoff delay has expired
          { status: "retry", nextAttemptAt: { $lte: now }, lockedAt: null },
        ],
      },
      {
        $set: {
          status: "sending",
          lockedAt: now,
          lockedBy: workerId,
          startedAt: now,
        },
        $inc: { attempts: 1 },
      },
      {
        new: true,
        sort: { priority: 1, scheduledFor: 1, createdAt: 1 },
      }
    );

    if (!job) {
      // No more jobs currently ready
      break;
    }

    await recordEmailEvent({
      workspaceId: job.workspaceId,
      userId: job.userId,
      type: "sending",
      leadId: job.leadId,
      sendJobId: job._id,
      sequenceId: job.sequenceId,
      stepId: job.stepId,
      stepOrder: job.stepOrder,
      enrollmentId: job.enrollmentId,
      mailboxId: job.mailboxId,
      emailId: job.emailId,
      metadata: { attempt: job.attempts, workerId },
    });

    claimedJobs.push(job);
  }

  return claimedJobs;
}

/**
 * Process a claimed SendJob through the Mailbox Provider, handling provider
 * responses, rate limits, bounces, exponential backoff retries, and state transitions.
 */
export async function processSendJob(job: ISendJobDocument): Promise<{
  success: boolean;
  status: SendJobStatus;
  messageId?: string;
  error?: string;
}> {
  let mailbox = await Mailbox.findById(job.mailboxId);
  if (!mailbox || mailbox.status !== "active") {
    // If assigned mailbox was deleted or is not active, fallback to an active mailbox in the workspace
    const activeMailbox = await Mailbox.findOne({
      workspaceId: job.workspaceId,
      status: "active",
    }).sort({ isDefault: -1, createdAt: 1 });

    if (activeMailbox) {
      job.mailboxId = activeMailbox._id;
      mailbox = activeMailbox;
      await job.save();
    } else if (!mailbox) {
      return handleSendJobFailure(job, "Mailbox configuration not found", "MAILBOX_NOT_FOUND");
    }
  }

  // Verify mailbox health & daily quota
  const sendCheck = mailbox.canSend();
  if (!sendCheck.allowed) {
    const isLimit = sendCheck.reason?.includes("Daily sending limit");
    if (isLimit) {
      // Defer job until next day quota reset without burning an attempt
      const tomorrow = new Date();
      tomorrow.setUTCHours(24, 0, 0, 0); // Next UTC midnight
      job.status = "scheduled";
      job.scheduledFor = tomorrow;
      job.lockedAt = null;
      job.lockedBy = null;
      job.lastError = "Mailbox daily limit reached. Postponed to next send window.";
      await job.save();

      await recordEmailEvent({
        workspaceId: job.workspaceId,
        userId: job.userId,
        type: "scheduled",
        leadId: job.leadId,
        sendJobId: job._id,
        sequenceId: job.sequenceId,
        stepId: job.stepId,
        stepOrder: job.stepOrder,
        enrollmentId: job.enrollmentId,
        mailboxId: job.mailboxId,
        metadata: { reason: "DAILY_LIMIT_EXCEEDED", rescheduledFor: tomorrow },
      });

      return { success: false, status: "scheduled", error: job.lastError };
    }
  }

  try {
    // Dispatch through the mailbox provider
    const sendResult = await sendEmailViaMailbox({
      mailboxId: mailbox._id,
      to: job.messagePayload.to,
      subject: job.messagePayload.subject,
      html: job.messagePayload.html,
      text: job.messagePayload.text,
      leadId: job.leadId,
      emailId: job.emailId,
      userId: job.userId,
      workspaceId: job.workspaceId,
    });

    const messageId = sendResult?.messageId || `msg_${Date.now()}`;

    // Success State Transitions: sending -> sent -> delivered
    job.status = "sent";
    job.completedAt = new Date();
    job.lockedAt = null;
    job.lockedBy = null;
    job.providerResponse = {
      provider: mailbox.provider,
      messageId,
      sentAt: new Date(),
    };
    await job.save();

    await recordEmailEvent({
      workspaceId: job.workspaceId,
      userId: job.userId,
      type: "sent",
      leadId: job.leadId,
      sendJobId: job._id,
      sequenceId: job.sequenceId,
      stepId: job.stepId,
      stepOrder: job.stepOrder,
      enrollmentId: job.enrollmentId,
      mailboxId: job.mailboxId,
      emailId: job.emailId,
      messageId,
      metadata: { provider: mailbox.provider },
    });

    // Mark delivered
    await recordEmailEvent({
      workspaceId: job.workspaceId,
      userId: job.userId,
      type: "delivered",
      leadId: job.leadId,
      sendJobId: job._id,
      sequenceId: job.sequenceId,
      stepId: job.stepId,
      stepOrder: job.stepOrder,
      enrollmentId: job.enrollmentId,
      mailboxId: job.mailboxId,
      emailId: job.emailId,
      messageId,
    });

    // Update sequence step stats
    const step = await SequenceStep.findById(job.stepId);
    if (step) {
      step.stats.sentCount = (step.stats.sentCount || 0) + 1;
      step.stats.deliveredCount = (step.stats.deliveredCount || 0) + 1;
      await step.save();
    }

    // Update lead contacted stats
    const lead = await Lead.findById(job.leadId);
    if (lead) {
      if (lead.status === "new") {
        lead.status = "contacted";
      }
      lead.emailsSentCount = (lead.emailsSentCount || 0) + 1;
      lead.lastContactedAt = new Date();
      await lead.save();
    }

    // Advance sequence enrollment to next step
    await advanceEnrollmentAfterSend(job, step);

    return { success: true, status: "sent", messageId };
  } catch (err: any) {
    const errorMsg = err.message || "Failed to send email via mailbox";
    return handleSendJobFailure(job, errorMsg, err.code || "SEND_ERROR");
  }
}

/**
 * Handle failures according to the State Machine:
 * sending -> failed -> retry (with exponential backoff) -> dead-letter (or bounced)
 */
async function handleSendJobFailure(
  job: ISendJobDocument,
  errorMessage: string,
  errorCode?: string
): Promise<{ success: boolean; status: SendJobStatus; error: string }> {
  job.lastError = errorMessage;
  job.errorHistory.push({
    attempt: job.attempts,
    error: errorMessage,
    code: errorCode,
    timestamp: new Date(),
  });

  const isBounced =
    /bounce|550|mailbox not found|recipient rejected|invalid address|user unknown/i.test(errorMessage);

  if (isBounced) {
    job.status = "bounced";
    job.failedAt = new Date();
    job.lockedAt = null;
    job.lockedBy = null;
    await job.save();

    await recordEmailEvent({
      workspaceId: job.workspaceId,
      userId: job.userId,
      type: "bounced",
      leadId: job.leadId,
      sendJobId: job._id,
      sequenceId: job.sequenceId,
      stepId: job.stepId,
      stepOrder: job.stepOrder,
      enrollmentId: job.enrollmentId,
      mailboxId: job.mailboxId,
      metadata: { error: errorMessage, attempt: job.attempts },
    });

    // Update lead status to bounced
    await Lead.findByIdAndUpdate(job.leadId, { status: "bounced" });

    // Stop sequence enrollment
    await SequenceEnrollment.findByIdAndUpdate(job.enrollmentId, {
      status: "stopped",
      stopReason: "bounced",
    });

    // Increment step failure count
    await SequenceStep.findByIdAndUpdate(job.stepId, {
      $inc: { "stats.failedCount": 1 },
    });

    return { success: false, status: "bounced", error: errorMessage };
  }

  // Retry or Dead-letter
  if (job.attempts < job.maxAttempts) {
    // Exponential backoff: 30s * 2^(attempt - 1), capped at 1 hour
    const backoffMs = Math.min(30_000 * Math.pow(2, job.attempts - 1), 60 * 60 * 1000);
    const nextAttemptAt = new Date(Date.now() + backoffMs);

    job.status = "retry";
    job.nextAttemptAt = nextAttemptAt;
    job.lockedAt = null;
    job.lockedBy = null;
    await job.save();

    await recordEmailEvent({
      workspaceId: job.workspaceId,
      userId: job.userId,
      type: "retry",
      leadId: job.leadId,
      sendJobId: job._id,
      sequenceId: job.sequenceId,
      stepId: job.stepId,
      stepOrder: job.stepOrder,
      enrollmentId: job.enrollmentId,
      mailboxId: job.mailboxId,
      metadata: { attempt: job.attempts, nextAttemptAt, error: errorMessage },
    });

    return { success: false, status: "retry", error: errorMessage };
  } else {
    // Max attempts exhausted: move to Dead Letter Queue
    job.status = "dead_letter";
    job.failedAt = new Date();
    job.lockedAt = null;
    job.lockedBy = null;
    await job.save();

    await recordEmailEvent({
      workspaceId: job.workspaceId,
      userId: job.userId,
      type: "failed",
      leadId: job.leadId,
      sendJobId: job._id,
      sequenceId: job.sequenceId,
      stepId: job.stepId,
      stepOrder: job.stepOrder,
      enrollmentId: job.enrollmentId,
      mailboxId: job.mailboxId,
      metadata: { finalAttempt: job.attempts, error: errorMessage },
    });

    // Increment step failure count
    await SequenceStep.findByIdAndUpdate(job.stepId, {
      $inc: { "stats.failedCount": 1 },
    });

    return { success: false, status: "dead_letter", error: errorMessage };
  }
}

/**
 * Advance enrollment to the subsequent step after email dispatch succeeds.
 */
async function advanceEnrollmentAfterSend(job: ISendJobDocument, step: any) {
  const enrollment = await SequenceEnrollment.findById(job.enrollmentId);
  if (!enrollment || enrollment.status !== "active") return;

  const sequence = await Sequence.findById(job.sequenceId);
  if (!sequence) return;

  // Append to enrollment step history
  enrollment.stepHistory.push({
    stepId: job.stepId,
    stepOrder: job.stepOrder,
    type: "email",
    executedAt: new Date(),
    status: "success",
    subject: job.messagePayload.subject,
    emailId: job.emailId ? new Types.ObjectId(String(job.emailId)) : null,
  });

  // Find next step in cadence
  const nextStep = await SequenceStep.findOne({
    sequenceId: sequence._id,
    order: { $gt: job.stepOrder },
  }).sort({ order: 1 });

  if (nextStep) {
    enrollment.currentStepOrder = nextStep.order;
    enrollment.currentStepId = nextStep._id;

    // Calculate next run date based on delay unit
    let delayMs = 0;
    if (nextStep.delay && nextStep.delay.value > 0) {
      const val = nextStep.delay.value;
      if (nextStep.delay.unit === "minutes") delayMs = val * 60 * 1000;
      else if (nextStep.delay.unit === "hours") delayMs = val * 60 * 60 * 1000;
      else delayMs = val * 24 * 60 * 60 * 1000; // days
    }

    enrollment.nextRunAt = new Date(Date.now() + delayMs);
  } else {
    // No more steps: mark enrollment completed
    enrollment.status = "completed";
    enrollment.nextRunAt = null;
  }

  await enrollment.save();
  await recalculateSequenceStatsService(sequence._id);
}

/**
 * Recovers orphaned jobs locked by a worker that crashed or timed out (> 5 min).
 */
export async function recoverStaleSendJobs(staleTimeoutMs: number = 5 * 60 * 1000): Promise<number> {
  const cutoff = new Date(Date.now() - staleTimeoutMs);

  const result = await SendJob.updateMany(
    {
      status: "sending",
      lockedAt: { $lt: cutoff },
    },
    {
      $set: {
        status: "retry",
        lockedAt: null,
        lockedBy: null,
        nextAttemptAt: new Date(),
        lastError: "Worker timeout. Recovered stale send job.",
      },
    }
  );

  return result.modifiedCount || 0;
}

/**
 * Drain the sending queue by claiming and processing a batch of jobs.
 */
export async function drainSendJobQueue(
  batchSize: number = 10,
  workerId: string = DEFAULT_WORKER_ID
): Promise<{
  processed: number;
  sent: number;
  retried: number;
  deadLettered: number;
  bounced: number;
}> {
  const jobs = await claimNextSendJobs(batchSize, workerId);
  const stats = { processed: 0, sent: 0, retried: 0, deadLettered: 0, bounced: 0 };

  for (const job of jobs) {
    stats.processed++;
    const res = await processSendJob(job);
    if (res.status === "sent") stats.sent++;
    else if (res.status === "retry") stats.retried++;
    else if (res.status === "dead_letter") stats.deadLettered++;
    else if (res.status === "bounced") stats.bounced++;
  }

  return stats;
}

/**
 * Cancel any pending or queued send jobs for a specific enrollment
 * (e.g. when lead replied, booked a meeting, or sequence stopped).
 */
export async function cancelPendingSendJobsForEnrollment(
  enrollmentId: string | Types.ObjectId,
  reason: string = "Cadence halted"
): Promise<number> {
  const enrId = new Types.ObjectId(String(enrollmentId));

  const pendingJobs = await SendJob.find({
    enrollmentId: enrId,
    status: { $in: ["scheduled", "queued", "retry"] },
  });

  if (pendingJobs.length === 0) return 0;

  await SendJob.updateMany(
    {
      enrollmentId: enrId,
      status: { $in: ["scheduled", "queued", "retry"] },
    },
    {
      $set: {
        status: "cancelled",
        lockedAt: null,
        lockedBy: null,
        lastError: reason,
      },
    }
  );

  for (const job of pendingJobs) {
    await recordEmailEvent({
      workspaceId: job.workspaceId,
      userId: job.userId,
      type: "cancelled",
      leadId: job.leadId,
      sendJobId: job._id,
      sequenceId: job.sequenceId,
      stepId: job.stepId,
      stepOrder: job.stepOrder,
      enrollmentId: job.enrollmentId,
      mailboxId: job.mailboxId,
      metadata: { reason },
    });
  }

  return pendingJobs.length;
}

/**
 * Manually retry a failed or dead-letter SendJob
 */
export async function retrySendJobService(
  jobId: string | Types.ObjectId,
  workspaceId: string | Types.ObjectId
): Promise<ISendJob> {
  const job = await SendJob.findOne({
    _id: new Types.ObjectId(String(jobId)),
    workspaceId: new Types.ObjectId(String(workspaceId)),
  });

  if (!job) {
    throw new ApiError(404, "Send job not found");
  }

  // If the assigned mailbox was deleted or is not active, rebind to active workspace mailbox
  const mailbox = await Mailbox.findById(job.mailboxId);
  if (!mailbox || mailbox.status !== "active") {
    const activeMailbox = await Mailbox.findOne({
      workspaceId: job.workspaceId,
      status: "active",
    }).sort({ isDefault: -1, createdAt: 1 });
    if (activeMailbox) {
      job.mailboxId = activeMailbox._id;
    }
  }

  job.status = "queued";
  job.attempts = 0;
  job.nextAttemptAt = new Date();
  job.lockedAt = null;
  job.lockedBy = null;
  job.lastError = null;
  await job.save();

  await recordEmailEvent({
    workspaceId: job.workspaceId,
    userId: job.userId,
    type: "queued",
    leadId: job.leadId,
    sendJobId: job._id,
    sequenceId: job.sequenceId,
    stepId: job.stepId,
    stepOrder: job.stepOrder,
    enrollmentId: job.enrollmentId,
    mailboxId: job.mailboxId,
    metadata: { manualRetry: true },
  });

  return job;
}

/**
 * List SendJobs with filters and pagination
 */
export async function listSendJobsService({
  workspaceId,
  status,
  sequenceId,
  leadId,
  page = 1,
  limit = 20,
}: {
  workspaceId: string | Types.ObjectId;
  status?: string;
  sequenceId?: string;
  leadId?: string;
  page?: number;
  limit?: number;
}) {
  const query: any = {
    workspaceId: new Types.ObjectId(String(workspaceId)),
  };

  if (status && status !== "all") {
    query.status = status;
  }
  if (sequenceId) {
    query.sequenceId = new Types.ObjectId(String(sequenceId));
  }
  if (leadId) {
    query.leadId = new Types.ObjectId(String(leadId));
  }

  const p = Math.max(1, Number(page));
  const l = Math.max(1, Math.min(100, Number(limit)));
  const skip = (p - 1) * l;

  const [jobs, total] = await Promise.all([
    SendJob.find(query)
      .populate("sequenceId", "name status")
      .populate("leadId", "name email company")
      .populate("mailboxId", "email provider health status")
      .populate("stepId", "order title type")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l),
    SendJob.countDocuments(query),
  ]);

  return {
    jobs,
    pagination: {
      page: p,
      limit: l,
      total,
      pages: Math.ceil(total / l) || 1,
    },
  };
}

/**
 * Get aggregate sending queue statistics
 */
export async function getSendJobStatsService(workspaceId: string | Types.ObjectId) {
  const wsId = new Types.ObjectId(String(workspaceId));

  const stats = await SendJob.aggregate([
    { $match: { workspaceId: wsId } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const counts: Record<string, number> = {
    total: 0,
    scheduled: 0,
    queued: 0,
    sending: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    retry: 0,
    dead_letter: 0,
    bounced: 0,
    cancelled: 0,
  };

  for (const s of stats) {
    counts[s._id] = s.count;
    counts.total += s.count;
  }

  return counts;
}
