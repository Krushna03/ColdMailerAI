import { Types } from "mongoose";
import { Lead } from "../models/Lead.model.js";
import { Mailbox } from "../models/Mailbox.model.js";
import { SendJob } from "../models/SendJob.model.js";
import { InboundEmail } from "../models/InboundEmail.model.js";
import { Sequence } from "../models/Sequence.model.js";
import { SequenceStep } from "../models/SequenceStep.model.js";
import { SequenceEnrollment } from "../models/SequenceEnrollment.model.js";
import { Email } from "../models/Email.model.js";
import User from "../models/User.model.js";
import { generateAIContent } from "./ai.service.js";
import { syncLeadStatsFromEmails } from "./lead.service.js";
import { logActivity } from "./activity.service.js";
import { ApiError } from "../utils/ApiError.js";
import {
  getPlanConfigForUser,
  getMonthlyEmailUsage,
  buildPlanUsageSummary,
} from "../utils/planLimits.js";
import {
  buildContextualEmailPrompt,
  ContextualEmailPromptParams,
  ILeadDataContext,
  ICompanyInfoContext,
  ICampaignObjectiveContext,
  ISenderProfileContext,
  IPreviousConversationContext,
  ISequenceContext,
  IConversationMessage,
} from "../constants/aiEmailIntelligence.prompts.js";

export interface AssembleContextParams {
  leadId: string | Types.ObjectId;
  workspaceId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  sequenceId?: string | Types.ObjectId | null;
  stepOrder?: number | null;
  mailboxId?: string | Types.ObjectId | null;
  overrideObjective?: Partial<ICampaignObjectiveContext>;
  overrideTone?: string;
  overrideSenderProfile?: Partial<ISenderProfileContext>;
}

/**
 * Assembles all 7 context pillars for a lead from the database:
 * 1. Lead Data
 * 2. Company Info
 * 3. Campaign Objective
 * 4. Tone
 * 5. Sender Profile
 * 6. Previous Conversation History
 * 7. Sequence Context
 */
