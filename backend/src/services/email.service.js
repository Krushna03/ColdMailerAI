import { Email } from "../models/Email.model.js";
import { Lead } from "../models/Lead.model.js";
import { BatchJob } from "../models/BatchJob.model.js";
import User from "../models/User.model.js";
import { ApiError } from "../utils/ApiError.js";
import { buildPlanUsageSummary, getPlanConfigForUser, getMonthlyEmailUsage } from "../utils/planLimits.js";
import { generateAIContent, generateAIContentWithRole } from "./ai.service.js";
import { getLeadsByIdsService, syncLeadStatsFromEmails } from "./lead.service.js";
import { EMAIL_GENERATION_PROMPT, EMAIL_UPDATE_PROMPT, EMAIL_HISTORY_UPDATE_PROMPT, BATCH_EMAIL_GENERATION_PROMPT } from "../constants/email.prompts.js";
import { convertImageToBase64 } from "../middlewares/upload.middleware.js";


const checkMonthlyLimit = async (user, now) => {
  const planConfig = getPlanConfigForUser(user);
  const userId = user._id;
  const monthlyUsage = await getMonthlyEmailUsage({ userId, now });
  const monthlyLimit = planConfig?.limits?.monthlyEmailGenerations ?? null;

  if (monthlyLimit && monthlyUsage.used >= monthlyLimit) {
    throw new ApiError(
      403,
      `You have reached the ${planConfig.name} plan limit of ${monthlyLimit} emails this month. Please upgrade your plan to continue.`
    );
  }

  return { planConfig, monthlyUsage };
};


const checkBatchLimit = async (user, now, requestedCount) => {
  const planConfig = getPlanConfigForUser(user);
  const userId = user._id;
  const monthlyUsage = await getMonthlyEmailUsage({ userId, now });
  const monthlyLimit = planConfig?.limits?.monthlyEmailGenerations ?? null;

  if (monthlyLimit && monthlyUsage.used + requestedCount > monthlyLimit) {
    const remaining = Math.max(monthlyLimit - monthlyUsage.used, 0);
    throw new ApiError(
      403,
      `This batch needs ${requestedCount} generations, but your ${planConfig.name} plan only has ${remaining} left this month. Select fewer leads or upgrade your plan.`
    );
  }

  return { planConfig, monthlyUsage };
};


const checkRegenerationLimit = (user, emailRecord) => {
  const planConfig = getPlanConfigForUser(user);
  const maxRegenerations = planConfig?.limits?.maxRegenerationsPerEmail;
  const currentRegenerations = emailRecord.chatEmails?.length || 0;

  if (
    typeof maxRegenerations === 'number' &&
    maxRegenerations >= 0 &&
    currentRegenerations >= maxRegenerations
  ) {
    throw new ApiError(
      403,
      `Your current plan allows ${maxRegenerations} update${maxRegenerations === 1 ? '' : 's'} per email. Upgrade for a higher revision limit.`
    );
  }

  return planConfig;
};


export const generateEmailService = async ({ prompt, user, images = [] }) => {
  const now = new Date();

  const { planConfig, monthlyUsage } = await checkMonthlyLimit(user, now);

  const fullPrompt = EMAIL_GENERATION_PROMPT + prompt;
  const imageData = convertImageToBase64(images);
  
  const aiResponse = await generateAIContent(fullPrompt, imageData);

  if (!aiResponse.success) {
    throw new ApiError(aiResponse.statusCode, aiResponse.error);
  }

  const fullEmail = aiResponse.data;

  const email = await Email.create({
    prompt,
    generatedEmail: fullEmail,
    userId: user._id
  });

  const updatedMonthlyUsage = {
    ...monthlyUsage,
    used: monthlyUsage.used + 1
  };

  const usageSummary = await buildPlanUsageSummary({
    user,
    planConfig,
    now,
    monthlyUsageSnapshot: updatedMonthlyUsage
  });

  return {
    fullEmail,
    emailId: email._id,
    usage: usageSummary
  };
};


