import { Response } from "express";
import { z } from "zod";
import { LEAD_STATUSES } from "../models/Lead.model.js";
import { FOLLOW_UP_STATUSES } from "../models/FollowUp.model.js";

const emailFieldSchema = z
  .string()
  .trim()
  .email("Invalid email address")
  .optional()
  .or(z.literal(""));

const objectIdSchema = z
  .string()
  .min(1, "Category is required")
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid category ID");

const companySubSchema = z.object({
  name: z.string().trim().max(200).optional(),
  domain: z.string().trim().max(200).optional(),
  industry: z.string().trim().max(100).optional(),
  size: z.string().trim().max(50).optional(),
  revenue: z.string().trim().max(50).optional(),
});

const companyInputSchema = z
  .union([z.string().trim().max(200), companySubSchema])
  .optional()
  .default("")
  .transform((val) => {
    if (typeof val === "string") {
      return { name: val, domain: "", industry: "", size: "", revenue: "" };
    }
    return val
      ? { name: "", domain: "", industry: "", size: "", revenue: "", ...val }
      : { name: "", domain: "", industry: "", size: "", revenue: "" };
  });

const updateCompanySchema = z
  .union([z.string().trim().max(200), companySubSchema])
  .optional()
  .transform((val) => {
    if (val === undefined) return undefined;
    if (typeof val === "string") {
      return { name: val };
    }
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(val || {})) {
      if (v !== undefined) clean[k] = v;
    }
    return clean;
  });

export const leadSchema = z.object({
  name: z.string().trim().min(1, "Lead name is required").max(200),
  company: companyInputSchema,
  role: z.string().trim().max(200).optional().default(""),
  jobTitle: z.string().trim().max(200).optional().default(""),
  email: emailFieldSchema.optional().default(""),
  phone: z.string().trim().max(50).optional().default(""),
  linkedinUrl: z.string().trim().max(500).optional().default(""),
  location: z.string().trim().max(200).optional().default(""),
  timezone: z.string().trim().max(100).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  categoryId: objectIdSchema,
  status: z.enum(LEAD_STATUSES).optional().default("new"),
  source: z.string().trim().max(100).optional().default("manual"),
  tags: z.array(z.string().trim().min(1).max(50)).optional().default([]),
  customFields: z.record(z.string(), z.any()).optional().default({}),
  assignedTo: z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/, "Invalid user ID")
    .optional()
    .nullable(),
});

export const updateLeadSchema = z
  .object({
    name: z.string().trim().min(1, "Lead name is required").max(200).optional(),
    company: updateCompanySchema,
    role: z.string().trim().max(200).optional(),
    jobTitle: z.string().trim().max(200).optional(),
    email: emailFieldSchema.optional(),
    phone: z.string().trim().max(50).optional(),
    linkedinUrl: z.string().trim().max(500).optional(),
    location: z.string().trim().max(200).optional(),
    timezone: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(2000).optional(),
    status: z.enum(LEAD_STATUSES).optional(),
    categoryId: objectIdSchema.optional(),
    source: z.string().trim().max(100).optional(),
    tags: z.array(z.string().trim().min(1).max(50)).optional(),
    customFields: z.record(z.string(), z.any()).optional(),
    assignedTo: z
      .string()
      .regex(/^[a-fA-F0-9]{24}$/, "Invalid user ID")
      .optional()
      .nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update",
  });

export const followUpCreateSchema = z.object({
  dueAt: z.coerce.date({
    message: "Follow-up date is required",
  }),
  note: z.string().trim().max(1000).optional().default(""),
});

export const followUpUpdateSchema = z
  .object({
    dueAt: z.coerce
      .date({ message: "Follow-up date is invalid" })
      .optional(),
    note: z.string().trim().max(1000).optional(),
    status: z.enum(FOLLOW_UP_STATUSES).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one follow-up field is required",
  });

export const BULK_LEAD_LIMIT = 200;

export const bulkLeadSchema = z.object({
  leads: z
    .array(leadSchema)
    .min(1, "At least one lead is required")
    .max(
      BULK_LEAD_LIMIT,
      `You can upload up to ${BULK_LEAD_LIMIT} leads at a time`
    ),
});

export const importLeadItemSchema = z.object({
  name: z.string().trim().min(1, "Lead name is required").max(200),
  company: companyInputSchema,
  role: z.string().trim().max(200).optional().default(""),
  jobTitle: z.string().trim().max(200).optional().default(""),
  email: z.string().trim().max(254).optional().default(""),
  phone: z.string().trim().max(50).optional().default(""),
  linkedinUrl: z.string().trim().max(500).optional().default(""),
  location: z.string().trim().max(200).optional().default(""),
  timezone: z.string().trim().max(100).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  categoryId: z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/, "Invalid category ID")
    .optional()
    .nullable(),
  status: z.enum(LEAD_STATUSES).optional().default("new"),
  source: z.string().trim().max(100).optional().default("csv_import"),
  tags: z.array(z.string().trim().min(1).max(50)).optional().default([]),
  customFields: z.record(z.string(), z.any()).optional().default({}),
  assignedTo: z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/, "Invalid user ID")
    .optional()
    .nullable(),
});

