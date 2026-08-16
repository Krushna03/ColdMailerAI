import mongoose, { Schema } from 'mongoose';

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'replied',
  'meeting',
  'closed',
  'archived'
];

export const STATUS_TRANSITIONS = {
  new: ['contacted', 'archived'],
  contacted: ['replied', 'archived'],
  replied: ['meeting', 'closed', 'archived'],
  meeting: ['closed', 'archived'],
  closed: ['archived'],
  archived: ['new']
};

export const isValidStatusTransition = (currentStatus, newStatus) => {
  if (currentStatus === newStatus) return true;
  const allowed = STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(newStatus);
};

const LeadSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true
    },

    company: {
      type: String,
      trim: true,
      default: ''
    },

    role: {
      type: String,
      trim: true,
      default: ''
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },

    notes: {
      type: String,
      trim: true,
      default: ''
    },

    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'LeadCategory',
      default: null
    },

    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: 'new'
    },

    emailsGeneratedCount: {
      type: Number,
      default: 0,
      min: 0
    },

    emailsSentCount: {
      type: Number,
      default: 0,
      min: 0
    },

    lastActivityAt: {
      type: Date,
      default: null
    },

    nextFollowUpAt: {
      type: Date,
      default: null
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

LeadSchema.index({ userId: 1, createdAt: -1 });
LeadSchema.index({ userId: 1, status: 1 });
LeadSchema.index({ userId: 1, nextFollowUpAt: 1 });
LeadSchema.index({ userId: 1, categoryId: 1 });
LeadSchema.index(
  { userId: 1, categoryId: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: "string", $gt: "" } }
  }
);

export const Lead = mongoose.model('Lead', LeadSchema);
