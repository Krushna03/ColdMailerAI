import mongoose, { Schema, Types, Model } from "mongoose";

export const BATCH_JOB_STATUSES = [
  "pending",
  "processing",
  "completed",
  "completed_with_errors",
  "failed",
  "cancelled",
] as const;

export type BatchJobStatus = (typeof BATCH_JOB_STATUSES)[number];

export interface IBatchJobResult {
  _id?: Types.ObjectId;
  leadId: Types.ObjectId;
  leadName: string;
  leadEmail: string;
  leadCompany: any;
  success: boolean;
  emailId?: Types.ObjectId | null;
  generatedEmail?: string | null;
  error?: string | null;
}

export interface IBatchJob {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  workspaceId?: Types.ObjectId | null;
  createdBy?: Types.ObjectId | null;
  leadIds: Types.ObjectId[];
  status: BatchJobStatus;
  totalLeads: number;
  processedLeads: number;
  successCount: number;
  failureCount: number;
  instructions: string;
  purpose: string;
  tone: string;
  results: IBatchJobResult[];
  createdAt: Date;
  updatedAt: Date;
}

const BatchJobResultSchema = new Schema<IBatchJobResult>({
  leadId: {
    type: Schema.Types.ObjectId,
    ref: "Lead",
    required: true,
  },
  leadName: {
    type: String,
    default: "",
  },
  leadEmail: {
    type: String,
    default: "",
  },
  leadCompany: {
    type: Schema.Types.Mixed,
    default: "",
  },
  success: {
    type: Boolean,
    required: true,
  },
  emailId: {
    type: Schema.Types.ObjectId,
    ref: "Email",
    default: null,
  },
  generatedEmail: {
    type: String,
    default: null,
  },
  error: {
    type: String,
    default: null,
  },
});

const BatchJobSchema = new Schema<IBatchJob>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    leadIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Lead",
        required: true,
      },
    ],
    status: {
      type: String,
      enum: BATCH_JOB_STATUSES,
      default: "pending",
    },
    totalLeads: {
      type: Number,
      required: true,
    },
    processedLeads: {
      type: Number,
      default: 0,
    },
    successCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    instructions: {
      type: String,
      default: "",
    },
    purpose: {
      type: String,
      default: "",
    },
    tone: {
      type: String,
      default: "professional",
    },
    results: [BatchJobResultSchema],
  },
  { timestamps: true }
);

BatchJobSchema.index({ userId: 1, createdAt: -1 });
BatchJobSchema.index({ workspaceId: 1, createdAt: -1 });

export const BatchJob: Model<IBatchJob> = mongoose.model<IBatchJob>(
  "BatchJob",
  BatchJobSchema
);
