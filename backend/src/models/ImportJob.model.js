import mongoose, { Schema } from "mongoose";

export const IMPORT_JOB_STATUSES = [
  "pending",
  "processing",
  "completed",
  "completed_with_errors",
  "failed",
  "cancelled"
];

const ImportErrorSchema = new Schema(
  {
    row: {
      type: Number,
      default: 0
    },
    email: {
      type: String,
      default: ""
    },
    message: {
      type: String,
      default: ""
    }
  },
  { _id: false }
);

const ImportJobSchema = new Schema(
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

    status: {
      type: String,
      enum: IMPORT_JOB_STATUSES,
      default: "pending",
      index: true
    },

    totalRows: {
      type: Number,
      required: true,
      min: 0
    },

    processedRows: {
      type: Number,
      default: 0,
      min: 0
    },

    validCount: {
      type: Number,
      default: 0,
      min: 0
    },

    invalidCount: {
      type: Number,
      default: 0,
      min: 0
    },

    riskyCount: {
      type: Number,
      default: 0,
      min: 0
    },

    disposableCount: {
      type: Number,
      default: 0,
      min: 0
    },

    catchAllCount: {
      type: Number,
      default: 0,
      min: 0
    },

    duplicateCount: {
      type: Number,
      default: 0,
      min: 0
    },

    insertedCount: {
      type: Number,
      default: 0,
      min: 0
    },

    insertedLeadIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Lead"
      }
    ],

    errors: [ImportErrorSchema],

    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "LeadCategory",
      default: null
    },

    fileName: {
      type: String,
      default: "import.csv"
    },

    fileSize: {
      type: Number,
      default: 0
    },

    verifyEmails: {
      type: Boolean,
      default: true
    },

    payload: {
      type: [Schema.Types.Mixed],
      default: []
    },

    startedAt: {
      type: Date,
      default: null
    },

    completedAt: {
      type: Date,
      default: null
    },

    lockedAt: {
      type: Date,
      default: null,
      index: true
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0
    },

    maxAttempts: {
      type: Number,
      default: 3,
      min: 1
    },

    failedReason: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

ImportJobSchema.index({ userId: 1, createdAt: -1 });
ImportJobSchema.index({ workspaceId: 1, createdAt: -1 });
ImportJobSchema.index({ status: 1, lockedAt: 1, attempts: 1 });

export const ImportJob = mongoose.model("ImportJob", ImportJobSchema);
