import mongoose, { Schema, Model, Types, Document } from "mongoose";

export const STEP_TYPES = [
  "email",
  "wait",
  "condition",
  "task",
  "webhook",
  "ai_action",
] as const;

export type StepType = (typeof STEP_TYPES)[number];

export interface IStepDelay {
  value: number; // e.g., 3
  unit: "minutes" | "hours" | "days";
}

export interface IStepTemplate {
  subject?: string;
  body?: string;
  templateId?: Types.ObjectId | null;
  aiPrompt?: string;
}

export interface IStepConditions {
  field?: "replyReceived" | "emailOpened" | "leadStatus" | "customField" | "none";
  operator?: "equals" | "not_equals" | "contains" | "is_true" | "is_false";
  value?: any;
  actionOnFalse?: "stop" | "skip" | "jump_to";
  jumpToStepOrder?: number;
}

export interface IStepTaskConfig {
  title?: string;
  description?: string;
  assignedTo?: Types.ObjectId | null;
}

export interface IStepWebhookConfig {
  url?: string;
  method?: "POST" | "GET";
  headers?: Record<string, string>;
}

export interface IStepAiActionConfig {
  actionType?: "generate_personalized_intro" | "analyze_lead" | "custom_prompt";
  prompt?: string;
  outputField?: string;
}

export interface IStepStats {
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  repliedCount: number;
  failedCount: number;
}

export interface ISequenceStep {
  _id: Types.ObjectId;
  sequenceId: Types.ObjectId;
  workspaceId: Types.ObjectId;
  order: number;
  type: StepType;
  title?: string;
  delay: IStepDelay;
  template?: IStepTemplate;
  conditions?: IStepConditions;
  taskConfig?: IStepTaskConfig;
  webhookConfig?: IStepWebhookConfig;
  aiActionConfig?: IStepAiActionConfig;
  stats: IStepStats;
  createdAt: Date;
  updatedAt: Date;
}

export type ISequenceStepDocument = Document<unknown, {}, ISequenceStep> & ISequenceStep;

const StepDelaySchema = new Schema<IStepDelay>(
  {
    value: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      enum: ["minutes", "hours", "days"],
      default: "days",
    },
  },
  { _id: false }
);

const StepTemplateSchema = new Schema<IStepTemplate>(
  {
    subject: {
      type: String,
      default: "",
    },
    body: {
      type: String,
      default: "",
    },
    templateId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    aiPrompt: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const StepConditionsSchema = new Schema<IStepConditions>(
  {
    field: {
      type: String,
      enum: ["replyReceived", "emailOpened", "leadStatus", "customField", "none"],
      default: "none",
    },
    operator: {
      type: String,
      enum: ["equals", "not_equals", "contains", "is_true", "is_false"],
      default: "is_false",
    },
    value: {
      type: Schema.Types.Mixed,
      default: null,
    },
    actionOnFalse: {
      type: String,
      enum: ["stop", "skip", "jump_to"],
      default: "skip",
    },
    jumpToStepOrder: {
      type: Number,
      default: null,
    },
  },
  { _id: false }
);

const StepTaskConfigSchema = new Schema<IStepTaskConfig>(
  {
    title: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { _id: false }
);

const StepWebhookConfigSchema = new Schema<IStepWebhookConfig>(
  {
    url: {
      type: String,
      default: "",
    },
    method: {
      type: String,
      enum: ["POST", "GET"],
      default: "POST",
    },
    headers: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { _id: false }
);

const StepAiActionConfigSchema = new Schema<IStepAiActionConfig>(
  {
    actionType: {
      type: String,
      enum: ["generate_personalized_intro", "analyze_lead", "custom_prompt"],
      default: "generate_personalized_intro",
    },
    prompt: {
      type: String,
      default: "",
    },
    outputField: {
      type: String,
      default: "customFields.aiInsight",
    },
  },
  { _id: false }
);

const StepStatsSchema = new Schema<IStepStats>(
  {
    sentCount: {
      type: Number,
      default: 0,
    },
    deliveredCount: {
      type: Number,
      default: 0,
    },
    openedCount: {
      type: Number,
      default: 0,
    },
    repliedCount: {
      type: Number,
      default: 0,
    },
    failedCount: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const SequenceStepSchema = new Schema<ISequenceStep>(
  {
    sequenceId: {
      type: Schema.Types.ObjectId,
      ref: "Sequence",
      required: true,
      index: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    order: {
      type: Number,
      required: true,
      min: 1,
    },
    type: {
      type: String,
      enum: STEP_TYPES,
      required: true,
    },
    title: {
      type: String,
      default: "",
    },
    delay: {
      type: StepDelaySchema,
      default: () => ({ value: 0, unit: "days" }),
    },
    template: {
      type: StepTemplateSchema,
      default: () => ({}),
    },
    conditions: {
      type: StepConditionsSchema,
      default: () => ({ field: "none" }),
    },
    taskConfig: {
      type: StepTaskConfigSchema,
      default: () => ({}),
    },
    webhookConfig: {
      type: StepWebhookConfigSchema,
      default: () => ({}),
    },
    aiActionConfig: {
      type: StepAiActionConfigSchema,
      default: () => ({}),
    },
    stats: {
      type: StepStatsSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

SequenceStepSchema.index({ sequenceId: 1, order: 1 }, { unique: true });

export const SequenceStep: Model<ISequenceStep> = mongoose.model<ISequenceStep>(
  "SequenceStep",
  SequenceStepSchema
);
