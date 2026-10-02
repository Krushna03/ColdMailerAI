import { Types } from "mongoose";
import { Sequence, ISequenceDocument } from "../models/Sequence.model.js";
import { SequenceStep, ISequenceStepDocument, StepType } from "../models/SequenceStep.model.js";
import { SequenceEnrollment, ISequenceEnrollmentDocument, StopReason } from "../models/SequenceEnrollment.model.js";
import { Lead, ILead, LeadStatus } from "../models/Lead.model.js";
import { Mailbox } from "../models/Mailbox.model.js";
import { Email } from "../models/Email.model.js";
import { Segment } from "../models/Segment.model.js";
import { buildMongoQueryFromSegment } from "../utils/segmentQueryBuilder.js";
import {
  createSendJob,
  processSendJob,
  cancelPendingSendJobsForEnrollment,
} from "./sendJob.service.js";
import { logActivity } from "./activity.service.js";
import { recalculateSequenceStatsService } from "./sequence.service.js";
import { generateAIContent } from "./ai.service.js";
import { ApiError } from "../utils/ApiError.js";


// Replaces {{variable}} placeholders with lead values.
// Supports fallback defaults like {{firstName|there}} or {{company|your company}}.
export function interpolateTemplate(
  template: string,
  lead: Partial<ILead> | any,
  customVariables: Record<string, any> = {}
): string {
  if (!template) return "";

  const nameParts = (lead.name || "").trim().split(/\s+/);

  const firstName = nameParts[0] || "";
  
  const lastName = nameParts.slice(1).join(" ") || "";
  
  const companyName =
    typeof lead.company === "object" && lead.company?.name
      ? lead.company.name
      : typeof lead.company === "string"
      ? lead.company
      : "";

  const variables: Record<string, any> = {
    name: lead.name || "",
    firstName,
    lastName,
    email: lead.email || "",
    company: companyName,
    companyName,
    jobTitle: lead.jobTitle || lead.role || "",
    role: lead.role || lead.jobTitle || "",
    phone: lead.phone || "",
    location: lead.location || "",
    timezone: lead.timezone || "",
    customFields: lead.customFields || {},
    ...customVariables,
    ...(lead.customFields || {}),
  };

  return template.replace(/\{\{\s*([\w.-]+)(?:\|([^}]+))?\s*\}\}/g, (_, key, defaultValue) => {
    // Check direct key or dotted nested key (e.g. customFields.fundingStage)
    let val: any = undefined;
    if (key.includes(".")) {
      const parts = key.split(".");
      let curr = variables;
      for (const p of parts) {
        if (curr && typeof curr === "object" && p in curr) {
          curr = curr[p];
        } else {
          curr = undefined;
          break;
        }
      }
      val = curr;
    } else {
      val = variables[key];
    }

    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return String(val);
    }

    return defaultValue !== undefined ? defaultValue : "";
  });
}


// Calculates next run date based on delay, allowed sending days, and sending window.
export function calculateNextRunDate(
  delay: { value: number; unit: "minutes" | "hours" | "days" },
  settings?: any,
  startDate: Date = new Date()
): Date {
  const target = new Date(startDate.getTime());

  if (delay && delay.value > 0) {
    if (delay.unit === "minutes") {
      target.setMinutes(target.getMinutes() + delay.value);
    } else if (delay.unit === "hours") {
      target.setHours(target.getHours() + delay.value);
    } else {
      // Days
      target.setDate(target.getDate() + delay.value);
    }
  }

  // Adjust for sendOnDays (e.g. Mon-Fri)
  const allowedDays: number[] = settings?.sendOnDays && settings.sendOnDays.length > 0
    ? settings.sendOnDays
    : [1, 2, 3, 4, 5];

  while (!allowedDays.includes(target.getDay())) {
    target.setDate(target.getDate() + 1);
  }

  return target;
}

export interface EnrollLeadsParams {
  sequenceId: string | Types.ObjectId;
  workspaceId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  leadIds?: string[];
  segmentId?: string;
  mailboxId?: string | null;
}


