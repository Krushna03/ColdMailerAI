import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createSegmentService,
  listSegmentsService,
  getSegmentByIdService,
  getSegmentLeadsService,
  previewSegmentService,
  updateSegmentService,
  deleteSegmentService
} from "../services/segment.service.js";
import {
  validateCreateSegment,
  validateUpdateSegment,
  validatePreviewSegment
} from "../validators/segment.validators.js";
import {
  validateUserAuth,
  validatePagination
} from "../validators/email.validators.js";


// Create a new dynamic segment
// POST /api/v1/segments
export const createSegment = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const data = validateCreateSegment(req.body, res);
  if (!data) return;

  const segment = await createSegmentService({
    data,
    userId: req.user._id,
    workspaceId: req.workspaceId
  });

  return res.status(201).json({
    success: true,
    segment,
    message: "Segment created successfully"
  });
});


// List all segments with live lead count
// GET /api/v1/segments
export const listSegments = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const segments = await listSegmentsService({
    userId: req.user._id,
    workspaceId: req.workspaceId
  });

  return res.status(200).json({
    success: true,
    segments,
    message: "Segments fetched successfully"
  });
});


// Get segment by ID with live lead count
// GET /api/v1/segments/:segmentId
export const getSegmentById = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const segment = await getSegmentByIdService({
    segmentId: req.params.segmentId,
    userId: req.user._id,
    workspaceId: req.workspaceId
  });

  return res.status(200).json({
    success: true,
    segment,
    message: "Segment fetched successfully"
  });
});


// Get dynamic leads matching this segment
// GET /api/v1/segments/:segmentId/leads
export const getSegmentLeads = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const { limit = 20, page = 0 } = req.query;
  const pagination = validatePagination(limit, page, res);
  if (!pagination) return;

  const result = await getSegmentLeadsService({
    segmentId: req.params.segmentId,
    userId: req.user._id,
    workspaceId: req.workspaceId,
    limit: pagination.limit,
    page: pagination.page
  });

  return res.status(200).json({
    success: true,
    ...result,
    message: "Segment leads fetched successfully"
  });
});


// Preview segment filter results without saving
// POST /api/v1/segments/preview
export const previewSegment = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const data = validatePreviewSegment(req.body, res);
  if (!data) return;

  const result = await previewSegmentService({
    filters: data.filters,
    limit: data.limit,
    userId: req.user._id,
    workspaceId: req.workspaceId
  });

  return res.status(200).json({
    success: true,
    ...result,
    message: "Segment preview calculated"
  });
});


// Update a segment
// PATCH /api/v1/segments/:segmentId
export const updateSegment = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  const updates = validateUpdateSegment(req.body, res);
  if (!updates) return;

  const segment = await updateSegmentService({
    segmentId: req.params.segmentId,
    updates,
    userId: req.user._id,
    workspaceId: req.workspaceId
  });

  return res.status(200).json({
    success: true,
    segment,
    message: "Segment updated successfully"
  });
});


// Delete a segment
// DELETE /api/v1/segments/:segmentId
export const deleteSegment = asyncHandler(async (req, res) => {
  if (!validateUserAuth(req.user, res)) return;

  await deleteSegmentService({
    segmentId: req.params.segmentId,
    userId: req.user._id,
    workspaceId: req.workspaceId
  });

  return res.status(200).json({
    success: true,
    message: "Segment deleted successfully"
  });
});