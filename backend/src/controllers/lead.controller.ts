import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createLeadService,
  bulkCreateLeadsService,
  getUserLeadsService,
  getLeadByIdService,
  updateLeadService,
  addFollowUpService,
  updateFollowUpService,
  deleteFollowUpService,
  deleteLeadService,
  bulkDeleteLeadsService,
  getWorkspaceTagsService,
  bulkTagLeadsService
} from "../services/lead.service.js";
import {
  validateUserAuth,
  validatePagination
} from "../validators/email.validators.js";
import {
  validateLeadInput,
  validateLeadUpdate,
  validateBulkLeads,
  validateImportLeads,
  validateLeadDeletion,
  validateBulkLeadDeletion,
  validateFollowUpCreate,
  validateFollowUpUpdate,
  validateBulkTagInput
} from "../validators/lead.validators.js";

// Create a single lead
// POST /api/v1/lead/create
const createLead = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const leadData = validateLeadInput(req.body, res);
  if (!leadData) return;

  const lead = await createLeadService({
    leadData,
    userId: req.user._id,
    workspaceId: req.workspaceId
  });

  return res.status(201).json({
    success: true,
    lead,
    message: "Lead created successfully"
  });
});


// Bulk-create leads, e.g. from a CSV parsed on the frontend
// POST /api/v1/lead/bulk-create
const bulkCreateLeads = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const leads = validateBulkLeads(req.body.leads, res);
  if (!leads) return;

  const result = await bulkCreateLeadsService({
    leads,
    userId: req.user._id,
    workspaceId: req.workspaceId
  });

  return res.status(201).json({
    success: true,
    leads: result.leads,
    totalReceived: result.totalReceived,
    insertedCount: result.insertedCount,
    duplicateCount: result.duplicateCount,
    count: result.insertedCount,
    message: `${result.insertedCount} lead(s) added successfully`
  });
});


import {
  createImportJobService,
  getImportJobStatusService,
  listImportJobsService,
  verifySingleLeadService
} from "../services/importJob.service.js";

// Get the current user's leads, paginated
// GET /api/v1/lead/get-user-leads
const getUserLeads = asyncHandler(async (req, res) => {
  const { limit = 20, page = 0, status, overdueOnly, categoryId, search, tags, segmentId, verificationStatus } = req.query;

  if (!validateUserAuth(req.user, res)) return;

  const pagination = validatePagination(limit, page, res);
  if (!pagination) return;

  const { leads, total, hasMore } = await getUserLeadsService({
    userId: req.user._id,
    workspaceId: req.workspaceId,
    limit: pagination.limit,
    page: pagination.page,
    status: status || undefined,
    categoryId: categoryId || undefined,
    overdueOnly: overdueOnly === "true" || (overdueOnly as any) === true,
    search: typeof search === "string" ? search.trim() : undefined,
    tags: tags || undefined,
    segmentId: typeof segmentId === "string" ? segmentId.trim() : undefined,
    verificationStatus: typeof verificationStatus === "string" ? verificationStatus.trim() : undefined
  });

  return res.status(200).json({
    success: true,
    leads,
    total,
    hasMore,
    message: "Leads fetched successfully"
  });
});


// Get a single lead with emails + stats
// GET /api/v1/lead/:leadId
const getLeadById = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const result = await getLeadByIdService({
    leadId: req.params.leadId,
    userId: req.user._id,
    workspaceId: req.workspaceId
  });

  return res.status(200).json({
    success: true,
    ...result,
    message: "Lead fetched successfully"
  });
});


// Update lead profile / status
// PATCH /api/v1/lead/:leadId
const updateLead = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const updates = validateLeadUpdate(req.body, res);
  if (!updates) return;

  const lead = await updateLeadService({
    leadId: req.params.leadId,
    userId: req.user._id,
    workspaceId: req.workspaceId,
    updates
  });

  return res.status(200).json({
    success: true,
    lead,
    message: "Lead updated successfully"
  });
});


// Add a follow-up reminder
// POST /api/v1/lead/:leadId/follow-ups
const addFollowUp = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const data = validateFollowUpCreate(req.body, res);
  if (!data) return;

  const lead = await addFollowUpService({
    leadId: req.params.leadId,
    userId: req.user._id,
    workspaceId: req.workspaceId,
    dueAt: data.dueAt,
    note: data.note
  });

  return res.status(201).json({
    success: true,
    lead,
    message: "Follow-up scheduled"
  });
});


// Update a follow-up
// PATCH /api/v1/lead/:leadId/follow-ups/:followUpId
const updateFollowUp = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const updates = validateFollowUpUpdate(req.body, res);
  if (!updates) return;

  const lead = await updateFollowUpService({
    leadId: req.params.leadId,
    followUpId: req.params.followUpId,
    userId: req.user._id,
    workspaceId: req.workspaceId,
    updates
  });

  return res.status(200).json({
    success: true,
    lead,
    message: "Follow-up updated"
  });
});


