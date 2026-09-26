import { Response } from "express";
import { z } from "zod";

// Zod Schemas
export const emailPromptSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(5000, "Prompt is too long"),
});

export const emailUpdateSchema = z.object({
  emailId: z.string().min(1, "Email ID is required"),
  baseEmail: z.string().min(1, "Base email is required"),
  modifications: z.string().min(1, "Modifications are required"),
});

export const emailHistoryUpdateSchema = z.object({
  emailId: z.string().min(1, "Email ID is required"),
  modification: z.string().min(1, "Modification is required"),
});

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  page: z.coerce.number().int().min(0).default(0),
});

// Zod exposes validation problems on `issues`
export const firstIssueMessage = (error: any, fallback = "Invalid input"): string =>
  (error?.issues ?? error?.errors ?? [])[0]?.message ?? fallback;

export const validateUserAuth = (user: any, res: Response): boolean => {
  if (!user?._id) {
    res.status(401).json({
      success: false,
      message: "Unauthorized request",
    });
    return false;
  }
  return true;
};

export const validateEmailPrompt = (prompt: any, res: Response): boolean => {
  const result = emailPromptSchema.safeParse({ prompt });
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error),
    });
    return false;
  }
  return true;
};

export const validateEmailUpdate = (
  { emailId, baseEmail, modifications }: { emailId?: any; baseEmail?: any; modifications?: any },
  res: Response
): boolean => {
  const result = emailUpdateSchema.safeParse({ emailId, baseEmail, modifications });
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error),
    });
    return false;
  }
  return true;
};

export const validateEmailHistoryUpdate = (
  { emailId, modification }: { emailId?: any; modification?: any },
  res: Response
): boolean => {
  const result = emailHistoryUpdateSchema.safeParse({ emailId, modification });
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error),
    });
    return false;
  }
  return true;
};

export const validateEmailDeletion = (emailId: any, res: Response): boolean => {
  if (!emailId) {
    res.status(400).json({
      success: false,
      message: "Email ID is required",
    });
    return false;
  }
  return true;
};

export const validatePagination = (
  limit: any,
  page: any,
  res: Response
): { limit: number; page: number } | null => {
  const result = paginationSchema.safeParse({ limit, page });
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error),
    });
    return null;
  }
  return result.data;
};
