import { Types } from "mongoose";
import {
  Notification,
  INotificationDocument,
  NotificationType,
  NotificationPriority,
} from "../models/Notification.model.js";
import { ApiError } from "../utils/ApiError.js";

export interface CreateNotificationParams {
  workspaceId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  leadId?: string | Types.ObjectId | null;
  inboundEmailId?: string | Types.ObjectId | null;
  sequenceId?: string | Types.ObjectId | null;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  suggestedAction?: string;
  metadata?: Record<string, any>;
}

export async function createNotificationService(
  params: CreateNotificationParams
): Promise<INotificationDocument> {
  return await Notification.create({
    workspaceId: new Types.ObjectId(String(params.workspaceId)),
    userId: new Types.ObjectId(String(params.userId)),
    leadId: params.leadId ? new Types.ObjectId(String(params.leadId)) : null,
    inboundEmailId: params.inboundEmailId
      ? new Types.ObjectId(String(params.inboundEmailId))
      : null,
    sequenceId: params.sequenceId
      ? new Types.ObjectId(String(params.sequenceId))
      : null,
    type: params.type,
    title: params.title,
    message: params.message,
    priority: params.priority || "medium",
    suggestedAction: params.suggestedAction || null,
    metadata: params.metadata || {},
    isRead: false,
  });
}

export async function listNotificationsService({
  workspaceId,
  userId,
  unreadOnly = false,
  type,
  priority,
  page = 1,
  limit = 20,
}: {
  workspaceId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  unreadOnly?: boolean;
  type?: string;
  priority?: string;
  page?: number;
  limit?: number;
}) {
  const query: any = {
    workspaceId: new Types.ObjectId(String(workspaceId)),
    userId: new Types.ObjectId(String(userId)),
  };

  if (unreadOnly) {
    query.isRead = false;
  }

  if (type) {
    query.type = type;
  }

  if (priority) {
    query.priority = priority;
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("leadId", "name email company jobTitle")
      .populate("sequenceId", "name"),
    Notification.countDocuments(query),
    Notification.countDocuments({
      workspaceId: new Types.ObjectId(String(workspaceId)),
      userId: new Types.ObjectId(String(userId)),
      isRead: false,
    }),
  ]);

  return {
    notifications,
    total,
    unreadCount,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getUnreadNotificationCountService({
  workspaceId,
  userId,
}: {
  workspaceId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
}) {
  const unreadCount = await Notification.countDocuments({
    workspaceId: new Types.ObjectId(String(workspaceId)),
    userId: new Types.ObjectId(String(userId)),
    isRead: false,
  });

  return { unreadCount };
}

export async function markNotificationReadService(
  notificationId: string | Types.ObjectId,
  userId: string | Types.ObjectId
) {
  const notif = await Notification.findOneAndUpdate(
    {
      _id: new Types.ObjectId(String(notificationId)),
      userId: new Types.ObjectId(String(userId)),
    },
    {
      isRead: true,
      readAt: new Date(),
    },
    { new: true }
  );

  if (!notif) {
    throw new ApiError(404, "Notification not found");
  }

  return notif;
}

export async function markAllNotificationsReadService({
  workspaceId,
  userId,
}: {
  workspaceId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
}) {
  const result = await Notification.updateMany(
    {
      workspaceId: new Types.ObjectId(String(workspaceId)),
      userId: new Types.ObjectId(String(userId)),
      isRead: false,
    },
    {
      isRead: true,
      readAt: new Date(),
    }
  );

  return { modifiedCount: result.modifiedCount };
}

export async function deleteNotificationService(
  notificationId: string | Types.ObjectId,
  userId: string | Types.ObjectId
) {
  const notif = await Notification.findOneAndDelete({
    _id: new Types.ObjectId(String(notificationId)),
    userId: new Types.ObjectId(String(userId)),
  });

  if (!notif) {
    throw new ApiError(404, "Notification not found");
  }

  return { success: true };
}