// Delete a follow-up
// DELETE /api/v1/lead/:leadId/follow-ups/:followUpId
const deleteFollowUp = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const lead = await deleteFollowUpService({
    leadId: req.params.leadId,
    followUpId: req.params.followUpId,
    userId: req.user._id,
    workspaceId: req.workspaceId
  });

  return res.status(200).json({
    success: true,
    lead,
    message: "Follow-up removed"
  });
});


// Delete a lead
// DELETE /api/v1/lead/delete-lead
const deleteLead = asyncHandler(async (req, res) => {
  const { leadId } = req.body;

  if (!validateUserAuth(req.user, res)) return;
  if (!validateLeadDeletion(leadId, res)) return;

  await deleteLeadService({
    leadId,
    userId: req.user._id,
    workspaceId: req.workspaceId
  });

  return res.status(200).json({
    success: true,
    message: "Lead deleted successfully"
  });
});


// Delete multiple leads
// DELETE /api/v1/lead/bulk-delete
const bulkDeleteLeads = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const leadIds = validateBulkLeadDeletion(req.body, res);
  if (!leadIds) return;

  const result = await bulkDeleteLeadsService({
    leadIds,
    userId: req.user._id,
    workspaceId: req.workspaceId
  });

  return res.status(200).json({
    success: true,
    deletedCount: result.deletedCount,
    message: `${result.deletedCount} lead${result.deletedCount === 1 ? "" : "s"} deleted`
  });
});


// Get all distinct tags across workspace/user leads
// GET /api/v1/lead/tags
const getWorkspaceTags = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const tags = await getWorkspaceTagsService({
    userId: req.user._id,
    workspaceId: req.workspaceId
  });

  return res.status(200).json({
    success: true,
    tags,
    message: "Tags fetched successfully"
  });
});


// Bulk tag or untag leads
// POST /api/v1/lead/bulk-tag
const bulkTagLeads = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const data = validateBulkTagInput(req.body, res);
  if (!data) return;

  const result = await bulkTagLeadsService({
    leadIds: data.leadIds,
    tags: data.tags,
    action: data.action,
    userId: req.user._id,
    workspaceId: req.workspaceId
  });

  return res.status(200).json({
    success: true,
    ...result,
    message: `Tags successfully ${data.action === "remove" ? "removed from" : "added to"} ${result.modifiedCount} lead(s)`
  });
});

/**
 * Start an asynchronous CSV import & verification job
 * POST /api/v1/lead/import-job
 */
const createImportJob = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const leads = validateImportLeads(req.body.leads, res);
  if (!leads) return;

  const job = await createImportJobService({
    userId: req.user._id,
    workspaceId: req.workspaceId,
    leads,
    categoryId: req.body.categoryId,
    fileName: req.body.fileName,
    fileSize: req.body.fileSize,
    verifyEmails: req.body.verifyEmails !== false
  });

  return res.status(201).json({
    success: true,
    job,
    jobId: job._id,
    totalRows: job.totalRows,
    status: job.status,
    message: "Import and email verification job started"
  });
});

/**
 * Get status of an ImportJob
 * GET /api/v1/lead/import-jobs/:jobId
 */
const getImportJobStatus = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const job = await getImportJobStatusService({
    jobId: req.params.jobId,
    userId: req.user._id,
    workspaceId: req.workspaceId
  });

  return res.status(200).json({
    success: true,
    job,
    message: "Import job status retrieved"
  });
});

/**
 * List recent import jobs
 * GET /api/v1/lead/import-jobs
 */
const listImportJobs = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const { limit = 20, page = 0 } = req.query;
  const result = await listImportJobsService({
    userId: req.user._id,
    workspaceId: req.workspaceId,
    limit: Number(limit),
    page: Number(page)
  });

  return res.status(200).json({
    success: true,
    ...result,
    message: "Import jobs retrieved successfully"
  });
});

/**
 * Verify a single lead's email on-demand
 * POST /api/v1/lead/:leadId/verify-email
 */
const verifyLeadEmail = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const lead = await verifySingleLeadService({
    leadId: req.params.leadId,
    userId: req.user._id,
    workspaceId: req.workspaceId
  });

  return res.status(200).json({
    success: true,
    lead,
    verification: lead.emailVerification,
    emailVerification: lead.emailVerification,
    message: `Email verified: ${lead.emailVerification?.status?.toUpperCase()} (${lead.emailVerification?.score}/100)`
  });
});

export {
  createLead,
  bulkCreateLeads,
  getUserLeads,
  getLeadById,
  updateLead,
  addFollowUp,
  updateFollowUp,
  deleteFollowUp,
  deleteLead,
  bulkDeleteLeads,
  getWorkspaceTags,
  bulkTagLeads,
  createImportJob,
  getImportJobStatus,
  listImportJobs,
  verifyLeadEmail
};
