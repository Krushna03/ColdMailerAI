import mongoose, { Schema, Model, Types, Document } from "mongoose";

export const ENROLLMENT_STATUSES = [
  "active",
  "paused",
  "completed",
  "stopped",
  "failed",
] as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const STOP_REASONS = [
  "replied",
  "meeting_booked",
  "unsubscribed",
  "manual",
  "lead_status_changed",
  "completed",
  "condition_stopped",
  "error",
] as const;

export type StopReason = (typeof STOP_REASONS)[number];

export interface IStepExecutionLog {
  stepId?: Types.ObjectId | null;
  stepOrder: number;
  type: string;
  executedAt: Date;
  status: "success" | "skipped" | "failed";
  subject?: string;
  emailId?: Types.ObjectId | null;
  error?: string;
  details?: Record<string, any>;
}

export interface ISequenceEnrollment {
  _id: Types.ObjectId;
  sequenceId: Types.ObjectId;
  leadId: Types.ObjectId;
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  mailboxId?: Types.ObjectId | null;
  status: EnrollmentStatus;
  currentStepOrder: number;
  currentStepId?: Types.ObjectId | null;
  nextRunAt?: Date | null;
  stopReason?: StopReason | null;
  stepHistory: IStepExecutionLog[];
  leadSnapshot: {
    name: string;
    email: string;
    company: string;
    jobTitle?: string;
  };
  customVariables?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type ISequenceEnrollmentDocument = Document<unknown, {}, ISequenceEnrollment> &
  ISequenceEnrollment;

const StepExecutionLogSchema = new Schema<IStepExecutionLog>(
  {
    stepId: {
      type: Schema.Types.ObjectId,
      ref: "SequenceStep",
      default: null,
    },
    stepOrder: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    executedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["success", "skipped", "failed"],
      default: "success",
    },
    subject: {
      type: String,
      default: "",
    },
    emailId: {
      type: Schema.Types.ObjectId,
      ref: "Email",
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

const SequenceEnrollmentSchema = new Schema<ISequenceEnrollment>(
  {
    sequenceId: {
      type: Schema.Types.ObjectId,
      ref: "Sequence",
      required: true,
      index: true,
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    mailboxId: {
      type: Schema.Types.ObjectId,
      ref: "Mailbox",
      default: null,
    },
    status: {
      type: String,
      enum: ENROLLMENT_STATUSES,
      default: "active",
      index: true,
    },
    currentStepOrder: {
      type: Number,
      default: 1,
      min: 1,
    },
    currentStepId: {
      type: Schema.Types.ObjectId,
      ref: "SequenceStep",
      default: null,
    },
    nextRunAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    stopReason: {
      type: String,
      enum: [...STOP_REASONS, null],
      default: null,
    },
    stepHistory: {
      type: [StepExecutionLogSchema],
      default: [],
    },
    leadSnapshot: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      company: { type: String, default: "" },
      jobTitle: { type: String, default: "" },
    },
    customVariables: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

SequenceEnrollmentSchema.index({ sequenceId: 1, leadId: 1 });
SequenceEnrollmentSchema.index({ status: 1, nextRunAt: 1 });
SequenceEnrollmentSchema.index({ leadId: 1, status: 1 });
SequenceEnrollmentSchema.index({ workspaceId: 1, status: 1 });

export const SequenceEnrollment: Model<ISequenceEnrollment> = mongoose.model<ISequenceEnrollment>(
  "SequenceEnrollment",
  SequenceEnrollmentSchema
);
