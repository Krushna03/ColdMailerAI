import mongoose from "mongoose";
import { Segment } from "../models/Segment.model.js";
import { Lead } from "../models/Lead.model.js";
import { FollowUp } from "../models/FollowUp.model.js";
import { segmentRepository } from "../repositories/segment.repository.js";
import { buildMongoQueryFromSegment } from "../utils/segmentQueryBuilder.js";
import { ApiError } from "../utils/ApiError.js";

const isValidObjectId = (id: any): boolean => mongoose.Types.ObjectId.isValid(id);

export interface SegmentServiceParams {
  userId: any;
  workspaceId?: any;
}

export const createSegmentService = async ({
  data,
  userId,
  workspaceId
}: {
  data: any;
  userId: any;
  workspaceId?: any;
}) => {
  const effectiveWorkspaceId = workspaceId || null;

  const segment = await Segment.create({
    ...data,
    userId,
    workspaceId: effectiveWorkspaceId,
    createdBy: userId,
    updatedBy: userId
  });

  const query = buildMongoQueryFromSegment(segment.filters, {
    workspaceId: effectiveWorkspaceId,
    userId
  });
  const leadCount = await Lead.countDocuments(query);

  const segmentObj: any = segment.toObject();
  segmentObj.leadCount = leadCount;
  return segmentObj;
};

export const listSegmentsService = async ({ userId, workspaceId }: SegmentServiceParams) => {
  const segments = await segmentRepository.listScopedSegments({ userId, workspaceId });

  // Dynamically calculate matching lead counts in parallel
  const enriched = await Promise.all(
    segments.map(async (segment: any) => {
      const query = buildMongoQueryFromSegment(segment.filters, { workspaceId, userId });
      const leadCount = await Lead.countDocuments(query);
      return {
        ...segment,
        leadCount
      };
    })
  );

  return enriched;
};

export const getSegmentByIdService = async ({
  segmentId,
  userId,
  workspaceId
}: {
  segmentId: any;
  userId: any;
  workspaceId?: any;
}) => {
  if (!isValidObjectId(segmentId)) {
    throw new ApiError(400, "Invalid segment ID");
  }

  const segment = await segmentRepository.findScopedSegment({ segmentId, userId, workspaceId });
  if (!segment) {
    throw new ApiError(404, "Segment not found");
  }

  const query = buildMongoQueryFromSegment(segment.filters, { workspaceId, userId });
  const leadCount = await Lead.countDocuments(query);

  return {
    ...segment,
    leadCount
  };
};

export interface GetSegmentLeadsParams {
  segmentId: any;
  userId: any;
  workspaceId?: any;
  limit?: number;
  page?: number;
}

export const getSegmentLeadsService = async ({
  segmentId,
  userId,
  workspaceId,
  limit = 20,
  page = 0
}: GetSegmentLeadsParams) => {
  if (!isValidObjectId(segmentId)) {
    throw new ApiError(400, "Invalid segment ID");
  }

  const segment = await segmentRepository.findScopedSegment({ segmentId, userId, workspaceId });
  if (!segment) {
    throw new ApiError(404, "Segment not found");
  }

  const query = buildMongoQueryFromSegment(segment.filters, { workspaceId, userId });
  const skip = page * limit;

  const [leads, total] = await Promise.all([
    Lead.find(query)
      .populate("categoryId", "name slug description isDefault")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean(),
    Lead.countDocuments(query)
  ]);

  const leadIds = leads.map((l: any) => l._id);
  const allFollowUps = await FollowUp.find({ leadId: { $in: leadIds } })
    .sort({ dueAt: 1 })
    .lean();

  const followUpsByLead: Record<string, any[]> = {};
  for (const f of allFollowUps) {
    const lid = String(f.leadId);
    if (!followUpsByLead[lid]) followUpsByLead[lid] = [];
    followUpsByLead[lid].push(f);
  }

  const enrichedLeads = leads.map((l: any) => ({
    ...l,
    followUps: followUpsByLead[String(l._id)] || []
  }));

  return {
    segment,
    leads: enrichedLeads,
    total,
    hasMore: skip + enrichedLeads.length < total
  };
};

export interface PreviewSegmentParams {
  filters: any;
  userId: any;
  workspaceId?: any;
  limit?: number;
}

export const previewSegmentService = async ({
  filters,
  userId,
  workspaceId,
  limit = 5
}: PreviewSegmentParams) => {
  const query = buildMongoQueryFromSegment(filters, { workspaceId, userId });

  const [totalMatching, sampleLeads] = await Promise.all([
    Lead.countDocuments(query),
    Lead.find(query)
      .populate("categoryId", "name slug description isDefault")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
  ]);

  return {
    totalMatching,
    sampleLeads
  };
};

export interface UpdateSegmentParams {
  segmentId: any;
  updates: any;
  userId: any;
  workspaceId?: any;
}

export const updateSegmentService = async ({
  segmentId,
  updates,
  userId,
  workspaceId
}: UpdateSegmentParams) => {
  if (!isValidObjectId(segmentId)) {
    throw new ApiError(400, "Invalid segment ID");
  }

  const scope = segmentRepository.buildScopeFilter({ workspaceId, userId });
  const segment = await Segment.findOne({ _id: segmentId, ...scope });
  if (!segment) {
    throw new ApiError(404, "Segment not found");
  }

  if (updates.name !== undefined) segment.name = updates.name;
  if (updates.description !== undefined) segment.description = updates.description;
  if (updates.color !== undefined) segment.color = updates.color;
  if (updates.icon !== undefined) segment.icon = updates.icon;
  if (updates.isStarred !== undefined) segment.isStarred = updates.isStarred;
  if (updates.filters !== undefined) {
    segment.filters = {
      ...(segment.filters || {}),
      ...updates.filters
    };
    segment.markModified("filters");
  }

  segment.updatedBy = userId;
  await segment.save();

  const query = buildMongoQueryFromSegment(segment.filters, { workspaceId, userId });
  const leadCount = await Lead.countDocuments(query);

  const segmentObj: any = segment.toObject();
  segmentObj.leadCount = leadCount;
  return segmentObj;
};

export const deleteSegmentService = async ({
  segmentId,
  userId,
  workspaceId
}: {
  segmentId: any;
  userId: any;
  workspaceId?: any;
}) => {
  if (!isValidObjectId(segmentId)) {
    throw new ApiError(400, "Invalid segment ID");
  }

  const scope = segmentRepository.buildScopeFilter({ workspaceId, userId });
  const deleted = await Segment.findOneAndDelete({ _id: segmentId, ...scope });
  if (!deleted) {
    throw new ApiError(404, "Segment not found or already deleted");
  }

  return { success: true };
};
