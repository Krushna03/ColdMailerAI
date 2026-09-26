import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IIdempotencyKey extends Document {
  key: string;
  userId: Types.ObjectId;
  workspaceId?: Types.ObjectId | null;
  path: string;
  method: string;
  requestHash: string;
  status: "pending" | "completed" | "failed";
  responseStatus?: number | null;
  responseBody?: any;
  createdAt: Date;
}

const IdempotencyKeySchema = new Schema<IIdempotencyKey>(
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

export const IdempotencyKey: Model<IIdempotencyKey> = mongoose.model<IIdempotencyKey>("IdempotencyKey", IdempotencyKeySchema);