// Enrolls leads into a sequence workflow.
export async function enrollLeadsInSequenceService({
  sequenceId,
  workspaceId,
  userId,
  leadIds = [],
  segmentId,
  mailboxId,
}: EnrollLeadsParams) {
  const seqObjectId = new Types.ObjectId(String(sequenceId));
  const wsObjectId = new Types.ObjectId(String(workspaceId));
  const userObjectId = new Types.ObjectId(String(userId));

  const sequence = await Sequence.findOne({
    _id: seqObjectId,
    workspaceId: wsObjectId,
  });

  if (!sequence) {
    throw new ApiError(404, "Sequence not found");
  }

  // Find first step
  const firstStep = await SequenceStep.findOne({
    sequenceId: sequence._id,
    order: 1,
  });

  if (!firstStep) {
    throw new ApiError(400, "Sequence has no steps configured. Please add at least one step before enrolling leads.");
  }

  // Determine candidate lead IDs
  let targetLeadIds: Types.ObjectId[] = [];
  if (segmentId) {
    const segment = await Segment.findOne({ _id: new Types.ObjectId(segmentId), workspaceId: wsObjectId });
    
    if (segment && segment.filters) {
      const query = buildMongoQueryFromSegment(segment.filters, { workspaceId: wsObjectId, userId: userObjectId });
      const segmentLeads = await Lead.find(query).select("_id");
      targetLeadIds = segmentLeads.map((l: any) => l._id);
    }
  } else if (leadIds && leadIds.length > 0) {
    targetLeadIds = leadIds.map((id) => new Types.ObjectId(id));
  }

  if (targetLeadIds.length === 0) {
    return { enrolledCount: 0, skippedCount: 0, message: "No matching leads found to enroll" };
  }

  // Load leads
  const leads = await Lead.find({
    _id: { $in: targetLeadIds },
    workspaceId: wsObjectId,
  });

  const stopStatuses = sequence.enrollmentRules?.stopIfLeadStatus || ["replied", "meeting", "closed", "archived"];
  const allowReenrollment = sequence.enrollmentRules?.allowReenrollment || false;

  let enrolledCount = 0;
  let skippedCount = 0;

  for (const lead of leads) {
    // 1. Check if lead status is disallowed
    if (stopStatuses.includes(lead.status)) {
      skippedCount++;
      continue;
    }

    // 2. Check existing enrollment
    const existing = await SequenceEnrollment.findOne({
      sequenceId: sequence._id,
      leadId: lead._id,
    });

    if (existing) {
      if (!allowReenrollment) {
        skippedCount++;
        continue;
      }
      if (existing.status === "active") {
        skippedCount++;
        continue;
      }
    }

    // Determine initial nextRunAt
    const initialRunAt = firstStep.delay?.value === 0
      ? new Date()
      : calculateNextRunDate(firstStep.delay, sequence.settings);

    const leadCompany =
      typeof lead.company === "object" && lead.company?.name
        ? lead.company.name
        : typeof lead.company === "string"
        ? lead.company
        : "";

    if (existing && allowReenrollment) {
      existing.status = "active";
      existing.currentStepOrder = 1;
      existing.currentStepId = firstStep._id;
      existing.nextRunAt = initialRunAt;
      existing.stopReason = null;
      existing.mailboxId = mailboxId ? new Types.ObjectId(mailboxId) : sequence.settings?.mailboxId || null;
      existing.leadSnapshot = {
        name: lead.name,
        email: lead.email,
        company: leadCompany,
        jobTitle: lead.jobTitle || lead.role || "",
      };
      await existing.save();
    } else {
      await SequenceEnrollment.create({
        sequenceId: sequence._id,
        leadId: lead._id,
        workspaceId: wsObjectId,
        userId: userObjectId,
        mailboxId: mailboxId ? new Types.ObjectId(mailboxId) : sequence.settings?.mailboxId || null,
        status: "active",
        currentStepOrder: 1,
        currentStepId: firstStep._id,
        nextRunAt: initialRunAt,
        stopReason: null,
        stepHistory: [],
        leadSnapshot: {
          name: lead.name,
          email: lead.email,
          company: leadCompany,
          jobTitle: lead.jobTitle || lead.role || "",
        },
      });
    }

    enrolledCount++;
  }

  // Recalculate stats
  await recalculateSequenceStatsService(sequence._id);

  return {
    enrolledCount,
    skippedCount,
    totalCandidateCount: leads.length,
  };
}


