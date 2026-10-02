import mongoose, { Schema, Model, Types, Document } from "mongoose";

export const SEND_JOB_STATUSES = [
  "scheduled",   // Waiting for scheduled time or sending window
  "queued",      // In queue ready for worker pickup
  "sending",     // Claimed by email worker with lock
  "sent",        // Accepted/dispatched by mailbox provider
  "delivered",   // Delivery confirmed
  "failed",      // Transient error (in queue for retry)
  "retry",       // In retry backoff delay
  "dead_letter", // Exceeded max retry attempts
  "bounced",     // Mailbox/provider reported bounce
  "cancelled",   // Cancelled (reply received, meeting booked, manual stop)
] as const;

export type SendJobStatus = (typeof SEND_JOB_STATUSES)[number];

export interface IErrorMessage {
  attempt: number;
  error: string;
  code?: string;
  timestamp: Date;
}

export interface ISendJobMessagePayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface ISendJobProviderResponse {
  provider?: string;
  messageId?: string;
  sentAt?: Date;
  raw?: any;
}

export interface ISendJob {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  sequenceId: Types.ObjectId;
  stepId: Types.ObjectId;
  stepOrder: number;
  enrollmentId: Types.ObjectId;
  leadId: Types.ObjectId;
  mailboxId: Types.ObjectId;
  emailId?: Types.ObjectId | null;
  status: SendJobStatus;
  priority: number;
  scheduledFor: Date;
  queuedAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  failedAt?: Date | null;
  lockedAt?: Date | null;
  lockedBy?: string | null;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: Date | null;
  lastError?: string | null;
  errorHistory: IErrorMessage[];
  messagePayload: ISendJobMessagePayload;
  providerResponse?: ISendJobProviderResponse | null;
  idempotencyKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ISendJobDocument = Document<unknown, {}, ISendJob> & ISendJob;

const ErrorMessageSchema = new Schema<IErrorMessage>(
  {
    attempt: { type: Number, required: true },
    error: { type: String, required: true },
    code: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const MessagePayloadSchema = new Schema<ISendJobMessagePayload>(
  {
    to: { type: String, required: true, trim: true },
    subject: { type: String, required: true },
    html: { type: String, required: true },
    text: { type: String, required: true },
    replyTo: { type: String },
    headers: { type: Map, of: String, default: {} },
  },
  { _id: false }
);

const ProviderResponseSchema = new Schema<ISendJobProviderResponse>(
  {
    provider: { type: String },
    messageId: { type: String },
    sentAt: { type: Date },
    raw: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const SendJobSchema = new Schema<ISendJob>(
  {
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
    sequenceId: {
      type: Schema.Types.ObjectId,
      ref: "Sequence",
      required: true,
      index: true,
    },
    stepId: {
      type: Schema.Types.ObjectId,
      ref: "SequenceStep",
      required: true,
      index: true,
    },
    stepOrder: {
      type: Number,
      required: true,
    },
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: "SequenceEnrollment",
      required: true,
      index: true,
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },
    mailboxId: {
      type: Schema.Types.ObjectId,
      ref: "Mailbox",
      required: true,
      index: true,
    },
    emailId: {
      type: Schema.Types.ObjectId,
      ref: "Email",
      default: null,
    },
    status: {
      type: String,
      enum: SEND_JOB_STATUSES,
      default: "queued",
      index: true,
    },
    priority: {
      type: Number,
      default: 5,
      index: true,
    },
    scheduledFor: {
      type: Date,
      default: Date.now,
      index: true,
    },
    queuedAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    lockedAt: {
      type: Date,
      default: null,
      index: true,
    },
    lockedBy: {
      type: String,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    nextAttemptAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastError: {
      type: String,
      default: null,
    },
    errorHistory: [ErrorMessageSchema],
    messagePayload: {
      type: MessagePayloadSchema,
      required: true,
    },
    providerResponse: {
      type: ProviderResponseSchema,
      default: null,
    },
    idempotencyKey: {
      type: String,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// High-performance queue claiming compound indexes
SendJobSchema.index({ status: 1, scheduledFor: 1, priority: 1 });

SendJobSchema.index({ status: 1, nextAttemptAt: 1, priority: 1 });

SendJobSchema.index({ status: 1, lockedAt: 1 });

SendJobSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });

SendJobSchema.index({ sequenceId: 1, enrollmentId: 1, stepOrder: 1 }, { unique: true, sparse: true });

export const SendJob: Model<ISendJob> = mongoose.model<ISendJob>("SendJob", SendJobSchema);
