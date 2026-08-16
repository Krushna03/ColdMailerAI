import { z } from "zod";
import { LEAD_STATUSES } from "../models/Lead.model.js";
import { FOLLOW_UP_STATUSES } from "../models/FollowUp.model.js"

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

const leadSchema = z.object({
  name: z.string().trim().min(1, "Lead name is required").max(200),
  company: z.string().trim().max(200).optional().default(""),
  role: z.string().trim().max(200).optional().default(""),
  email: emailFieldSchema.optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
  categoryId: objectIdSchema
});

const updateLeadSchema = z
  .object({
    name: z.string().trim().min(1, "Lead name is required").max(200).optional(),
    company: z.string().trim().max(200).optional(),
    role: z.string().trim().max(200).optional(),
    email: emailFieldSchema.optional(),
    notes: z.string().trim().max(1000).optional(),
    status: z.enum(LEAD_STATUSES).optional(),
    categoryId: objectIdSchema.optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update"
  });

const followUpCreateSchema = z.object({
  dueAt: z.coerce.date({
    required_error: "Follow-up date is required",
    invalid_type_error: "Follow-up date is invalid"
  }),
  note: z.string().trim().max(1000).optional().default("")
});

const followUpUpdateSchema = z
  .object({
    dueAt: z.coerce.date({ invalid_type_error: "Follow-up date is invalid" }).optional(),
    note: z.string().trim().max(1000).optional(),
    status: z.enum(FOLLOW_UP_STATUSES).optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one follow-up field is required"
  });

// Cap bulk uploads so one request can't hammer the AI service or DB.
const BULK_LEAD_LIMIT = 200;

const bulkLeadSchema = z.object({
  leads: z
    .array(leadSchema)
    .min(1, "At least one lead is required")
    .max(BULK_LEAD_LIMIT, `You can upload up to ${BULK_LEAD_LIMIT} leads at a time`)
});

const BATCH_TONES = [
  "professional",
  "friendly",
  "concise",
  "persuasive",
  "formal"
];

const batchGenerationSchema = z.object({
  leadIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one lead")
    .max(BULK_LEAD_LIMIT, `You can generate up to ${BULK_LEAD_LIMIT} emails at a time`),
  instructions: z.string().trim().max(2000).optional().default(""),
  purpose: z.string().trim().max(2000).optional().default(""),
  tone: z.enum(BATCH_TONES).optional().default("professional")
});

const firstIssueMessage = (error, fallback = "Invalid input") =>
  (error?.issues ?? error?.errors ?? [])[0]?.message ?? fallback;

export const validateLeadInput = (lead, res) => {
  const result = leadSchema.safeParse(lead);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error)
    });
    return null;
  }
  return result.data;
};

export const validateLeadUpdate = (updates, res) => {
  const result = updateLeadSchema.safeParse(updates);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error)
    });
    return null;
  }
  return result.data;
};

export const validateFollowUpCreate = (body, res) => {
  const result = followUpCreateSchema.safeParse(body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error)
    });
    return null;
  }
  return result.data;
};

export const validateFollowUpUpdate = (body, res) => {
  const result = followUpUpdateSchema.safeParse(body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error)
    });
    return null;
  }
  return result.data;
};

export const validateBulkLeads = (leads, res) => {
  const result = bulkLeadSchema.safeParse({ leads });
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error)
    });
    return null;
  }
  return result.data.leads;
};

export const validateBatchGeneration = (body, res) => {
  const result = batchGenerationSchema.safeParse(body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error)
    });
    return null;
  }
  return result.data;
};

export const validateLeadDeletion = (leadId, res) => {
  if (!leadId) {
    res.status(400).json({
      success: false,
      message: "Lead ID is required"
    });
    return false;
  }
  return true;
};

const bulkDeleteLeadsSchema = z.object({
  leadIds: z
    .array(z.string().min(1, "Lead ID is required"))
    .min(1, "Select at least one lead")
    .max(BULK_LEAD_LIMIT, `You can delete up to ${BULK_LEAD_LIMIT} leads at a time`)
});

export const validateBulkLeadDeletion = (body, res) => {
  const result = bulkDeleteLeadsSchema.safeParse(body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: firstIssueMessage(result.error)
    });
    return null;
  }
  return result.data.leadIds;
};

export { BULK_LEAD_LIMIT, LEAD_STATUSES, FOLLOW_UP_STATUSES };
