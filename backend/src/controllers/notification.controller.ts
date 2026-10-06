import { Response } from "express";
import { AuthenticatedRequest } from "../types/express.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  listNotificationsService,
  getUnreadNotificationCountService,
  markNotificationReadService,
  markAllNotificationsReadService,
  deleteNotificationService,
} from "../services/notification.service.js";

export const getNotifications = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const workspaceId = req.workspace?._id;
    const userId = req.user._id;

    const unreadOnly = req.query.unread === "true";
    const type = req.query.type as string | undefined;
    const priority = req.query.priority as string | undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const data = await listNotificationsService({
      workspaceId,
      userId,
      unreadOnly,
      type,
      priority,
      page,
      limit,
    });

    return res.status(200).json(
      new ApiResponse(200, data, "Notifications retrieved successfully")
    );
  }
);

export const getUnreadCount = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const workspaceId = req.workspace?._id;
    const userId = req.user._id;

    const data = await getUnreadNotificationCountService({
      workspaceId,
      userId,
    });

    return res.status(200).json(
      new ApiResponse(200, data, "Unread count retrieved successfully")
    );
  }
);

export const markNotificationRead = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user._id;
    const { id } = req.params;

    const data = await markNotificationReadService(id, userId);

    return res.status(200).json(
      new ApiResponse(200, data, "Notification marked as read")
    );
  }
);

export const markAllNotificationsRead = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const workspaceId = req.workspace?._id;
    const userId = req.user._id;

    const data = await markAllNotificationsReadService({
      workspaceId,
      userId,
    });

    return res.status(200).json(
      new ApiResponse(200, data, "All notifications marked as read")
    );
  }
);

export const deleteNotification = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user._id;
    const { id } = req.params;

    const data = await deleteNotificationService(id, userId);

    return res.status(200).json(
      new ApiResponse(200, data, "Notification deleted successfully")
    );
  }
);
