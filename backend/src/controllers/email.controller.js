import { asyncHandler } from "../utils/asyncHandler.js";
import {
  generateEmailService,
  generateBatchEmailsService,
  updateEmailService,
  updateEmailHistoryService,
  getUserEmailHistoryService,
  getUsageSummaryService,
  deleteEmailService,
  getEmailByIdService,
  markEmailSentService,
  unmarkEmailSentService,
  createBatchJobService,
  getBatchJobStatusService,
  getBatchJobsService,
  deleteBatchJobService
} from "../services/email.service.js";
import {
  validateUserAuth,
  validateEmailPrompt,
  validateEmailUpdate,
  validateEmailHistoryUpdate,
  validateEmailDeletion,
  validatePagination
} from "../validators/email.validators.js";
import { validateBatchGeneration } from "../validators/lead.validators.js";

/**
 * Generate a new email
 * POST /api/v1/email/generate-email
 */
const generateEmail = asyncHandler(async (req, res) => {
  const { prompt } = req.body;
  const images = req.files || (req.file ? [req.file] : []);

  if (!validateUserAuth(req.user, res)) return;
  if (!validateEmailPrompt(prompt, res)) return;

  const result = await generateEmailService({
    prompt,
    user: req.user,
    images
  });

  return res.status(200).json({
    success: true,
    fullEmail: result.fullEmail,
    emailId: result.emailId,
    usage: result.usage
  });
});

/**
 * Generate one personalized email per lead in a single request
 * POST /api/v1/email/generate-batch
 */
const generateBatchEmails = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const validated = validateBatchGeneration(req.body, res);
  if (!validated) return;

  const { leadIds, instructions, purpose, tone } = validated;

  const result = await generateBatchEmailsService({
    leadIds,
    instructions,
    purpose,
    tone,
    user: req.user
  });

  return res.status(200).json({
    success: true,
    results: result.results,
    successCount: result.successCount,
    failureCount: result.failureCount,
    usage: result.usage,
    message: `Generated ${result.successCount} of ${result.results.length} emails`
  });
});

/**
 * Update an existing email
 */
const updateEmail = asyncHandler(async (req, res) => {
  const { baseEmail, modifications, emailId } = req.body;
  const images = req.files || (req.file ? [req.file] : []);

  if (!validateUserAuth(req.user, res)) return;
  if (!validateEmailUpdate({ emailId, baseEmail, modifications }, res)) return;

  const updatedEmail = await updateEmailService({
    emailId,
    baseEmail,
    modifications,
    user: req.user,
    images
  });

  return res.status(200).json({
    success: true,
    updatedEmail
  });
});

/**
 * Get user email history with pagination
 * GET /api/v1/email/history
 */
const getUserEmailHistory = asyncHandler(async (req, res) => {
  const { limit = 10, page = 0 } = req.query;
  const userId = req.user?._id;

  if (!validateUserAuth(req.user, res)) return;

  const pagination = validatePagination(limit, page, res);

  if (!pagination) return;

  const { page: validatedPage, limit: validatedLimit } = pagination;

  const { emails, hasMore } = await getUserEmailHistoryService({
    userId,
    limit: validatedLimit,
    page: validatedPage
  });

  if (!emails || emails.length === 0) {
    return res.status(200).json({
      success: true,
      emails: [],
      hasMore: false,
      message: "No emails found"
    });
  }

  return res.status(200).json({
    success: true,
    emails,
    hasMore,
    message: "Emails fetched successfully"
  });
});

/**
 * Update email history with iterative refinement
 * POST /api/v1/email/update-history
 */
const updateEmailHistory = asyncHandler(async (req, res) => {
  const { emailId, modification } = req.body;
  const images = req.files || (req.file ? [req.file] : []);

  if (!validateUserAuth(req.user, res)) return;
  if (!validateEmailHistoryUpdate({ emailId, modification }, res)) return;

  const updatedEmail = await updateEmailHistoryService({
    emailId,
    modification,
    user: req.user,
    images
  });

  return res.status(200).json({
    success: true,
    updatedEmail,
    message: "Email history updated successfully"
  });
});

/**
 * Get usage summary for the current user
 * GET /api/v1/email/usage-summary
 */
const getUsageSummary = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const usageSummary = await getUsageSummaryService(req.user);

  return res.status(200).json({
    success: true,
    message: "Usage summary retrieved successfully",
    data: usageSummary
  });
});

