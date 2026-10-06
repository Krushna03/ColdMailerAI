import mongoose, { Schema, Model, Types, Document } from "mongoose";

export const NOTIFICATION_TYPES = [
  "lead_interested",
  "meeting_request",
  "prospect_objection",
  "wrong_person",
  "reply_received",
  "sequence_stopped",
  "system",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_PRIORITIES = ["urgent", "high", "medium", "low"] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

export interface INotification {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  leadId?: Types.ObjectId | null;
  inboundEmailId?: Types.ObjectId | null;
  sequenceId?: Types.ObjectId | null;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  suggestedAction?: string;
  isRead: boolean;
  readAt?: Date | null;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type INotificationDocument = Document<unknown, {}, INotification> & INotification;

const NotificationSchema = new Schema<INotification, Model<INotification>>(
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
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
      index: true,
    },
    inboundEmailId: {
      type: Schema.Types.ObjectId,
      ref: "InboundEmail",
      default: null,
    },
    sequenceId: {
      type: Schema.Types.ObjectId,
      ref: "Sequence",
      default: null,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: NOTIFICATION_PRIORITIES,
      default: "medium",
      index: true,
    },
    suggestedAction: {
      type: String,
      trim: true,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Composite indices for query speed
NotificationSchema.index({ workspaceId: 1, userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ workspaceId: 1, type: 1, createdAt: -1 });

export const Notification =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
