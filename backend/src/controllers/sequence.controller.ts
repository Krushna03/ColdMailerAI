import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import {
  createSequenceSchema,
  updateSequenceSchema,
  saveStepsSchema,
  enrollLeadsSchema,
  updateEnrollmentStatusSchema,
} from "../validators/sequence.validators.js";
import {
  createSequenceService,
  getSequenceByIdService,
  listSequencesService,
  updateSequenceService,
  updateSequenceStatusService,
  deleteSequenceService,
  saveSequenceStepsService,
  recalculateSequenceStatsService,
} from "../services/sequence.service.js";
import {
  enrollLeadsInSequenceService,
  processDueEnrollmentsService,
} from "../services/sequenceExecution.service.js";
import {
  drainSendJobQueue,
  listSendJobsService,
  getSendJobStatsService,
  retrySendJobService,
  cancelPendingSendJobsForEnrollment,
} from "../services/sendJob.service.js";
import { EmailEvent } from "../models/EmailEvent.model.js";
import { SequenceEnrollment } from "../models/SequenceEnrollment.model.js";
import { Types } from "mongoose";

export const createSequence = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  const userId = req.user?._id;

  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context is required");
  }

  const parsed = createSequenceSchema.parse(req.body);
  const sequence = await createSequenceService({
    workspaceId,
    userId,
    data: parsed,
  });

  return res.status(201).json(new ApiResponse(201, sequence, "Sequence created successfully"));
});


export const getSequence = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  const id = String(req.params.id);

  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context is required");
  }

  const sequence = await getSequenceByIdService(id, workspaceId);
  return res.status(200).json(new ApiResponse(200, sequence, "Sequence retrieved successfully"));
});


export const listSequences = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context is required");
  }

  const { status, search, page, limit } = req.query;

  const result = await listSequencesService({
    workspaceId,
    status: status as any,
    search: search ? String(search) : undefined,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
  });

  return res.status(200).json(new ApiResponse(200, result, "Sequences retrieved successfully"));
});


export const updateSequence = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  const id = String(req.params.id);

  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context is required");
  }

  const parsed = updateSequenceSchema.parse(req.body);
  const updated = await updateSequenceService(id, workspaceId, parsed);

  return res.status(200).json(new ApiResponse(200, updated, "Sequence updated successfully"));
});


export const updateSequenceStatus = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  const id = String(req.params.id);
  const { status } = req.body;

  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context is required");
  }

  if (!["draft", "active", "paused", "archived"].includes(status)) {
    throw new ApiError(400, "Invalid sequence status");
  }

  const updated = await updateSequenceStatusService(id, workspaceId, status);
  return res.status(200).json(new ApiResponse(200, updated, `Sequence status set to ${status}`));
});


export const deleteSequence = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  const id = String(req.params.id);

  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context is required");
  }

  const result = await deleteSequenceService(id, workspaceId);
  return res.status(200).json(new ApiResponse(200, result, "Sequence deleted successfully"));
});


export const saveSteps = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  const id = String(req.params.id);

  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context is required");
  }

  const parsed = saveStepsSchema.parse(req.body);
  const steps = await saveSequenceStepsService(id, workspaceId, parsed.steps);

  return res.status(200).json(new ApiResponse(200, { steps }, "Sequence steps updated successfully"));
});


export const enrollLeads = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  const userId = req.user?._id;
  const id = String(req.params.id);

  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context is required");
  }

  const parsed = enrollLeadsSchema.parse(req.body);
  const result = await enrollLeadsInSequenceService({
    sequenceId: id,
    workspaceId,
    userId,
    leadIds: parsed.leadIds,
    segmentId: parsed.segmentId,
    mailboxId: parsed.mailboxId,
  });

  return res.status(200).json(new ApiResponse(200, result, "Enrollment completed"));
});


