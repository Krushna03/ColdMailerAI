import mongoose, { Schema, Model, Types, Document } from "mongoose";

export const IMPORT_JOB_STATUSES = [
  "pending",
  "processing",
  "completed",
  "completed_with_errors",
  "failed",
  "cancelled",
] as const;

export type ImportJobStatus = (typeof IMPORT_JOB_STATUSES)[number];

export interface IImportError {
  row: number;
  email: string;
  message: string;
}

export interface IImportJob {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  workspaceId?: Types.ObjectId | null;
  status: ImportJobStatus;
  totalRows: number;
  processedRows: number;
  validCount: number;
  invalidCount: number;
  riskyCount: number;
  disposableCount: number;
  catchAllCount: number;
  duplicateCount: number;
  insertedCount: number;
  insertedLeadIds: Types.ObjectId[];
  errors: IImportError[];
  categoryId?: Types.ObjectId | null;
  fileName: string;
  fileSize: number;
  verifyEmails: boolean;
  payload: any[];
  startedAt?: Date | null;
  completedAt?: Date | null;
  lockedAt?: Date | null;
  attempts: number;
  maxAttempts: number;
  failedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IImportJobDocument = Document<unknown, {}, IImportJob> & IImportJob;

export type ImportJobModelType = Model<IImportJob>;

const ImportErrorSchema = new Schema<IImportError>(
  {
    row: {
      type: Number,
      default: 0,
    },
    email: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const ImportJobSchema = new Schema<IImportJob, ImportJobModelType>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: IMPORT_JOB_STATUSES,
      default: "pending",
      index: true,
    },

    totalRows: {
      type: Number,
      required: true,
      min: 0,
    },

    processedRows: {
      type: Number,
      default: 0,
      min: 0,
    },

    validCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    invalidCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    riskyCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    disposableCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    catchAllCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    duplicateCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    insertedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    insertedLeadIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Lead",
      },
    ],

    errors: [ImportErrorSchema],

    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "LeadCategory",
      default: null,
    },

    fileName: {
      type: String,
      default: "import.csv",
    },

    fileSize: {
      type: Number,
      default: 0,
    },

    verifyEmails: {
      type: Boolean,
      default: true,
    },

    payload: {
      type: [Schema.Types.Mixed] as any,
      default: [],
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    lockedAt: {
      type: Date,
      default: null,
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxAttempts: {
      type: Number,
      default: 3,
      min: 1,
    },

    failedReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

ImportJobSchema.index({ userId: 1, createdAt: -1 });
ImportJobSchema.index({ workspaceId: 1, createdAt: -1 });
ImportJobSchema.index({ status: 1, lockedAt: 1, attempts: 1 });

export const ImportJob =
  (mongoose.models.ImportJob as ImportJobModelType) ||
  mongoose.model<IImportJob, ImportJobModelType>("ImportJob", ImportJobSchema);