export async function assembleLeadContextService(
  params: AssembleContextParams
): Promise<ContextualEmailPromptParams> {
  const {
    leadId,
    workspaceId,
    userId,
    sequenceId,
    stepOrder,
    mailboxId,
    overrideObjective,
    overrideTone,
    overrideSenderProfile,
  } = params;

  const leadObjectId = new Types.ObjectId(String(leadId));
  const wsObjectId = new Types.ObjectId(String(workspaceId));
  const userObjectId = new Types.ObjectId(String(userId));

  // 1 & 2. Lead & Company
  const lead = await Lead.findOne({ _id: leadObjectId, workspaceId: wsObjectId }).populate("categoryId", "name");
  if (!lead) {
    throw new ApiError(404, "Lead not found in the active workspace");
  }

  const leadData: ILeadDataContext = {
    name: lead.name,
    email: lead.email,
    jobTitle: lead.jobTitle || lead.role,
    role: lead.role || lead.jobTitle,
    location: lead.location,
    linkedinUrl: lead.linkedinUrl,
    timezone: lead.timezone,
    notes: lead.notes,
    tags: lead.tags || [],
    customFields: lead.customFields,
    categoryName: (lead.categoryId as any)?.name,
  };

  const comp = typeof lead.company === "object" ? lead.company : { name: lead.company || "Company" };
  const companyData: ICompanyInfoContext = {
    name: comp.name || "Company",
    domain: comp.domain,
    industry: comp.industry,
    size: comp.size,
    revenue: comp.revenue,
    description: (comp as any).description,
    techStack: (comp as any).techStack,
    targetAudience: (comp as any).targetAudience,
  };

  // 5. Sender Profile
  let mailbox = null;
  if (mailboxId) {
    mailbox = await Mailbox.findById(mailboxId);
  }
  if (!mailbox) {
    mailbox = await Mailbox.findOne({ workspaceId: wsObjectId, status: "active" });
  }

  const user = await User.findById(userObjectId);
  const senderProfile: ISenderProfileContext = {
    name: overrideSenderProfile?.name || mailbox?.name || user?.username || "Outreach Specialist",
    title: overrideSenderProfile?.title || "Sales Representative",
    company: overrideSenderProfile?.company || "ColdMailer AI",
    valueProposition: overrideSenderProfile?.valueProposition || "Personalized enterprise outbound and email automation that converts leads into booked calls.",
    meetingLink: overrideSenderProfile?.meetingLink || "",
    bio: overrideSenderProfile?.bio || "",
  };

  // 6. Previous Conversation (History of Outbound and Inbound emails)
  const [outboundJobs, inboundEmails] = await Promise.all([
    SendJob.find({ leadId: leadObjectId, workspaceId: wsObjectId, status: { $in: ["sent", "delivered"] } })
      .sort({ createdAt: 1 })
      .limit(10),
    InboundEmail.find({ leadId: leadObjectId, workspaceId: wsObjectId })
      .sort({ receivedAt: 1 })
      .limit(10),
  ]);

  const conversationHistory: IConversationMessage[] = [];

  for (const job of outboundJobs) {
    conversationHistory.push({
      direction: "outbound",
      subject: job.messagePayload.subject || "Outreach message",
      snippet: (job.messagePayload.text || "").slice(0, 250),
      date: job.createdAt,
    });
  }

  for (const inb of inboundEmails) {
    conversationHistory.push({
      direction: "inbound",
      subject: inb.subject || "Reply",
      snippet: (inb.bodyText || "").slice(0, 250),
      date: inb.receivedAt,
      category: inb.classification?.category,
    });
  }

  // Sort chronological
  conversationHistory.sort((a, b) => {
    const timeA = a.date ? new Date(a.date).getTime() : 0;
    const timeB = b.date ? new Date(b.date).getTime() : 0;
    return timeA - timeB;
  });

  const previousConversation: IPreviousConversationContext = {
    threadSummary:
      conversationHistory.length > 0
        ? `Lead has ${outboundJobs.length} sent emails and ${inboundEmails.length} replies.`
        : "Initial cold outreach. No prior communication.",
    lastInteractionType:
      conversationHistory.length > 0
        ? conversationHistory[conversationHistory.length - 1].direction === "outbound"
          ? "sent_email"
          : "inbound_reply"
        : "none",
    lastContactedAt: lead.lastContactedAt || lead.lastRepliedAt || undefined,
    history: conversationHistory,
  };

  // 7. Sequence Context
  let sequenceContext: ISequenceContext | undefined;
  let targetSeqId = sequenceId;

  if (!targetSeqId) {
    const activeEnrollment = await SequenceEnrollment.findOne({ leadId: leadObjectId, status: "active" });
    if (activeEnrollment) {
      targetSeqId = activeEnrollment.sequenceId;
    }
  }

  if (targetSeqId) {
    const seq = await Sequence.findById(targetSeqId);
    if (seq) {
      const steps = await SequenceStep.find({ sequenceId: seq._id }).sort({ order: 1 });
      const currentOrder = stepOrder || 1;
      const currentStep = steps.find((s) => s.order === currentOrder);

      let stepType: ISequenceContext["stepType"] = "cold_outreach";
      if (currentOrder === 1) {
        stepType = "cold_outreach";
      } else if (currentOrder === steps.length) {
        stepType = "breakup";
      } else if (currentOrder === 2) {
        stepType = "follow_up";
      } else {
        stepType = "value_add";
      }

      sequenceContext = {
        sequenceName: seq.name,
        sequenceDescription: seq.description || "Multi-step automated sales sequence",
        currentStepOrder: currentOrder,
        totalSteps: steps.length || 1,
        stepType,
        stepTitle: currentStep?.title || `Step ${currentOrder} outreach`,
        daysSinceLastStep: currentStep?.delay?.value || 3,
        overallStrategy: "Engage, deliver value, follow-up, and secure discovery call",
      };
    }
  }

  // 3. Campaign Objective
  const campaignObjective: ICampaignObjectiveContext = {
    goal: overrideObjective?.goal || (sequenceContext ? `Sequence: ${sequenceContext.sequenceName}` : "Book a 15-minute product intro"),
    callToAction: overrideObjective?.callToAction || "Are you available for a brief 10-minute chat next Tuesday?",
    valueProposition: overrideObjective?.valueProposition || senderProfile.valueProposition,
    offer: overrideObjective?.offer || "Tailored workflow demonstration & benchmark data",
  };

  return {
    lead: leadData,
    company: companyData,
    campaignObjective,
    tone: overrideTone || "professional",
    senderProfile,
    previousConversation,
    sequenceContext,
  };
}

