import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ISegmentFilters {
  jobTitle?: string[];
  industry?: string[];
  companySize?: string[];
  status?: string[];
  tags?: string[];
  categoryId?: Types.ObjectId | null;
  assignedTo?: Types.ObjectId | null;
  source?: string[];
  location?: string[];
  lastContactedBefore?: Date | null;
  lastContactedDaysAgo?: number | null;
  nextFollowUpBefore?: Date | null;
  hasEmail?: boolean | null;
  hasPhone?: boolean | null;
  customFields?: Record<string, any>;
  search?: string;
}

export interface ISegment {
  name: string;
  description?: string;
  filters: ISegmentFilters;
  color: string;
  icon: string;
  isStarred: boolean;
  userId: Types.ObjectId;
  workspaceId?: Types.ObjectId | null;
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ISegmentDocument = Document<unknown, {}, ISegment> & ISegment;

const SegmentFiltersSchema = new Schema<ISegmentFilters>(
  {
    jobTitle: {
      type: [String],
      default: []
    },
    industry: {
      type: [String],
      default: []
    },
    companySize: {
      type: [String],
      default: []
    },
    status: {
      type: [String],
      default: []
    },
    tags: {
      type: [String],
      default: []
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'LeadCategory',
      default: null
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    source: {
      type: [String],
      default: []
    },
    location: {
      type: [String],
      default: []
    },
    lastContactedBefore: {
      type: Date,
      default: null
    },
    lastContactedDaysAgo: {
      type: Number,
      default: null
    },
    nextFollowUpBefore: {
      type: Date,
      default: null
    },
    hasEmail: {
      type: Boolean,
      default: null
    },
    hasPhone: {
      type: Boolean,
      default: null
    },
    customFields: {
      type: Schema.Types.Mixed,
      default: () => ({})
    },
    search: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const SegmentSchema = new Schema<ISegment>(
  {
    name: {
      type: String,
      required: [true, 'Segment name is required'],
      trim: true,
      maxlength: 100
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },

    filters: {
      type: SegmentFiltersSchema,
      default: () => ({})
    },

    color: {
      type: String,
      trim: true,
      default: 'brand'
    },

    icon: {
      type: String,
      trim: true,
      default: 'filter'
    },

    isStarred: {
      type: Boolean,
      default: false
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      default: null,
      index: true
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

SegmentSchema.index({ workspaceId: 1, createdAt: -1 });
SegmentSchema.index({ workspaceId: 1, name: 1 });
SegmentSchema.index({ userId: 1, createdAt: -1 });

export const Segment: Model<ISegment> = mongoose.model<ISegment>('Segment', SegmentSchema);