// Executes a single due step for an enrollment.
export async function executeEnrollmentStep(
  enrollment: ISequenceEnrollmentDocument,
  sequence: ISequenceDocument
) {
  const lead = await Lead.findById(enrollment.leadId);
  if (!lead) {
    enrollment.status = "failed";
    enrollment.stopReason = "error";
    await enrollment.save();
    return;
  }

  // Check if lead status should stop sequence
  const stopStatuses = sequence.enrollmentRules?.stopIfLeadStatus || ["replied", "meeting", "closed", "archived"];
  if (stopStatuses.includes(lead.status) || (sequence.settings.stopOnReply && lead.status === "replied")) {
    enrollment.status = "stopped";
    enrollment.stopReason = lead.status === "replied" ? "replied" : "lead_status_changed";
    enrollment.nextRunAt = null;
    await enrollment.save();
    return;
  }

  // Load current step
  const step = await SequenceStep.findOne({
    sequenceId: sequence._id,
    order: enrollment.currentStepOrder,
  });

  if (!step) {
    // No more steps -> sequence completed!
    enrollment.status = "completed";
    enrollment.stopReason = "completed";
    enrollment.nextRunAt = null;
    await enrollment.save();
    return;
  }

  // Evaluate conditions if any
  let shouldExecute = true;
  let jumpOrder: number | null = null;

  if (step.conditions && step.conditions.field && step.conditions.field !== "none") {
    const { field, operator, value, actionOnFalse, jumpToStepOrder } = step.conditions;
    let actualValue: any = null;

    if (field === "replyReceived") {
      actualValue = lead.status === "replied" || lead.emailsSentCount > 0 && lead.status !== "new";
    } else if (field === "emailOpened") {
      actualValue = false; // default if not tracked yet
    } else if (field === "leadStatus") {
      actualValue = lead.status;
    }

    let conditionPassed = true;
    if (operator === "is_false") {
      conditionPassed = !actualValue;
    } else if (operator === "is_true") {
      conditionPassed = Boolean(actualValue);
    } else if (operator === "equals") {
      conditionPassed = String(actualValue) === String(value);
    } else if (operator === "not_equals") {
      conditionPassed = String(actualValue) !== String(value);
    }

    if (!conditionPassed) {
      if (actionOnFalse === "stop") {
        enrollment.status = "stopped";
        enrollment.stopReason = "condition_stopped";
        enrollment.nextRunAt = null;
        await enrollment.save();
        return;
      } else if (actionOnFalse === "jump_to" && jumpToStepOrder) {
        jumpOrder = jumpToStepOrder;
        shouldExecute = false;
      } else {
        // Skip
        shouldExecute = false;
      }
    }
  }

  // Process Step Type
  let emailId: Types.ObjectId | null = null;
  let executionError: string | undefined = undefined;
  let executedSubject = step.template?.subject || "";

  if (shouldExecute) {
    try {
      if (step.type === "email") {
        // 1. Resolve mailbox
        let targetMailboxId = enrollment.mailboxId || sequence.settings.mailboxId;
        let resolvedMailbox = targetMailboxId ? await Mailbox.findById(targetMailboxId) : null;
        if (!resolvedMailbox || resolvedMailbox.status !== "active") {
          const defaultMailbox = await Mailbox.findOne({
            workspaceId: sequence.workspaceId,
            status: "active",
          }).sort({ isDefault: -1, createdAt: 1 });

          if (!defaultMailbox) {
            throw new Error("No active mailbox configured in workspace for sequence email delivery");
          }
          targetMailboxId = defaultMailbox._id;
          resolvedMailbox = defaultMailbox;
        }

        // 2. Interpolate content
        let subject = interpolateTemplate(step.template?.subject || "Follow-up", lead, enrollment.customVariables);
        executedSubject = subject;
        let body = interpolateTemplate(step.template?.body || "", lead, enrollment.customVariables);

        // If template has AI prompt, generate personalized content
        if (step.template?.aiPrompt) {
          const aiPrompt = interpolateTemplate(step.template.aiPrompt, lead, enrollment.customVariables);
          try {
            const aiContent = await generateAIContent(aiPrompt);
            if (aiContent?.data) body = aiContent.data;
          } catch (aiErr) {
            console.warn("[Sequence AI Prompt warning]", aiErr);
          }
        }

        // 3. Create Email record
        const emailDoc = await Email.create({
          prompt: `Sequence: ${sequence.name} (Step ${step.order})`,
          generatedEmail: body,
          userId: sequence.userId,
          workspaceId: sequence.workspaceId,
          leadId: lead._id,
          sendStatus: "generated",
        });

        emailId = emailDoc._id;

        // 4. Decoupled Sending Engine: Enqueue SendJob into Queue
        const html = `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #111;">${body.replace(/\n/g, "<br/>")}</div>`;
        const sendJob = await createSendJob({
          workspaceId: sequence.workspaceId,
          userId: sequence.userId,
          sequenceId: sequence._id,
          stepId: step._id,
          stepOrder: step.order,
          enrollmentId: enrollment._id,
          leadId: lead._id,
          mailboxId: targetMailboxId,
          emailId: emailDoc._id,
          messagePayload: {
            to: lead.email,
            subject,
            html,
            text: body,
          },
        });

        // Worker execution cycle: Dispatch through email worker
        const sendResult = await processSendJob(sendJob);
        if (!sendResult.success) {
          if (sendResult.status === "bounced") {
            executionError = sendResult.error || "Email bounced";
          } else if (sendResult.status === "dead_letter") {
            executionError = sendResult.error || "Sending failed";
          }
        }
        return;
      } else if (step.type === "ai_action") {
        // AI Action e.g. generate personalized intro
        if (step.aiActionConfig?.prompt) {
          const prompt = interpolateTemplate(step.aiActionConfig.prompt, lead);
          const aiInsight = await generateAIContent(prompt);
          if (aiInsight?.data) {
            if (!lead.customFields) lead.customFields = {};
            lead.customFields.aiInsight = aiInsight.data.slice(0, 500);
            await lead.save();
          }
        }
      } else if (step.type === "task") {
        // Log task activity
        await logActivity({
          workspaceId: sequence.workspaceId,
          userId: sequence.userId,
          leadId: lead._id,
          type: "TASK_CREATED",
          title: `Sequence task [${step.taskConfig?.title || "Manual Review"}]`,
          metadata: { description: step.taskConfig?.description || "" },
        });
      } else if (step.type === "webhook" && step.webhookConfig?.url) {
        // Send webhook
        try {
          const headerObj = step.webhookConfig.headers
            ? (step.webhookConfig.headers instanceof Map
                ? Object.fromEntries(step.webhookConfig.headers)
                : step.webhookConfig.headers)
            : {};

          await fetch(step.webhookConfig.url, {
            method: step.webhookConfig.method || "POST",
            headers: {
              "Content-Type": "application/json",
              ...headerObj,
            },
            body: JSON.stringify({
              sequenceId: sequence._id,
              leadId: lead._id,
              email: lead.email,
              stepOrder: step.order,
              timestamp: new Date().toISOString(),
            }),
          });
        } catch (whErr: any) {
          console.error("[Sequence Webhook error]", whErr);
        }
      }
    } catch (err: any) {
      executionError = err.message || "Step execution failed";
      step.stats.failedCount = (step.stats.failedCount || 0) + 1;
      await step.save();
    }
  }

  // Record step in history
  enrollment.stepHistory.push({
    stepId: step._id,
    stepOrder: step.order,
    type: step.type,
    executedAt: new Date(),
    status: executionError ? "failed" : shouldExecute ? "success" : "skipped",
    subject: executedSubject,
    emailId,
    error: executionError,
  });

  // Determine next step
  const nextOrder = jumpOrder || enrollment.currentStepOrder + 1;
  const nextStep = await SequenceStep.findOne({
    sequenceId: sequence._id,
    order: nextOrder,
  });

  if (!nextStep) {
    enrollment.status = "completed";
    enrollment.stopReason = "completed";
    enrollment.nextRunAt = null;
  } else {
    enrollment.currentStepOrder = nextStep.order;
    enrollment.currentStepId = nextStep._id;
    enrollment.nextRunAt = calculateNextRunDate(nextStep.delay, sequence.settings);
  }

  await enrollment.save();
}