export interface GenerateContextualEmailParams {
  leadId?: string | Types.ObjectId;
  workspaceId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  customContext?: Partial<ContextualEmailPromptParams>;
  overrideObjective?: Partial<ICampaignObjectiveContext>;
  overrideTone?: string;
  overrideSenderProfile?: Partial<ISenderProfileContext>;
  sequenceId?: string | Types.ObjectId | null;
  stepOrder?: number | null;
  customInstructions?: string;
}

export interface GeneratedContextualEmailResult {
  emailId?: Types.ObjectId;
  subject: string;
  alternativeSubjects: string[];
  body: string;
  preheader: string;
  callToAction: string;
  personalizationInsights: string;
  suggestedDelayDays: number;
  contextSnapshot: ContextualEmailPromptParams;
  usage?: any;
}

/**
 * Generates an email leveraging all 7 context pillars:
 * Lead data + Company info + Campaign objective + Tone + Sender profile + Previous conversation + Sequence context
 */
export async function generateContextualEmailService(
  params: GenerateContextualEmailParams
): Promise<GeneratedContextualEmailResult> {
  const { workspaceId, userId, leadId } = params;

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Plan quota check
  const now = new Date();
  const planConfig = getPlanConfigForUser(user);
  let monthlyUsage = { used: 0 };
  if (planConfig?.id !== "TESTING") {
    monthlyUsage = await getMonthlyEmailUsage({ userId: user._id, now });
    const monthlyLimit = planConfig?.limits?.monthlyEmailGenerations ?? null;
    if (monthlyLimit && monthlyUsage.used >= monthlyLimit) {
      throw new ApiError(
        403,
        `You have reached the ${planConfig.name} plan limit of ${monthlyLimit} emails this month.`
      );
    }
  }

  // 1. Gather all 7 context pillars
  let promptContext: ContextualEmailPromptParams;

  if (leadId) {
    promptContext = await assembleLeadContextService({
      leadId,
      workspaceId,
      userId,
      sequenceId: params.sequenceId,
      stepOrder: params.stepOrder,
      overrideObjective: params.overrideObjective,
      overrideTone: params.overrideTone,
      overrideSenderProfile: params.overrideSenderProfile,
    });
  } else if (params.customContext?.lead && params.customContext?.company) {
    promptContext = {
      lead: params.customContext.lead,
      company: params.customContext.company,
      campaignObjective: params.customContext.campaignObjective || {
        goal: "Initiate conversation and offer 15-minute demo",
        callToAction: "Are you open to a 10-minute chat this week?",
      },
      tone: params.overrideTone || params.customContext.tone || "professional",
      senderProfile: params.customContext.senderProfile || {
        name: user.username,
        title: "Account Executive",
        company: "ColdMailer AI",
      },
      previousConversation: params.customContext.previousConversation,
      sequenceContext: params.customContext.sequenceContext,
    };
  } else {
    throw new ApiError(400, "Must provide leadId or full lead & company context parameters");
  }

  if (params.customInstructions) {
    promptContext.customInstructions = params.customInstructions;
  }

  // 2. Build structured LLM prompt
  const fullPrompt = buildContextualEmailPrompt(promptContext);

  // 3. Execute AI Generation with resilient fallback
  const aiResponse = await generateAIContent(fullPrompt);
  if (!aiResponse.success || !aiResponse.data) {
    throw new ApiError(aiResponse.statusCode || 500, aiResponse.error || "Failed to generate AI email");
  }

  // 4. Parse JSON Response with resilient extraction
  let parsedResult = {
    subject: `Reaching out to ${promptContext.lead.name}`,
    alternativeSubjects: [
      `Quick question regarding ${promptContext.company.name}`,
      `Idea for ${promptContext.lead.name}`,
    ],
    preheader: `Quick idea for ${promptContext.company.name}`,
    body: aiResponse.data,
    callToAction: "Are you open to a quick 10-minute chat?",
    personalizationInsights: "Tailored to prospect role, company domain, and campaign objective.",
    suggestedDelayDays: 3,
  };

  try {
    let cleanText = aiResponse.data.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.replace(/^```json\s*/, "").replace(/```$/, "").trim();
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```\s*/, "").replace(/```$/, "").trim();
    }

    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.body) {
        parsedResult = {
          subject: parsed.subject || parsedResult.subject,
          alternativeSubjects: Array.isArray(parsed.alternativeSubjects)
            ? parsed.alternativeSubjects
            : parsedResult.alternativeSubjects,
          preheader: parsed.preheader || parsedResult.preheader,
          body: parsed.body,
          callToAction: parsed.callToAction || parsedResult.callToAction,
          personalizationInsights: parsed.personalizationInsights || parsedResult.personalizationInsights,
          suggestedDelayDays: Number(parsed.suggestedDelayDays) || 3,
        };
      }
    }
  } catch (parseErr) {
    console.warn("[AI Intelligence] Could not parse JSON response from LLM, using fallback text:", parseErr);
  }

  // 5. Store Email document in DB
  const emailDoc = await Email.create({
    prompt: `Contextual: ${promptContext.campaignObjective.goal} for ${promptContext.lead.name}`,
    generatedEmail: parsedResult.body,
    userId: user._id,
    workspaceId: new Types.ObjectId(String(workspaceId)),
    leadId: leadId ? new Types.ObjectId(String(leadId)) : undefined,
    sendStatus: "generated",
  });

  if (leadId) {
    await syncLeadStatsFromEmails(new Types.ObjectId(String(leadId)));
    await logActivity({
      workspaceId: new Types.ObjectId(String(workspaceId)),
      userId: user._id,
      leadId: new Types.ObjectId(String(leadId)),
      type: "EMAIL_GENERATED",
      title: `AI generated email for ${promptContext.lead.name} using 7-pillar intelligence`,
      metadata: {
        emailId: emailDoc._id,
        subject: parsedResult.subject,
        insights: parsedResult.personalizationInsights,
      },
    });
  }

  // 6. Build plan usage snapshot
  const updatedMonthlyUsage = {
    ...monthlyUsage,
    used: monthlyUsage.used + 1,
  };

  const usageSummary = await buildPlanUsageSummary({
    user,
    planConfig,
    now,
    monthlyUsageSnapshot: updatedMonthlyUsage,
  });

  return {
    emailId: emailDoc._id,
    subject: parsedResult.subject,
    alternativeSubjects: parsedResult.alternativeSubjects,
    body: parsedResult.body,
    preheader: parsedResult.preheader,
    callToAction: parsedResult.callToAction,
    personalizationInsights: parsedResult.personalizationInsights,
    suggestedDelayDays: parsedResult.suggestedDelayDays,
    contextSnapshot: promptContext,
    usage: usageSummary,
  };
}

