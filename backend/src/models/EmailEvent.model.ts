import mongoose, { Schema, Model, Types, Document } from "mongoose";

export const EMAIL_EVENT_TYPES = [
  "scheduled",
  "queued",
  "sending",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "replied",
  "bounced",
  "failed",
  "retry",
  "cancelled",
] as const;

export type EmailEventType = (typeof EMAIL_EVENT_TYPES)[number];

export interface IEmailEvent {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  sequenceId?: Types.ObjectId | null;
  stepId?: Types.ObjectId | null;
  stepOrder?: number | null;
  enrollmentId?: Types.ObjectId | null;
  leadId: Types.ObjectId;
  mailboxId?: Types.ObjectId | null;
  sendJobId?: Types.ObjectId | null;
  emailId?: Types.ObjectId | null;
  type: EmailEventType;
  messageId?: string | null;
  metadata?: Record<string, any>;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type IEmailEventDocument = Document<unknown, {}, IEmailEvent> & IEmailEvent;

const EmailEventSchema = new Schema<IEmailEvent>(
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
      default: null,
      index: true,
    },
    stepId: {
      type: Schema.Types.ObjectId,
      ref: "SequenceStep",
      default: null,
    },
    stepOrder: {
      type: Number,
      default: null,
    },
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: "SequenceEnrollment",
      default: null,
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
      default: null,
      index: true,
    },
    sendJobId: {
      type: Schema.Types.ObjectId,
      ref: "SendJob",
      default: null,
      index: true,
    },
    emailId: {
      type: Schema.Types.ObjectId,
      ref: "Email",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: EMAIL_EVENT_TYPES,
      required: true,
      index: true,
    },
    messageId: {
      type: String,
      default: null,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

EmailEventSchema.index({ workspaceId: 1, type: 1, timestamp: -1 });

EmailEventSchema.index({ leadId: 1, timestamp: -1 });

EmailEventSchema.index({ sequenceId: 1, timestamp: -1 });

EmailEventSchema.index({ enrollmentId: 1, timestamp: 1 });

export const EmailEvent: Model<IEmailEvent> = mongoose.model<IEmailEvent>("EmailEvent", EmailEventSchema);
