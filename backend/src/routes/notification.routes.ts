import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { workspaceMiddleware } from "../middlewares/workspace.middleware.js";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../controllers/notification.controller.js";

const router = Router();

router.use(verifyJWT, workspaceMiddleware);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);
router.delete("/:id", deleteNotification);

export default router;
