import { Activity } from "../models/Activity.model.js";

export const logActivity = async ({ userId, workspaceId, performedBy, leadId, type, title, metadata = {} }) => {
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

export const getLeadActivitiesService = async ({ leadId, userId, limit = 50, page = 0 }) => {
  const activities = await Activity.find({ leadId, userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(page * limit)
    .lean();

  return activities;
};
