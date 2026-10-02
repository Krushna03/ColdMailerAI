import { z } from "zod";
import { SEQUENCE_STATUSES } from "../models/Sequence.model.js";
import { STEP_TYPES } from "../models/SequenceStep.model.js";

export const stepDelaySchema = z.object({
  value: z.coerce.number().min(0).default(0),
  unit: z.enum(["minutes", "hours", "days"]).default("days"),
});

export const stepTemplateSchema = z.object({
  subject: z.string().optional().default(""),
  body: z.string().optional().default(""),
  templateId: z.string().optional().nullable(),
  aiPrompt: z.string().optional().default(""),
});

export const stepConditionsSchema = z.object({
  field: z.enum(["replyReceived", "emailOpened", "leadStatus", "customField", "none"]).default("none"),
  operator: z.enum(["equals", "not_equals", "contains", "is_true", "is_false"]).default("is_false"),
  value: z.any().optional(),
  actionOnFalse: z.enum(["stop", "skip", "jump_to"]).default("skip"),
  jumpToStepOrder: z.coerce.number().int().optional().nullable(),
});

export const sequenceStepInputSchema = z
  .object({
    order: z.coerce.number().int().min(1),
    type: z.enum(STEP_TYPES),
    title: z.string().optional().default(""),
    delay: stepDelaySchema.default({ value: 0, unit: "days" }),
    template: stepTemplateSchema.optional(),
    conditions: stepConditionsSchema.optional(),
    taskConfig: z
      .object({
        title: z.string().optional().default(""),
        description: z.string().optional().default(""),
        assignedTo: z.string().optional().nullable(),
      })
      .optional()
      .nullable(),
    webhookConfig: z
      .object({
        url: z.string().optional().nullable().or(z.literal("")),
        method: z.enum(["POST", "GET"]).optional().default("POST"),
        headers: z.record(z.string(), z.string()).optional(),
      })
      .optional()
      .nullable(),
    aiActionConfig: z
      .object({
        actionType: z.enum(["generate_personalized_intro", "analyze_lead", "custom_prompt"]).optional(),
        prompt: z.string().optional().default(""),
        outputField: z.string().optional().default(""),
      })
      .optional()
      .nullable(),
  })
  .superRefine((step, ctx) => {
    if (step.type === "webhook") {
      const rawUrl = (step.webhookConfig?.url || "").trim();
      if (!rawUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["webhookConfig", "url"],
          message: "Webhook URL is required for webhook steps",
        });
      } else {
        try {
          const parsed = new URL(rawUrl);
          if (!["http:", "https:"].includes(parsed.protocol)) {
            throw new Error();
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["webhookConfig", "url"],
            message: "Please enter a valid webhook URL (e.g. https://api.yourdomain.com/webhook)",
          });
        }
      }
    }
  });

export const sequenceSettingsSchema = z.object({
  stopOnReply: z.boolean().default(true),
  stopOnClick: z.boolean().default(false),
  stopOnMeetingBooked: z.boolean().default(true),
  sendOnDays: z.array(z.coerce.number().int().min(0).max(6)).default([1, 2, 3, 4, 5]),
  sendWindow: z
    .object({
      enabled: z.boolean().default(false),
      start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Must be in HH:mm format").default("09:00"),
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Must be in HH:mm format").default("17:00"),
      timezone: z.string().default("UTC"),
    })
    .default({ enabled: false, start: "09:00", end: "17:00", timezone: "UTC" }),
  mailboxId: z.string().optional().nullable(),
  trackOpens: z.boolean().default(true),
  trackClicks: z.boolean().default(true),
  maxDailyEnrollments: z.coerce.number().int().min(1).default(100),
});

export const sequenceEnrollmentRulesSchema = z.object({
  allowReenrollment: z.boolean().default(false),
  stopIfLeadStatus: z.array(z.string()).default(["replied", "meeting", "closed", "archived"]),
  autoEnrollSegmentId: z.string().optional().nullable(),
  requiredTags: z.array(z.string()).default([]),
  excludedTags: z.array(z.string()).default([]),
});

export const createSequenceSchema = z.object({
  name: z.string().min(1, "Sequence name is required").max(100, "Sequence name cannot exceed 100 characters"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional().default(""),
  status: z.enum(SEQUENCE_STATUSES).optional().default("draft"),
  settings: sequenceSettingsSchema.optional().default({
    stopOnReply: true,
    stopOnClick: false,
    stopOnMeetingBooked: true,
    sendOnDays: [1, 2, 3, 4, 5],
    sendWindow: { enabled: false, start: "09:00", end: "17:00", timezone: "UTC" },
    mailboxId: null,
    trackOpens: true,
    trackClicks: true,
    maxDailyEnrollments: 100,
  }),
  enrollmentRules: sequenceEnrollmentRulesSchema.optional().default({
    allowReenrollment: false,
    stopIfLeadStatus: ["replied", "meeting", "closed", "archived"],
    autoEnrollSegmentId: null,
    requiredTags: [],
    excludedTags: [],
  }),
  steps: z.array(sequenceStepInputSchema).optional().default([]),
});

export const updateSequenceSchema = z.object({
  name: z.string().min(1, "Sequence name is required").max(100, "Sequence name cannot exceed 100 characters").optional(),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
  status: z.enum(SEQUENCE_STATUSES).optional(),
  settings: sequenceSettingsSchema.partial().optional(),
  enrollmentRules: sequenceEnrollmentRulesSchema.partial().optional(),
});

export const saveStepsSchema = z.object({
  steps: z.array(sequenceStepInputSchema).min(1, "At least one step is required"),
});

export const enrollLeadsSchema = z.object({
  leadIds: z.array(z.string()).optional(),
  segmentId: z.string().optional(),
  mailboxId: z.string().optional().nullable(),
}).refine(data => (data.leadIds && data.leadIds.length > 0) || data.segmentId, {
  message: "Either leadIds or segmentId must be provided",
  path: ["leadIds"],
});

export const updateEnrollmentStatusSchema = z.object({
  status: z.enum(["active", "paused", "stopped"]),
  reason: z.string().optional(),
});

export type CreateSequenceInput = z.infer<typeof createSequenceSchema>;

export type UpdateSequenceInput = z.infer<typeof updateSequenceSchema>;

export type SaveStepsInput = z.infer<typeof saveStepsSchema>;

export type EnrollLeadsInput = z.infer<typeof enrollLeadsSchema>;

export type UpdateEnrollmentStatusInput = z.infer<typeof updateEnrollmentStatusSchema>;