export interface BatchContextualGenerationParams {
  leadIds: (string | Types.ObjectId)[];
  workspaceId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  objective?: Partial<ICampaignObjectiveContext>;
  tone?: string;
  senderProfile?: Partial<ISenderProfileContext>;
  sequenceId?: string | Types.ObjectId;
  stepOrder?: number;
}

/**
 * Batch Generates Contextual Emails for a list of leads,
 * assembling individual lead data, company info, and previous conversations per prospect.
 */
export async function batchGenerateContextualEmailsService(
  params: BatchContextualGenerationParams
) {
  const { leadIds, workspaceId, userId, objective, tone, senderProfile, sequenceId, stepOrder } = params;

  const results: any[] = [];
  let successCount = 0;

  for (const id of leadIds) {
    try {
      const generated = await generateContextualEmailService({
        leadId: id,
        workspaceId,
        userId,
        overrideObjective: objective,
        overrideTone: tone,
        overrideSenderProfile: senderProfile,
        sequenceId,
        stepOrder,
      });

      successCount++;
      results.push({
        leadId: id,
        success: true,
        emailId: generated.emailId,
        subject: generated.subject,
        alternativeSubjects: generated.alternativeSubjects,
        body: generated.body,
        insights: generated.personalizationInsights,
      });
    } catch (err: any) {
      results.push({
        leadId: id,
        success: false,
        error: err.message || "Failed to generate contextual email",
      });
    }
  }

  return {
    results,
    total: leadIds.length,
    successCount,
    failureCount: leadIds.length - successCount,
  };
}
