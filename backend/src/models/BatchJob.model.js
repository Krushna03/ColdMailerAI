import mongoose, { Schema } from 'mongoose';

const BatchJobResultSchema = new Schema({
  leadId: {
    type: Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  leadName: {
    type: String,
    default: ''
  },
  leadEmail: {
    type: String,
    default: ''
  },
  leadCompany: {
    type: Schema.Types.Mixed,
    default: ''
  },
  success: {
    type: Boolean,
    required: true
  },
  emailId: {
    type: Schema.Types.ObjectId,
    ref: 'Email',
    default: null
  },
  generatedEmail: {
    type: String,
    default: null
  },
  error: {
    type: String,
    default: null
  }
});

const BatchJobSchema = new Schema(
  {
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
    leadIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Lead',
        required: true
      }
    ],
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'completed_with_errors', 'failed', 'cancelled'],
      default: 'pending'
    },
    totalLeads: {
      type: Number,
      required: true
    },
    processedLeads: {
      type: Number,
      default: 0
    },
    successCount: {
      type: Number,
      default: 0
    },
    failureCount: {
      type: Number,
      default: 0
    },
    instructions: {
      type: String,
      default: ''
    },
    purpose: {
      type: String,
      default: ''
    },
    tone: {
      type: String,
      default: 'professional'
    },
    results: [BatchJobResultSchema]
  },
  { timestamps: true }
);

BatchJobSchema.index({ userId: 1, createdAt: -1 });
BatchJobSchema.index({ workspaceId: 1, createdAt: -1 });

export const BatchJob = mongoose.model('BatchJob', BatchJobSchema);
