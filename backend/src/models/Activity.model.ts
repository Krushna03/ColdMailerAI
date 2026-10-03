import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const activityTypes = [
  "EMAIL_GENERATED",
  "EMAIL_SENT",
  "EMAIL_FAILED",
  "EMAIL_REPLIED",
  "REPLY_RECEIVED",
  "TASK_CREATED",
  "FOLLOWUP_CREATED",
  "FOLLOWUP_COMPLETED",
  "STATUS_CHANGED",
  "LEAD_CREATED",
  "LEAD_UPDATED",
  "NOTE_ADDED",
  "MEETING_SCHEDULED"
] as const;

export type ActivityType = typeof activityTypes[number];

export interface IActivity extends Document {
  userId: Types.ObjectId;
  workspaceId: Types.ObjectId | null;
  performedBy: Types.ObjectId | null;
  leadId: Types.ObjectId;
  type: ActivityType;
  title: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
      index: true
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: activityTypes,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

activitySchema.index({ leadId: 1, createdAt: -1 });
activitySchema.index({ workspaceId: 1, createdAt: -1 });

export const Activity: Model<IActivity> = mongoose.model<IActivity>("Activity", activitySchema);
