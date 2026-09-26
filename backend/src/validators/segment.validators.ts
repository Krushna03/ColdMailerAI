import { Response } from "express";
import { z } from "zod";
import { LEAD_STATUSES } from "../models/Lead.model.js";

const objectIdPattern = /^[a-fA-F0-9]{24}$/;

const segmentFiltersSchema = z
  .object({
    jobTitle: z.array(z.string().trim().min(1)).optional().default([]),
    industry: z.array(z.string().trim().min(1)).optional().default([]),
    companySize: z.array(z.string().trim().min(1)).optional().default([]),
    status: z.array(z.enum(LEAD_STATUSES)).optional().default([]),
    tags: z.array(z.string().trim().min(1)).optional().default([]),
    categoryId: z
      .string()
      .regex(objectIdPattern, "Invalid category ID")
      .optional()
      .nullable(),
    assignedTo: z
      .string()
      .regex(objectIdPattern, "Invalid assigned user ID")
      .optional()
      .nullable(),
    source: z.array(z.string().trim().min(1)).optional().default([]),
    location: z.array(z.string().trim().min(1)).optional().default([]),
    lastContactedBefore: z.string().or(z.date()).optional().nullable(),
    lastContactedDaysAgo: z.number().nonnegative().optional().nullable(),
    nextFollowUpBefore: z.string().or(z.date()).optional().nullable(),
    hasEmail: z.boolean().optional().nullable(),
    hasPhone: z.boolean().optional().nullable(),
    customFields: z.record(z.string(), z.any()).optional().default({}),
    search: z.string().trim().optional().default("")
  })
  .optional()
  .default(() => ({} as any));

const createSegmentSchema = z.object({
  name: z.string().trim().min(1, "Segment name is required").max(100),
  description: z.string().trim().max(500).optional().default(""),
  filters: segmentFiltersSchema,
  color: z.string().trim().max(50).optional().default("brand"),
  icon: z.string().trim().max(50).optional().default("filter"),
  isStarred: z.boolean().optional().default(false)
});

const updateSegmentSchema = z
  .object({
    name: z.string().trim().min(1, "Segment name is required").max(100).optional(),
    description: z.string().trim().max(500).optional(),
    filters: segmentFiltersSchema.optional(),
    color: z.string().trim().max(50).optional(),
    icon: z.string().trim().max(50).optional(),
    isStarred: z.boolean().optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update"
  });

const previewSegmentSchema = z.object({
  filters: segmentFiltersSchema,
  limit: z.coerce.number().int().positive().max(50).optional().default(5)
});

const firstIssueMessage = (error: any, fallback = "Invalid input") =>
  (error?.issues ?? error?.errors ?? [])[0]?.message ?? fallback;

export const validateCreateSegment = (body: any, res: Response) => {
  const result = createSegmentSchema.safeParse(body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error)
    });
    return null;
  }
  return result.data;
};

export const validateUpdateSegment = (body: any, res: Response) => {
  const result = updateSegmentSchema.safeParse(body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error)
    });
    return null;
  }
  return result.data;
};

export const validatePreviewSegment = (body: any, res: Response) => {
  const result = previewSegmentSchema.safeParse(body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error)
    });
    return null;
  }
  return result.data;
};