/**
 * Delete an email
 * DELETE /api/v1/email/delete-email
 */
const deleteEmail = asyncHandler(async (req, res) => {
  const { emailId } = req.body;

  if (!validateUserAuth(req.user, res)) return;
  if (!validateEmailDeletion(emailId, res)) return;

  await deleteEmailService({
    emailId,
    userId: req.user._id
  });

  return res.status(200).json({
    success: true,
    message: "Email deleted successfully"
  });
});

/**
 * Get a single email by ID (owner-scoped)
 * GET /api/v1/email/:id
 */
const getEmailById = asyncHandler(async (req, res) => {
  const { id: emailId } = req.params;

  if (!validateUserAuth(req.user, res)) return;
  if (!validateEmailDeletion(emailId, res)) return;

  const email = await getEmailByIdService({
    emailId,
    userId: req.user._id
  });

  return res.status(200).json({
    success: true,
    email,
    message: "Email fetched successfully"
  });
});

/**
 * Manually mark an email as sent
 * PATCH /api/v1/email/:id/mark-sent
 */
const markEmailSent = asyncHandler(async (req, res) => {
  const { id: emailId } = req.params;

  if (!validateUserAuth(req.user, res)) return;
  if (!validateEmailDeletion(emailId, res)) return;

  const email = await markEmailSentService({
    emailId,
    userId: req.user._id
  });

  return res.status(200).json({
    success: true,
    email,
    message: "Email marked as sent"
  });
});

/**
 * Undo manual mark-as-sent
 * PATCH /api/v1/email/:id/unmark-sent
 */
const unmarkEmailSent = asyncHandler(async (req, res) => {
  const { id: emailId } = req.params;

  if (!validateUserAuth(req.user, res)) return;
  if (!validateEmailDeletion(emailId, res)) return;

  const email = await unmarkEmailSentService({
    emailId,
    userId: req.user._id
  });

  return res.status(200).json({
    success: true,
    email,
    message: "Email unmarked as sent"
  });
});

/**
 * Start a batch email generation job
 * POST /api/v1/email/batch-jobs
 */
const startBatchJob = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const validated = validateBatchGeneration(req.body, res);
  if (!validated) return;

  const { leadIds, instructions, purpose, tone } = validated;

  const job = await createBatchJobService({
    leadIds,
    instructions,
    purpose,
    tone,
    user: req.user
  });

  return res.status(201).json({
    success: true,
    jobId: job._id,
    totalLeads: job.totalLeads,
    message: "Batch generation started"
  });
});

/**
 * Get status of a batch email generation job
 * GET /api/v1/email/batch-jobs/:jobId
 */
const getBatchJobStatus = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const { jobId } = req.params;
  if (!jobId) {
    return res.status(400).json({
      success: false,
      message: "Job ID is required"
    });
  }

  const job = await getBatchJobStatusService({
    jobId,
    userId: req.user._id
  });

  return res.status(200).json({
    success: true,
    job
  });
});

const getBatchJobs = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const { limit, page } = req.query;

  let limitNum, pageNum;
  if (limit !== undefined || page !== undefined) {
    const pagination = validatePagination(limit ?? 15, page ?? 0, res);
    if (!pagination) return;
    limitNum = pagination.limit;
    pageNum = pagination.page;
  }

  const { jobs, hasMore } = await getBatchJobsService({
    userId: req.user._id,
    limit: limitNum,
    page: pageNum
  });

  return res.status(200).json({
    success: true,
    jobs,
    hasMore: hasMore ?? false
  });
});


/**
 * Cancel and/or delete a batch email generation job
 * DELETE /api/v1/email/batch-jobs/:jobId
 */
const deleteBatchJob = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const { jobId } = req.params;
  if (!jobId) {
    return res.status(400).json({
      success: false,
      message: "Job ID is required"
    });
  }

  await deleteBatchJobService({
    jobId,
    userId: req.user._id
  });

  return res.status(200).json({
    success: true,
    message: "Batch job deleted successfully"
  });
});

export {
  generateEmail,
  generateBatchEmails,
  updateEmail,
  getUserEmailHistory,
  updateEmailHistory,
  deleteEmail,
  getUsageSummary,
  getEmailById,
  markEmailSent,
  unmarkEmailSent,
  startBatchJob,
  getBatchJobStatus,
  getBatchJobs,
  deleteBatchJob
};
