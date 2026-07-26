import { Email } from "../models/Email.model.js";
import { ApiError } from "../utils/ApiError.js";
import { buildPlanUsageSummary, getPlanConfigForUser, getMonthlyEmailUsage } from "../utils/planLimits.js";
import { generateAIContent, generateAIContentWithRole } from "./ai.service.js";
import { EMAIL_GENERATION_PROMPT, EMAIL_UPDATE_PROMPT, EMAIL_HISTORY_UPDATE_PROMPT } from "../constants/email.prompts.js";


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
      `Your current plan allows ${maxRegenerations} updates per email. Upgrade to unlock unlimited revisions.`
    );
  }

  return planConfig;
};


export const generateEmailService = async ({ prompt, user }) => {
  const now = new Date();

  const { planConfig, monthlyUsage } = await checkMonthlyLimit(user, now);

  const fullPrompt = EMAIL_GENERATION_PROMPT + prompt;
  const aiResponse = await generateAIContent(fullPrompt);

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


export const updateEmailService = async ({ emailId, baseEmail, modifications, user }) => {
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
  const aiResponse = await generateAIContentWithRole(systemPrompt, 'user');

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
  user
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
  const aiResponse = await generateAIContent(systemPrompt);

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

  return { success: true };
};