// Main polling runner to process all active due enrollments across the system.
export async function processDueEnrollmentsService(batchSize: number = 20) {
  const now = new Date();

  // Find due active enrollments
  const dueEnrollments = await SequenceEnrollment.find({
    status: "active",
    nextRunAt: { $lte: now },
  })
    .limit(batchSize)
    .sort({ nextRunAt: 1 });

  if (dueEnrollments.length === 0) {
    return { processedCount: 0 };
  }

  let processedCount = 0;

  for (const enrollment of dueEnrollments) {
    try {
      const sequence = await Sequence.findById(enrollment.sequenceId);
      if (!sequence || sequence.status !== "active") {
        // If sequence was paused or archived, leave or pause
        continue;
      }

      await executeEnrollmentStep(enrollment, sequence);
      processedCount++;
    } catch (err) {
      console.error(`[Sequence Engine] Error processing enrollment ${enrollment._id}:`, err);
    }
  }

  return { processedCount };
}


// Automatically stops sequences when a lead replies or enters an excluded status.
export async function checkAndStopLeadSequencesService(
  leadId: string | Types.ObjectId,
  newStatus: LeadStatus,
  reason: StopReason = "replied"
) {
  const leadObjectId = new Types.ObjectId(String(leadId));

  const activeEnrollments = await SequenceEnrollment.find({
    leadId: leadObjectId,
    status: "active",
  }).populate<{ sequenceId: ISequenceDocument }>("sequenceId");

  for (const enrollment of activeEnrollments) {
    const seq = enrollment.sequenceId;
    if (!seq) continue;

    const stopStatuses = seq.enrollmentRules?.stopIfLeadStatus || ["replied", "meeting", "closed", "archived"];
    const shouldStop =
      (seq.settings.stopOnReply && newStatus === "replied") ||
      stopStatuses.includes(newStatus);

    if (shouldStop) {
      enrollment.status = "stopped";
      enrollment.stopReason = reason;
      enrollment.nextRunAt = null;
      await enrollment.save();

      // Cancel any pending or queued send jobs for this enrollment
      await cancelPendingSendJobsForEnrollment(
        enrollment._id,
        `Lead status changed to ${newStatus} (${reason})`
      );

      await recalculateSequenceStatsService(seq._id);
    }
  }
}