export const importLeadsSchema = z.object({
  leads: z
    .array(importLeadItemSchema)
    .min(1, "At least one lead is required")
    .max(
      BULK_LEAD_LIMIT,
      `You can upload up to ${BULK_LEAD_LIMIT} leads at a time`
    ),
});

export const BATCH_TONES = [
  "professional",
  "friendly",
  "concise",
  "persuasive",
  "formal",
] as const;
export type BatchTone = (typeof BATCH_TONES)[number];

export const batchGenerationSchema = z.object({
  leadIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one lead")
    .max(
      BULK_LEAD_LIMIT,
      `You can generate up to ${BULK_LEAD_LIMIT} emails at a time`
    ),
  instructions: z.string().trim().max(2000).optional().default(""),
  purpose: z.string().trim().max(2000).optional().default(""),
  tone: z.enum(BATCH_TONES).optional().default("professional"),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type FollowUpCreateInput = z.infer<typeof followUpCreateSchema>;
export type FollowUpUpdateInput = z.infer<typeof followUpUpdateSchema>;
export type ImportLeadItem = z.infer<typeof importLeadItemSchema>;
export type BatchGenerationInput = z.infer<typeof batchGenerationSchema>;

const firstIssueMessage = (error: any, fallback = "Invalid input") =>
  (error?.issues ?? error?.errors ?? [])[0]?.message ?? fallback;

export const validateLeadInput = (lead: unknown, res: Response) => {
  const result = leadSchema.safeParse(lead);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error),
    });
    return null;
  }
  return result.data;
};

export const validateLeadUpdate = (updates: unknown, res: Response) => {
  const result = updateLeadSchema.safeParse(updates);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error),
    });
    return null;
  }
  return result.data;
};

export const validateFollowUpCreate = (body: unknown, res: Response) => {
  const result = followUpCreateSchema.safeParse(body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error),
    });
    return null;
  }
  return result.data;
};

export const validateFollowUpUpdate = (body: unknown, res: Response) => {
  const result = followUpUpdateSchema.safeParse(body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error),
    });
    return null;
  }
  return result.data;
};

export const validateBulkLeads = (leads: unknown[], res: Response) => {
  const result = bulkLeadSchema.safeParse({ leads });
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error),
    });
    return null;
  }
  return result.data.leads;
};

export const validateImportLeads = (leads: unknown[], res: Response) => {
  const result = importLeadsSchema.safeParse({ leads });
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error),
    });
    return null;
  }
  return result.data.leads;
};

export const validateBatchGeneration = (body: unknown, res: Response) => {
  const result = batchGenerationSchema.safeParse(body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error),
    });
    return null;
  }
  return result.data;
};

export const validateLeadDeletion = (leadId: unknown, res: Response) => {
  if (!leadId) {
    res.status(400).json({
      success: false,
      message: "Lead ID is required",
    });
    return false;
  }
  return true;
};

const bulkDeleteLeadsSchema = z.object({
  leadIds: z
    .array(z.string().min(1, "Lead ID is required"))
    .min(1, "Select at least one lead")
    .max(
      BULK_LEAD_LIMIT,
      `You can delete up to ${BULK_LEAD_LIMIT} leads at a time`
    ),
});

export const validateBulkLeadDeletion = (body: unknown, res: Response) => {
  const result = bulkDeleteLeadsSchema.safeParse(body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error),
    });
    return null;
  }
  return result.data.leadIds;
};

const bulkTagSchema = z.object({
  leadIds: z
    .array(z.string().min(1, "Lead ID is required"))
    .min(1, "Select at least one lead")
    .max(
      BULK_LEAD_LIMIT,
      `You can tag up to ${BULK_LEAD_LIMIT} leads at a time`
    ),
  tags: z
    .array(z.string().trim().min(1, "Tag cannot be empty").max(50))
    .min(1, "Provide at least one tag"),
  action: z.enum(["add", "remove"]).optional().default("add"),
});

export type BulkTagInput = z.infer<typeof bulkTagSchema>;

export const validateBulkTagInput = (body: unknown, res: Response) => {
  const result = bulkTagSchema.safeParse(body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error),
    });
    return null;
  }
  return result.data;
};

export { LEAD_STATUSES, FOLLOW_UP_STATUSES };
