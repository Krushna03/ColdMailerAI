import { Activity, ActivityType } from "../models/Activity.model.js";

export interface LogActivityParams {
  userId: any;
  workspaceId?: any;
  performedBy?: any;
  leadId: any;
  type: ActivityType | string;
  title: string;
  metadata?: Record<string, any>;
}

export const logActivity = async ({
  userId,
  workspaceId,
  performedBy,
  leadId,
  type,
  title,
  metadata = {}
}: LogActivityParams) => {
  if (!userId || !leadId || !type || !title) return null;
  try {
    const activity = await Activity.create({
      userId,
      workspaceId: workspaceId || null,
      performedBy: performedBy || userId,
      leadId,
      type,
      title,
      metadata
    });
    return activity;
  } catch (err) {
    console.error("Failed to log activity:", err);
    return null;
  }
};

export interface GetLeadActivitiesParams {
  leadId: any;
  userId: any;
  limit?: number;
  page?: number;
}

export const getLeadActivitiesService = async ({
  leadId,
  userId,
  limit = 50,
  page = 0
}: GetLeadActivitiesParams) => {
  const activities = await Activity.find({ leadId, userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(page * limit)
    .lean();

  return activities;
};