export const generateBatchEmailsService = async ({
  leadIds,
  instructions = '',
  purpose = '',
  tone = 'professional',
  user
}) => {
  const now = new Date();

  const leads = await getLeadsByIdsService({ leadIds, userId: user._id });

  const { planConfig, monthlyUsage } = await checkBatchLimit(user, now, leads.length);
  const goal = purpose || instructions;

  const results = [];
  let successCount = 0;

  // Sequential, not parallel — keeps us within Gemini rate limits and makes
  // the fallback-model logic in ai.service.js behave predictably per call.
  for (const lead of leads) {
    try {
      const prompt = BATCH_EMAIL_GENERATION_PROMPT(lead, {
        instructions,
        purpose: goal,
        tone
      });
      const aiResponse = await generateAIContent(prompt);

      if (!aiResponse.success) {
        results.push({ leadId: lead._id, leadName: lead.name, success: false, error: aiResponse.error });
        continue;
      }

      const email = await Email.create({
        prompt: goal || `Batch outreach email for ${lead.name}`,
        generatedEmail: aiResponse.data,
        userId: user._id,
        leadId: lead._id,
        sendStatus: 'generated',
        sentAt: null
      });

      await syncLeadStatsFromEmails(lead._id);

      successCount += 1;
      results.push({
        leadId: lead._id,
        leadName: lead.name,
        leadEmail: lead.email,
        leadCompany: lead.company,
        success: true,
        emailId: email._id,
        generatedEmail: aiResponse.data
      });
    } catch (err) {
      results.push({ leadId: lead._id, leadName: lead.name, success: false, error: 'Unexpected error during generation' });
    }
  }

  const updatedMonthlyUsage = {
    ...monthlyUsage,
    used: monthlyUsage.used + successCount
  };

  const usageSummary = await buildPlanUsageSummary({
    user,
    planConfig,
    now,
    monthlyUsageSnapshot: updatedMonthlyUsage
  });

  return {
    results,
    successCount,
    failureCount: results.length - successCount,
    usage: usageSummary
  };
};


export const updateEmailService = async ({ emailId, baseEmail, modifications, user, images = [] }) => {
  // Find email record
  const emailRecord = await Email.findOne({
    _id: emailId,
    userId: user._id
  });

  if (!emailRecord) {
    throw new ApiError(404, 'Email not found');
  }

  checkRegenerationLimit(user, emailRecord);

  const systemPrompt = EMAIL_UPDATE_PROMPT(baseEmail, modifications);
  const imageData = convertImageToBase64(images);
  const aiResponse = await generateAIContentWithRole(systemPrompt, 'user', imageData);

  if (!aiResponse.success) {
    throw new ApiError(aiResponse.statusCode, aiResponse.error);
  }

  const updatedEmail = aiResponse.data;

  emailRecord.chatEmails.push({
    prompt: modifications,
    generatedEmail: updatedEmail,
  });

  await emailRecord.save();

  return updatedEmail;
};


export const updateEmailHistoryService = async ({
  emailId,
  modification,
  user,
  images = []
}) => {

  const emailRecord = await Email.findOne({
    _id: emailId,
    userId: user._id
  });

  if (!emailRecord) {
    throw new ApiError(404, 'Email not found');
  }

  checkRegenerationLimit(user, emailRecord);

  // Build full context from the DB record
  const chatHistory = emailRecord.chatEmails || [];

  // Get the latest email version (last iteration or original)
  const latestEmail = chatHistory.length > 0
    ? chatHistory[chatHistory.length - 1].generatedEmail
    : emailRecord.generatedEmail;

  // Build iteration history from last 5 iterations (modification requests only)
  const recentIterations = chatHistory.slice(-5);
  let iterationContext = '';
  for (let i = 0; i < recentIterations.length; i++) {
    iterationContext += `\n- Modification ${i + 1}: ${recentIterations[i].prompt}`;
  }

  const systemPrompt = EMAIL_HISTORY_UPDATE_PROMPT(
    emailRecord.prompt,
    emailRecord.generatedEmail,
    latestEmail,
    iterationContext,
    modification
  );
  const imageData = convertImageToBase64(images);
  const aiResponse = await generateAIContent(systemPrompt, imageData);

  if (!aiResponse.success) {
    throw new ApiError(aiResponse.statusCode, aiResponse.error);
  }

  const fullEmail = aiResponse.data;

  emailRecord.chatEmails.push({
    prompt: modification,
    generatedEmail: fullEmail,
  });

  await emailRecord.save();

  return fullEmail;
};


