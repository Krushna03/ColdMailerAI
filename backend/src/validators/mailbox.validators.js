import { z } from "zod";

export const connectSmtpSchema = z.object({
  email: z.string().email("A valid email address is required"),
  name: z.string().max(100).optional(),
  smtpHost: z.string().min(1, "SMTP host is required"),
  smtpPort: z.coerce.number().int().min(1).max(65535, "Invalid SMTP port"),
  smtpSecure: z.boolean().optional().default(false),
  smtpUser: z.string().optional(),
  smtpPass: z.string().min(1, "SMTP password is required"),
  imapHost: z.string().optional(),
  imapPort: z.coerce.number().int().min(1).max(65535).optional(),
  imapSecure: z.boolean().optional(),
  imapUser: z.string().optional(),
  imapPass: z.string().optional(),
  dailyLimit: z.coerce.number().int().min(1).max(2000).optional().default(50),
});

export const updateMailboxSchema = z.object({
  name: z.string().max(100).optional(),
  dailyLimit: z.coerce.number().int().min(1).max(2000).optional(),
  status: z.enum(["active", "paused"]).optional(),
  isDefault: z.boolean().optional(),
  warmupEnabled: z.boolean().optional(),
});

export const sendMailboxEmailSchema = z.object({
  to: z.string().email("Valid recipient email is required"),
  subject: z.string().min(1, "Email subject is required"),
  html: z.string().optional(),
  text: z.string().optional(),
  leadId: z.string().optional(),
  emailId: z.string().optional(),
}).refine((data) => data.html || data.text, {
  message: "Either html or text body must be provided",
  path: ["body"],
});

export const oauthCallbackSchema = z.object({
  code: z.string().min(1, "OAuth authorization code is required"),
  redirectUri: z.string().url().optional(),
  dailyLimit: z.coerce.number().int().min(1).max(2000).optional(),
});
