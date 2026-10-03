import mongoose, { Schema, Model, Types, Document } from "mongoose";

export const REPLY_CATEGORIES = [
  "interested",
  "meeting_request",
  "objection",
  "out_of_office",
  "wrong_person",
  "not_interested",
  "unsubscribe",
  "neutral",
  "unknown",
] as const;

export type ReplyCategory = (typeof REPLY_CATEGORIES)[number];

export const REPLY_SENTIMENTS = ["positive", "negative", "neutral"] as const;
export type ReplySentiment = (typeof REPLY_SENTIMENTS)[number];

export const INBOUND_SOURCES = ["webhook", "imap", "gmail", "simulation", "manual"] as const;
export type InboundSource = (typeof INBOUND_SOURCES)[number];

export interface IReplyClassification {
  category: ReplyCategory;
  sentiment: ReplySentiment;
  confidence: number;
  summary?: string;
  suggestedAction?: string;
  classifiedAt?: Date;
}

export interface IInboundFrom {
  name?: string;
  email: string;
}

export interface IInboundEmail {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  mailboxId: Types.ObjectId;
  leadId: Types.ObjectId;
  sequenceId?: Types.ObjectId | null;
  enrollmentId?: Types.ObjectId | null;
  emailId?: Types.ObjectId | null;
  sendJobId?: Types.ObjectId | null;
  messageId: string;
  inReplyTo?: string | null;
  references?: string[];
  threadId?: string | null;
  from: IInboundFrom;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  headers?: Record<string, string>;
  classification: IReplyClassification;
  isRead: boolean;
  source: InboundSource;
  metadata?: Record<string, any>;
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type IInboundEmailDocument = Document<unknown, {}, IInboundEmail> & IInboundEmail;

const InboundFromSchema = new Schema<IInboundFrom>(
  {
    name: { type: String, trim: true, default: "" },
    email: { type: String, required: true, trim: true, lowercase: true },
  },
  { _id: false }
);

const ReplyClassificationSchema = new Schema<IReplyClassification>(
  {
    category: {
      type: String,
      enum: REPLY_CATEGORIES,
      default: "unknown",
      index: true,
    },
    sentiment: {
      type: String,
      enum: REPLY_SENTIMENTS,
      default: "neutral",
    },
    confidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    summary: {
      type: String,
      default: "",
    },
    suggestedAction: {
      type: String,
      default: "",
    },
    classifiedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const InboundEmailSchema = new Schema<IInboundEmail>(
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
    mailboxId: {
      type: Schema.Types.ObjectId,
      ref: "Mailbox",
      required: true,
      index: true,
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },
    sequenceId: {
      type: Schema.Types.ObjectId,
      ref: "Sequence",
      default: null,
      index: true,
    },
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: "SequenceEnrollment",
      default: null,
      index: true,
    },
    emailId: {
      type: Schema.Types.ObjectId,
      ref: "Email",
      default: null,
    },
    sendJobId: {
      type: Schema.Types.ObjectId,
      ref: "SendJob",
      default: null,
    },
    messageId: {
      type: String,
      required: true,
      index: true,
    },
    inReplyTo: {
      type: String,
      default: null,
      index: true,
    },
    references: {
      type: [String],
      default: [],
    },
    threadId: {
      type: String,
      default: null,
      index: true,
    },
    from: {
      type: InboundFromSchema,
      required: true,
    },
    to: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    subject: {
      type: String,
      required: true,
      default: "(No Subject)",
    },
    bodyText: {
      type: String,
      default: "",
    },
    bodyHtml: {
      type: String,
      default: "",
    },
    headers: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    classification: {
      type: ReplyClassificationSchema,
      default: () => ({
        category: "unknown",
        sentiment: "neutral",
        confidence: 0,
        summary: "",
        suggestedAction: "",
        classifiedAt: null,
      }),
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    source: {
      type: String,
      enum: INBOUND_SOURCES,
      default: "webhook",
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

InboundEmailSchema.index({ workspaceId: 1, receivedAt: -1 });
InboundEmailSchema.index({ leadId: 1, receivedAt: -1 });
InboundEmailSchema.index({ sequenceId: 1, receivedAt: -1 });
InboundEmailSchema.index({ workspaceId: 1, isRead: 1 });
InboundEmailSchema.index({ workspaceId: 1, "classification.category": 1 });

export const InboundEmail: Model<IInboundEmail> = mongoose.model<IInboundEmail>(
  "InboundEmail",
  InboundEmailSchema
);
