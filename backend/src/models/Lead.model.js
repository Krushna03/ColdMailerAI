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

export const EMAIL_VERIFICATION_STATUSES = [
  'unknown',
  'valid',
  'invalid',
  'risky',
  'catch_all',
  'disposable'
];

const EmailVerificationSubSchema = new Schema(
  {
    status: {
      type: String,
      enum: EMAIL_VERIFICATION_STATUSES,
      default: 'unknown'
    },
    provider: {
      type: String,
      default: 'built-in'
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    reason: {
      type: String,
      default: ''
    },
    mxRecords: {
      type: [String],
      default: []
    },
    checkedAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const CompanySubSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      default: ''
    },
    domain: {
      type: String,
      trim: true,
      default: ''
    },
    industry: {
      type: String,
      trim: true,
      default: ''
    },
    size: {
      type: String,
      trim: true,
      default: ''
    },
    revenue: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const LeadSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },

    phone: {
      type: String,
      trim: true,
      default: ''
    },

    company: {
      type: CompanySubSchema,
      default: () => ({}),
      set: function (val) {
        if (typeof val === 'string') {
          return { name: val };
        }
        return val;
      }
    },

    jobTitle: {
      type: String,
      trim: true,
      default: ''
    },

    role: {
      type: String,
      trim: true,
      default: ''
    },

    linkedinUrl: {
      type: String,
      trim: true,
      default: ''
    },

    location: {
      type: String,
      trim: true,
      default: ''
    },

    timezone: {
      type: String,
      trim: true,
      default: ''
    },

    customFields: {
      type: Schema.Types.Mixed,
      default: () => ({})
    },

    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: 'new'
    },

    emailVerification: {
      type: EmailVerificationSubSchema,
      default: () => ({
        status: 'unknown',
        provider: 'built-in',
        score: 0,
        reason: '',
        mxRecords: [],
        checkedAt: null
      })
    },

    source: {
      type: String,
      trim: true,
      default: 'manual'
    },

    tags: {
      type: [String],
      default: []
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
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    }
  },
  { timestamps: true, minimize: false }
);


LeadSchema.pre('init', function (raw) {
  if (raw && typeof raw.company === 'string') {
    raw.company = { name: raw.company };
  }
  if (raw && raw.role && !raw.jobTitle) {
    raw.jobTitle = raw.role;
  }
  else if (raw && raw.jobTitle && !raw.role) {
    raw.role = raw.jobTitle;
  }
});


LeadSchema.pre('validate', function (next) {
  if (typeof this.company === 'string') {
    this.company = { name: this.company };
  }
  if (this.jobTitle && !this.role) {
    this.role = this.jobTitle;
  }
  else if (this.role && !this.jobTitle) {
    this.jobTitle = this.role;
  }
  if (Array.isArray(this.tags)) {
    this.tags = [...new Set(this.tags.map((t) => String(t).trim()).filter(Boolean))];
  }

  next();
});

LeadSchema.index({ userId: 1, createdAt: -1 });
LeadSchema.index({ userId: 1, status: 1 });
LeadSchema.index({ userId: 1, nextFollowUpAt: 1 });
LeadSchema.index({ userId: 1, categoryId: 1 });
LeadSchema.index({ userId: 1, tags: 1 });
LeadSchema.index({ userId: 1, jobTitle: 1 });
LeadSchema.index(
  { userId: 1, categoryId: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: "string", $gt: "" } }
  }
);

LeadSchema.index({ userId: 1, 'emailVerification.status': 1 });
LeadSchema.index({ workspaceId: 1, 'emailVerification.status': 1 });

LeadSchema.index({ workspaceId: 1, createdAt: -1 });
LeadSchema.index({ workspaceId: 1, status: 1 });
LeadSchema.index({ workspaceId: 1, nextFollowUpAt: 1 });
LeadSchema.index({ workspaceId: 1, categoryId: 1 });
LeadSchema.index({ workspaceId: 1, assignedTo: 1 });
LeadSchema.index({ workspaceId: 1, tags: 1 });
LeadSchema.index({ workspaceId: 1, "company.name": 1 });
LeadSchema.index({ workspaceId: 1, "company.industry": 1 });
LeadSchema.index({ workspaceId: 1, jobTitle: 1 });
LeadSchema.index({ workspaceId: 1, lastActivityAt: 1 });

export const Lead = mongoose.model('Lead', LeadSchema);
