import mongoose from "mongoose";

const activityTypes = [
  "EMAIL_GENERATED",
  "EMAIL_SENT",
  "EMAIL_FAILED",
  "FOLLOWUP_CREATED",
  "FOLLOWUP_COMPLETED",
  "STATUS_CHANGED",
  "LEAD_CREATED",
  "LEAD_UPDATED",
  "NOTE_ADDED",
  "MEETING_SCHEDULED"
];

const activitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
      index: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
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
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

activitySchema.index({ leadId: 1, createdAt: -1 });
activitySchema.index({ workspaceId: 1, createdAt: -1 });

export const Activity = mongoose.model("Activity", activitySchema);
export { activityTypes };