export const getUserEmailHistoryService = async ({ userId, limit, page }) => {
  const emails = await Email.find({ userId })
    .select("_id prompt createdAt updatedAt")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(page * limit)
    .lean();

  return {
    emails: emails || [],
    hasMore: emails.length === limit
  };
};

export const getEmailByIdService = async ({ emailId, userId }) => {
  const email = await Email.findOne({
    _id: emailId,
    userId
  });

  if (!email) {
    throw new ApiError(404, 'Email not found');
  }

  return email;
};


export const getUsageSummaryService = async (user) => {
  const planConfig = getPlanConfigForUser(user);
  const usageSummary = await buildPlanUsageSummary({
    user,
    planConfig,
    now: new Date()
  });

  return usageSummary;
};


export const deleteEmailService = async ({ emailId, userId }) => {
  const deletedEmail = await Email.findOneAndDelete({
    _id: emailId,
    userId
  });

  if (!deletedEmail) {
    throw new ApiError(404, 'Email not found or already deleted');
  }

  if (deletedEmail.leadId) {
    await syncLeadStatsFromEmails(deletedEmail.leadId);
  }

  return { success: true };
};


export const markEmailSentService = async ({ emailId, userId }) => {
  const email = await Email.findOne({ _id: emailId, userId });

  if (!email) {
    throw new ApiError(404, 'Email not found');
  }

  if (email.sendStatus === 'sent') {
    return email;
  }

  email.sendStatus = 'sent';
  email.sentAt = new Date();
  await email.save();

  if (email.leadId) {
    const lead = await Lead.findOne({ _id: email.leadId, userId });
    if (lead) {
      if (lead.status === 'new') {
        lead.status = 'contacted';
      }
      await lead.save();
      await syncLeadStatsFromEmails(lead._id);
    }
  }

  return email;
};

export const unmarkEmailSentService = async ({ emailId, userId }) => {
  const email = await Email.findOne({ _id: emailId, userId });

  if (!email) {
    throw new ApiError(404, 'Email not found');
  }

  if (email.sendStatus !== 'sent') {
    return email;
  }

  email.sendStatus = 'generated';
  email.sentAt = null;
  await email.save();

  if (email.leadId) {
    await syncLeadStatsFromEmails(email.leadId);
  }

  return email;
};

// ---------------------------------------------------------------------------
// Batch Job Processing — Controlled concurrency + retry
// ---------------------------------------------------------------------------

const BATCH_CONCURRENCY = 3;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

const RETRYABLE_PATTERNS = [
  'rate limit', '429', '500', '503', 'timeout',
  'temporarily', 'overloaded', 'quota', 'ECONNABORTED',
  'ECONNRESET', 'ETIMEDOUT', 'Resource has been exhausted'
];

const isRetryableError = (errorMsg) => {
  if (!errorMsg) return false;
  const lower = errorMsg.toLowerCase();
  return RETRYABLE_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
};

const generateWithRetry = async (prompt) => {
  let lastResult = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      lastResult = await generateAIContent(prompt);
      if (lastResult.success) return lastResult;

      // Non-retryable AI error — fail immediately
      if (!isRetryableError(lastResult.error)) return lastResult;

      // Last attempt — return as-is
      if (attempt === MAX_RETRIES) return lastResult;

      // Exponential backoff before retry
      await new Promise((r) => setTimeout(r, RETRY_BASE_MS * Math.pow(2, attempt - 1)));
    } catch (err) {
      lastResult = { success: false, data: null, error: err.message || 'Unexpected error' };

      if (!isRetryableError(err.message) || attempt === MAX_RETRIES) return lastResult;

      await new Promise((r) => setTimeout(r, RETRY_BASE_MS * Math.pow(2, attempt - 1)));
    }
  }

  return lastResult;
};

/**
 * Runs an array of async tasks with a concurrency limit.
 * Each task is a function returning a promise.
 */
const runWithConcurrency = async (tasks, concurrency) => {
  let idx = 0;
  const worker = async () => {
    while (idx < tasks.length) {
      const i = idx++;
      await tasks[i]();
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker())
  );
};