export const listEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  const id = String(req.params.id);
  const { status, page = "1", limit = "20" } = req.query;

  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context is required");
  }

  const query: any = {
    sequenceId: new Types.ObjectId(id),
    workspaceId: new Types.ObjectId(String(workspaceId)),
  };

  if (status) {
    query.status = status;
  }

  const p = Math.max(1, Number(page));
  const l = Number(limit);
  const skip = (p - 1) * l;

  const [enrollments, total] = await Promise.all([
    SequenceEnrollment.find(query)
      .populate("leadId", "name email company jobTitle status")
      .populate("currentStepId", "order type title")
      .populate("mailboxId", "name email provider")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l),
    SequenceEnrollment.countDocuments(query),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        enrollments,
        pagination: {
          page: p,
          limit: l,
          total,
          pages: Math.ceil(total / l) || 1,
        },
      },
      "Enrollments retrieved successfully"
    )
  );
});


export const updateEnrollmentStatus = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  const id = String(req.params.id);
  const enrollmentId = String(req.params.enrollmentId);

  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context is required");
  }

  const parsed = updateEnrollmentStatusSchema.parse(req.body);

  const enrollment = await SequenceEnrollment.findOne({
    _id: new Types.ObjectId(enrollmentId),
    sequenceId: new Types.ObjectId(id),
    workspaceId: new Types.ObjectId(String(workspaceId)),
  });

  if (!enrollment) {
    throw new ApiError(404, "Enrollment record not found");
  }

  enrollment.status = parsed.status;
  if (parsed.status === "stopped") {
    enrollment.stopReason = (parsed.reason as any) || "manual";
    enrollment.nextRunAt = null;
    await cancelPendingSendJobsForEnrollment(enrollmentId, `Enrollment manually stopped: ${enrollment.stopReason}`);
  } else if (parsed.status === "paused") {
    await cancelPendingSendJobsForEnrollment(enrollmentId, "Enrollment paused");
  } else if (parsed.status === "active" && !enrollment.nextRunAt) {
    enrollment.nextRunAt = new Date();
  }

  await enrollment.save();
  await recalculateSequenceStatsService(id);

  return res.status(200).json(new ApiResponse(200, enrollment, `Enrollment status updated to ${parsed.status}`));
});

export const processNow = asyncHandler(async (_req: Request, res: Response) => {
  const result = await processDueEnrollmentsService(25);
  const sendResults = await drainSendJobQueue(50);
  return res.status(200).json(
    new ApiResponse(
      200,
      { ...result, sendResults },
      "Sequence processing and sending queue cycle complete"
    )
  );
});

export const listSendJobs = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context is required");
  }

  const { status, sequenceId, leadId, page, limit } = req.query;
  const result = await listSendJobsService({
    workspaceId,
    status: typeof status === "string" ? status : undefined,
    sequenceId: typeof sequenceId === "string" ? sequenceId : undefined,
    leadId: typeof leadId === "string" ? leadId : undefined,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
  });

  return res.status(200).json(new ApiResponse(200, result, "Send jobs retrieved successfully"));
});

export const getSendJobStats = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context is required");
  }

  const stats = await getSendJobStatsService(workspaceId);
  return res.status(200).json(new ApiResponse(200, stats, "Sending engine queue statistics retrieved"));
});

export const retrySendJob = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  const id = String(req.params.id);

  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context is required");
  }

  const retriedJob = await retrySendJobService(id, workspaceId);
  return res.status(200).json(new ApiResponse(200, retriedJob, "Send job re-queued for delivery"));
});

export const listEmailEvents = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.workspace?._id;
  if (!workspaceId) {
    throw new ApiError(400, "Active workspace context is required");
  }

  const { type, sequenceId, leadId, page = "1", limit = "30" } = req.query;
  const query: any = { workspaceId: new Types.ObjectId(String(workspaceId)) };

  if (type && type !== "all") query.type = type;
  if (sequenceId) query.sequenceId = new Types.ObjectId(String(sequenceId));
  if (leadId) query.leadId = new Types.ObjectId(String(leadId));

  const p = Math.max(1, Number(page));
  const l = Math.max(1, Math.min(100, Number(limit)));
  const skip = (p - 1) * l;

  const [events, total] = await Promise.all([
    EmailEvent.find(query)
      .populate("leadId", "name email company")
      .populate("sequenceId", "name")
      .populate("mailboxId", "email provider")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(l),
    EmailEvent.countDocuments(query),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        events,
        pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) || 1 },
      },
      "Email lifecycle events retrieved"
    )
  );
});
