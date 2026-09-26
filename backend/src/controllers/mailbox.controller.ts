import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {
  listMailboxesService,
  getMailboxByIdService,
  connectSmtpMailboxService,
  connectGoogleMailboxService,
  connectMicrosoftMailboxService,
  updateMailboxSettingsService,
  testMailboxConnectionService,
  deleteMailboxService,
} from "../services/mailbox.service.js";
import {
  generateGoogleAuthUrl,
  generateMicrosoftAuthUrl,
} from "../services/mailboxOAuth.service.js";
import { sendEmailViaMailbox } from "../services/mailboxSender.service.js";
import {
  connectSmtpSchema,
  updateMailboxSchema,
  sendMailboxEmailSchema,
  oauthCallbackSchema,
} from "../validators/mailbox.validators.js";

/**
 * GET /api/v1/mailboxes
 * List all mailboxes for current workspace.
 */
export const listMailboxes = asyncHandler(async (req: Request, res: Response) => {
  const mailboxes = await listMailboxesService({
    workspaceId: req.workspaceId,
    userId: req.user._id,
  });

  return res.status(200).json({
    success: true,
    mailboxes,
    count: mailboxes.length,
  });
});

/**
 * GET /api/v1/mailboxes/:id
 * Get single mailbox details.
 */
export const getMailbox = asyncHandler(async (req: Request, res: Response) => {
  const mailbox = await getMailboxByIdService({
    mailboxId: req.params.id,
    workspaceId: req.workspaceId,
  });

  return res.status(200).json({
    success: true,
    mailbox,
  });
});

/**
 * POST /api/v1/mailboxes/smtp
 * Connect custom SMTP/IMAP mailbox.
 */
export const connectSmtpMailbox = asyncHandler(async (req: Request, res: Response) => {
  const parsed = connectSmtpSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      parsed.error.issues[0]?.message || "Invalid SMTP configuration"
    );
  }

  const mailbox = await connectSmtpMailboxService({
    workspaceId: req.workspaceId,
    userId: req.user._id,
    ...parsed.data,
  });

  return res.status(201).json({
    success: true,
    mailbox,
    message: "SMTP Mailbox connected and verified successfully",
  });
});

/**
 * GET /api/v1/mailboxes/oauth/google/url
 * Generate Google OAuth consent URL.
 */
export const getGoogleOAuthUrl = asyncHandler(async (req: Request, res: Response) => {
  const { redirectUri } = req.query;
  const { url, state } = generateGoogleAuthUrl({
    workspaceId: req.workspaceId,
    userId: req.user._id,
    redirectUri: redirectUri as string | undefined,
  });

  return res.status(200).json({
    success: true,
    url,
    state,
  });
});

/**
 * POST /api/v1/mailboxes/oauth/google/callback
 * Complete Google OAuth exchange.
 */
export const handleGoogleOAuthCallback = asyncHandler(async (req: Request, res: Response) => {
  const parsed = oauthCallbackSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      parsed.error.issues[0]?.message || "Invalid Google OAuth payload"
    );
  }

  const mailbox = await connectGoogleMailboxService({
    workspaceId: req.workspaceId,
    userId: req.user._id,
    code: parsed.data.code,
    redirectUri: parsed.data.redirectUri,
    dailyLimit: parsed.data.dailyLimit,
  });

  return res.status(200).json({
    success: true,
    mailbox,
    message: "Gmail mailbox connected successfully",
  });
});

/**
 * GET /api/v1/mailboxes/oauth/microsoft/url
 * Generate Microsoft OAuth consent URL.
 */
export const getMicrosoftOAuthUrl = asyncHandler(async (req: Request, res: Response) => {
  const { redirectUri } = req.query;
  const { url, state } = generateMicrosoftAuthUrl({
    workspaceId: req.workspaceId,
    userId: req.user._id,
    redirectUri: redirectUri as string | undefined,
  });

  return res.status(200).json({
    success: true,
    url,
    state,
  });
});

/**
 * POST /api/v1/mailboxes/oauth/microsoft/callback
 * Complete Microsoft OAuth exchange.
 */
export const handleMicrosoftOAuthCallback = asyncHandler(async (req: Request, res: Response) => {
  const parsed = oauthCallbackSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      parsed.error.issues[0]?.message || "Invalid Microsoft OAuth payload"
    );
  }

  const mailbox = await connectMicrosoftMailboxService({
    workspaceId: req.workspaceId,
    userId: req.user._id,
    code: parsed.data.code,
    redirectUri: parsed.data.redirectUri,
    dailyLimit: parsed.data.dailyLimit,
  });

  return res.status(200).json({
    success: true,
    mailbox,
    message: "Microsoft Outlook mailbox connected successfully",
  });
});

/**
 * PATCH /api/v1/mailboxes/:id
 * Update mailbox settings (name, daily limit, status, default).
 */
export const updateMailboxSettings = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateMailboxSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      parsed.error.issues[0]?.message || "Invalid mailbox update payload"
    );
  }

  const mailbox = await updateMailboxSettingsService({
    mailboxId: req.params.id,
    workspaceId: req.workspaceId,
    ...parsed.data,
  });

  return res.status(200).json({
    success: true,
    mailbox,
    message: "Mailbox settings updated successfully",
  });
});

/**
 * POST /api/v1/mailboxes/:id/test
 * Run connection verification / health diagnostic.
 */
export const testMailboxConnection = asyncHandler(async (req: Request, res: Response) => {
  const result = await testMailboxConnectionService({
    mailboxId: req.params.id,
    workspaceId: req.workspaceId,
  });

  return res.status(200).json({
    success: true,
    ...result,
  });
});

/**
 * POST /api/v1/mailboxes/:id/send
 * Dispatch an email through a specific mailbox.
 */
export const sendEmailFromMailbox = asyncHandler(async (req: Request, res: Response) => {
  const parsed = sendMailboxEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      parsed.error.issues[0]?.message || "Invalid send email payload"
    );
  }

  const result = await (sendEmailViaMailbox as any)({
    mailboxId: req.params.id,
    workspaceId: req.workspaceId,
    userId: req.user._id,
    ...parsed.data,
  });

  return res.status(200).json({
    success: true,
    message: "Email sent successfully via mailbox",
    ...result,
  });
});

/**
 * DELETE /api/v1/mailboxes/:id
 * Delete / disconnect mailbox and wipe its encrypted credentials.
 */
export const deleteMailbox = asyncHandler(async (req: Request, res: Response) => {
  const result = await deleteMailboxService({
    mailboxId: req.params.id,
    workspaceId: req.workspaceId,
  });

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});
