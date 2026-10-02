import mongoose, { Schema, Model, Types, Document } from "mongoose";

export const SEQUENCE_STATUSES = ["draft", "active", "paused", "archived"] as const;

export type SequenceStatus = (typeof SEQUENCE_STATUSES)[number];

export interface ISequenceSettings {
  stopOnReply: boolean;
  stopOnClick: boolean;
  stopOnMeetingBooked: boolean;
  sendOnDays: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday. Default: [1,2,3,4,5]
  sendWindow: {
    enabled: boolean;
    start: string; // e.g. "09:00"
    end: string;   // e.g. "17:00"
    timezone: string; // e.g. "UTC"
  };
  mailboxId?: Types.ObjectId | null;
  trackOpens: boolean;
  trackClicks: boolean;
  maxDailyEnrollments?: number;
}

export interface ISequenceEnrollmentRules {
  allowReenrollment: boolean;
  stopIfLeadStatus: string[];
  autoEnrollSegmentId?: Types.ObjectId | null;
  requiredTags?: string[];
  excludedTags?: string[];
}

export interface ISequenceStats {
  totalEnrolled: number;
  activeCount: number;
  completedCount: number;
  repliedCount: number;
  bouncedCount: number;
  stoppedCount: number;
}

export interface ISequence {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  description?: string;
  status: SequenceStatus;
  settings: ISequenceSettings;
  enrollmentRules: ISequenceEnrollmentRules;
  stepsCount: number;
  stats: ISequenceStats;
  createdAt: Date;
  updatedAt: Date;
}

export type ISequenceDocument = Document<unknown, {}, ISequence> & ISequence;

const SequenceSettingsSchema = new Schema<ISequenceSettings>(
  {
    stopOnReply: {
      type: Boolean,
      default: true,
    },
    stopOnClick: {
      type: Boolean,
      default: false,
    },
    stopOnMeetingBooked: {
      type: Boolean,
      default: true,
    },
    sendOnDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5], // Monday through Friday
    },
    sendWindow: {
      enabled: {
        type: Boolean,
        default: false,
      },
      start: {
        type: String,
        default: "09:00",
      },
      end: {
        type: String,
        default: "17:00",
      },
      timezone: {
        type: String,
        default: "UTC",
      },
    },
    mailboxId: {
      type: Schema.Types.ObjectId,
      ref: "Mailbox",
      default: null,
    },
    trackOpens: {
      type: Boolean,
      default: true,
    },
    trackClicks: {
      type: Boolean,
      default: true,
    },
    maxDailyEnrollments: {
      type: Number,
      default: 100,
    },
  },
  { _id: false }
);


const SequenceEnrollmentRulesSchema = new Schema<ISequenceEnrollmentRules>(
  {
    allowReenrollment: {
      type: Boolean,
      default: false,
    },
    stopIfLeadStatus: {
      type: [String],
      default: ["replied", "meeting", "closed", "archived"],
    },
    autoEnrollSegmentId: {
      type: Schema.Types.ObjectId,
      ref: "Segment",
      default: null,
    },
    requiredTags: {
      type: [String],
      default: [],
    },
    excludedTags: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);


const SequenceStatsSchema = new Schema<ISequenceStats>(
  {
    totalEnrolled: {
      type: Number,
      default: 0,
    },
    activeCount: {
      type: Number,
      default: 0,
    },
    completedCount: {
      type: Number,
      default: 0,
    },
    repliedCount: {
      type: Number,
      default: 0,
    },
    bouncedCount: {
      type: Number,
      default: 0,
    },
    stoppedCount: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const SequenceSchema = new Schema<ISequence>(
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
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: SEQUENCE_STATUSES,
      default: "draft",
      index: true,
    },
    settings: {
      type: SequenceSettingsSchema,
      default: () => ({}),
    },
    enrollmentRules: {
      type: SequenceEnrollmentRulesSchema,
      default: () => ({}),
    },
    stepsCount: {
      type: Number,
      default: 0,
    },
    stats: {
      type: SequenceStatsSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

SequenceSchema.index({ workspaceId: 1, status: 1 });

SequenceSchema.index({ workspaceId: 1, createdAt: -1 });

export const Sequence: Model<ISequence> = mongoose.model<ISequence>("Sequence", SequenceSchema);