export const processBatchJobService = async (jobId) => {
  const job = await BatchJob.findById(jobId);
  if (!job) return;

  job.status = 'processing';
  await job.save();

  const user = await User.findById(job.userId);
  if (!user) {
    job.status = 'failed';
    await job.save();
    return;
  }

  let leads;
  try {
    leads = await getLeadsByIdsService({ leadIds: job.leadIds, userId: user._id });
  } catch (err) {
    job.status = 'failed';
    await job.save();
    return;
  }

  const goal = job.purpose || job.instructions;

  // Build a task for each lead
  const tasks = leads.map((lead) => async () => {
    const resultEntry = {
      leadId: lead._id,
      leadName: lead.name,
      leadEmail: lead.email,
      leadCompany: lead.company,
      success: false,
      emailId: null,
      generatedEmail: null,
      error: null
    };

    try {
      const prompt = BATCH_EMAIL_GENERATION_PROMPT(lead, {
        instructions: job.instructions,
        purpose: goal,
        tone: job.tone
      });

      const aiResponse = await generateWithRetry(prompt);

      if (!aiResponse.success) {
        resultEntry.error = aiResponse.error || 'AI generation failed';
      } else {
        const email = await Email.create({
          prompt: goal || `Batch outreach email for ${lead.name}`,
          generatedEmail: aiResponse.data,
          userId: user._id,
          leadId: lead._id,
          sendStatus: 'generated',
          sentAt: null
        });

        await syncLeadStatsFromEmails(lead._id);

        resultEntry.success = true;
        resultEntry.emailId = email._id;
        resultEntry.generatedEmail = aiResponse.data;
      }
    } catch (err) {
      resultEntry.error = err.message || 'Unexpected error during generation';
    }

    // Atomic update — safe for concurrent workers
    await BatchJob.updateOne(
      { _id: jobId },
      {
        $push: { results: resultEntry },
        $inc: {
          processedLeads: 1,
          successCount: resultEntry.success ? 1 : 0,
          failureCount: resultEntry.success ? 0 : 1
        }
      }
    );
  });

  // Run with controlled concurrency
  await runWithConcurrency(tasks, BATCH_CONCURRENCY);

  // Set final status
  const finalJob = await BatchJob.findById(jobId);
  if (finalJob.failureCount > 0 && finalJob.successCount > 0) {
    finalJob.status = 'completed_with_errors';
  } else if (finalJob.failureCount > 0 && finalJob.successCount === 0) {
    finalJob.status = 'failed';
  } else {
    finalJob.status = 'completed';
  }
  await finalJob.save();
};

export const createBatchJobService = async ({
  leadIds,
  instructions = '',
  purpose = '',
  tone = 'professional',
  user
}) => {
  const now = new Date();

  const leads = await getLeadsByIdsService({ leadIds, userId: user._id });
  if (leads.length === 0) {
    throw new ApiError(400, "No valid leads found");
  }

  // Plan-based batch size limit
  const planConfig = getPlanConfigForUser(user);
  const maxBatchSize = planConfig?.limits?.maxBatchSize ?? null;
  if (maxBatchSize && leads.length > maxBatchSize) {
    throw new ApiError(
      403,
      `Your ${planConfig.name} allows up to ${maxBatchSize} leads per batch. You selected ${leads.length}. Please select fewer leads or upgrade your plan.`
    );
  }

  await checkBatchLimit(user, now, leads.length);

  const job = await BatchJob.create({
    userId: user._id,
    leadIds,
    instructions,
    purpose,
    tone,
    totalLeads: leads.length,
    status: 'pending'
  });

  processBatchJobService(job._id).catch((err) => {
    console.error(`Error in batch job ${job._id}:`, err);
  });

  return job;
};

export const getBatchJobStatusService = async ({ jobId, userId }) => {
  const job = await BatchJob.findOne({ _id: jobId, userId });
  if (!job) {
    throw new ApiError(404, "Batch job not found");
  }
  return job;
};

export const getBatchJobsService = async ({ userId }) => {
  return await BatchJob.find({ userId })
    .select("_id status totalLeads processedLeads successCount failureCount tone purpose createdAt")
    .sort({ createdAt: -1 })
    .lean();
};
