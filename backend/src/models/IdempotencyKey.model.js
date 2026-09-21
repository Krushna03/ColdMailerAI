import mongoose, { Schema } from "mongoose";

const IdempotencyKeySchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      default: null
    },

    path: {
      type: String,
      required: true
    },

    method: {
      type: String,
      required: true
    },

    requestHash: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending"
    },

    responseStatus: {
      type: Number,
      default: null
    },

    responseBody: {
      type: Schema.Types.Mixed,
      default: null
    },

    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400 // Automatically clean up entries after 24 hours
    }
  },
  { timestamps: false }
);

IdempotencyKeySchema.index({ userId: 1, key: 1 }, { unique: true });
IdempotencyKeySchema.index({ workspaceId: 1, key: 1 });

export const IdempotencyKey = mongoose.model("IdempotencyKey", IdempotencyKeySchema);
