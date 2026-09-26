import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { workspaceMiddleware } from "../middlewares/workspace.middleware.js";
import { idempotencyMiddleware } from "../middlewares/idempotency.middleware.js";
import {
  listMailboxes,
  getMailbox,
  connectSmtpMailbox,
  getGoogleOAuthUrl,
  handleGoogleOAuthCallback,
  getMicrosoftOAuthUrl,
  handleMicrosoftOAuthCallback,
  updateMailboxSettings,
  testMailboxConnection,
  sendEmailFromMailbox,
  deleteMailbox,
} from "../controllers/mailbox.controller.js";

const router = express.Router();

router.use(verifyJWT, workspaceMiddleware, idempotencyMiddleware);

// Core mailbox listing & connection
router.route("/").get(listMailboxes);
router.route("/smtp").post(connectSmtpMailbox);

// OAuth routes
router.route("/oauth/google/url").get(getGoogleOAuthUrl);
router.route("/oauth/google/callback").post(handleGoogleOAuthCallback);
router.route("/oauth/microsoft/url").get(getMicrosoftOAuthUrl);
router.route("/oauth/microsoft/callback").post(handleMicrosoftOAuthCallback);

// Specific mailbox management & sending
router
  .route("/:id")
  .get(getMailbox)
  .patch(updateMailboxSettings)
  .delete(deleteMailbox);

router.route("/:id/test").post(testMailboxConnection);
router.route("/:id/send").post(sendEmailFromMailbox);

export default router;
