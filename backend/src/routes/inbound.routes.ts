import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { workspaceMiddleware } from "../middlewares/workspace.middleware.js";
import { idempotencyMiddleware } from "../middlewares/idempotency.middleware.js";
import {
  handleWebhook,
  handleMailboxWebhook,
  simulateReply,
  listInboundEmails,
  getInboundEmail,
  markAsRead,
  reclassifyReply,
  getInboundStats,
  syncMailboxReplies,
  syncAllWorkspaceMailboxes,
} from "../controllers/inbound.controller.js";

const router = express.Router();

// 1. PUBLIC WEBHOOKS (Called by external email service providers / forwarding workers)
router.post("/webhook", handleWebhook);
router.post("/webhook/:mailboxId", handleMailboxWebhook);

// 2. PROTECTED WORKSPACE ROUTES
router.use(verifyJWT, workspaceMiddleware, idempotencyMiddleware);

router.route("/").get(listInboundEmails);
router.route("/stats").get(getInboundStats);
router.route("/simulate").post(simulateReply);
router.route("/sync").post(syncAllWorkspaceMailboxes);
router.route("/sync/:mailboxId").post(syncMailboxReplies);

router.route("/:id").get(getInboundEmail);
router.route("/:id/read").patch(markAsRead);
router.route("/:id/classify").post(reclassifyReply);

export default router;
