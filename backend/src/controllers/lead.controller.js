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
  bulkDeleteLeadsService
} from "../services/lead.service.js";
import {
  validateUserAuth,
  validatePagination
} from "../validators/email.validators.js";
import {
  validateLeadInput,
  validateLeadUpdate,
  validateBulkLeads,
  validateLeadDeletion,
  validateBulkLeadDeletion,
  validateFollowUpCreate,
  validateFollowUpUpdate
} from "../validators/lead.validators.js";

/**
 * Create a single lead
 * POST /api/v1/lead/create
 */
const createLead = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const leadData = validateLeadInput(req.body, res);
  if (!leadData) return;

  const lead = await createLeadService({ leadData, userId: req.user._id });

  return res.status(201).json({
    success: true,
    lead,
    message: "Lead created successfully"
  });
});

/**
 * Bulk-create leads, e.g. from a CSV parsed on the frontend
 * POST /api/v1/lead/bulk-create
 */
const bulkCreateLeads = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const leads = validateBulkLeads(req.body.leads, res);
  if (!leads) return;

  const result = await bulkCreateLeadsService({
    leads,
    userId: req.user._id
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

/**
 * Get the current user's leads, paginated
 * GET /api/v1/lead/get-user-leads
 */
const getUserLeads = asyncHandler(async (req, res) => {
  const { limit = 20, page = 0, status, overdueOnly, categoryId, search } = req.query;

  if (!validateUserAuth(req.user, res)) return;

  const pagination = validatePagination(limit, page, res);
  if (!pagination) return;

  const { leads, total, hasMore } = await getUserLeadsService({
    userId: req.user._id,
    limit: pagination.limit,
    page: pagination.page,
    status: status || undefined,
    categoryId: categoryId || undefined,
    overdueOnly: overdueOnly === "true" || overdueOnly === true,
    search: typeof search === "string" ? search.trim() : undefined
  });

  return res.status(200).json({
    success: true,
    leads,
    total,
    hasMore,
    message: "Leads fetched successfully"
  });
});

/**
 * Get a single lead with emails + stats
 * GET /api/v1/lead/:leadId
 */
const getLeadById = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const result = await getLeadByIdService({
    leadId: req.params.leadId,
    userId: req.user._id
  });

  return res.status(200).json({
    success: true,
    ...result,
    message: "Lead fetched successfully"
  });
});

/**
 * Update lead profile / status
 * PATCH /api/v1/lead/:leadId
 */
const updateLead = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const updates = validateLeadUpdate(req.body, res);
  if (!updates) return;

  const lead = await updateLeadService({
    leadId: req.params.leadId,
    userId: req.user._id,
    updates
  });

  return res.status(200).json({
    success: true,
    lead,
    message: "Lead updated successfully"
  });
});

/**
 * Add a follow-up reminder
 * POST /api/v1/lead/:leadId/follow-ups
 */
const addFollowUp = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const data = validateFollowUpCreate(req.body, res);
  if (!data) return;

  const lead = await addFollowUpService({
    leadId: req.params.leadId,
    userId: req.user._id,
    dueAt: data.dueAt,
    note: data.note
  });

  return res.status(201).json({
    success: true,
    lead,
    message: "Follow-up scheduled"
  });
});

/**
 * Update a follow-up
 * PATCH /api/v1/lead/:leadId/follow-ups/:followUpId
 */
const updateFollowUp = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const updates = validateFollowUpUpdate(req.body, res);
  if (!updates) return;

  const lead = await updateFollowUpService({
    leadId: req.params.leadId,
    followUpId: req.params.followUpId,
    userId: req.user._id,
    updates
  });

  return res.status(200).json({
    success: true,
    lead,
    message: "Follow-up updated"
  });
});

/**
 * Delete a follow-up
 * DELETE /api/v1/lead/:leadId/follow-ups/:followUpId
 */
const deleteFollowUp = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const lead = await deleteFollowUpService({
    leadId: req.params.leadId,
    followUpId: req.params.followUpId,
    userId: req.user._id
  });

  return res.status(200).json({
    success: true,
    lead,
    message: "Follow-up removed"
  });
});

/**
 * Delete a lead
 * DELETE /api/v1/lead/delete-lead
 */
const deleteLead = asyncHandler(async (req, res) => {
  const { leadId } = req.body;

  if (!validateUserAuth(req.user, res)) return;
  if (!validateLeadDeletion(leadId, res)) return;

  await deleteLeadService({ leadId, userId: req.user._id });

  return res.status(200).json({
    success: true,
    message: "Lead deleted successfully"
  });
});

/**
 * Delete multiple leads
 * DELETE /api/v1/lead/bulk-delete
 */
const bulkDeleteLeads = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const leadIds = validateBulkLeadDeletion(req.body, res);
  if (!leadIds) return;

  const result = await bulkDeleteLeadsService({
    leadIds,
    userId: req.user._id
  });

  return res.status(200).json({
    success: true,
    deletedCount: result.deletedCount,
    message: `${result.deletedCount} lead${result.deletedCount === 1 ? "" : "s"} deleted`
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
  bulkDeleteLeads
};
