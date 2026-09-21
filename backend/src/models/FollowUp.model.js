import mongoose, { Schema } from 'mongoose';

export const FOLLOW_UP_STATUSES = ['pending', 'done', 'skipped'];

export const FollowUpSchema = new Schema(
  {
    leadId: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      required: true
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
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    dueAt: {
      type: Date,
      required: true
    },
    note: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: FOLLOW_UP_STATUSES,
      default: 'pending'
    }
  },
  { timestamps: true }
);

FollowUpSchema.index({ leadId: 1, dueAt: 1 });
FollowUpSchema.index({ userId: 1, status: 1 });
FollowUpSchema.index({ userId: 1, dueAt: 1 });
FollowUpSchema.index({ workspaceId: 1, status: 1 });
FollowUpSchema.index({ workspaceId: 1, dueAt: 1 });

export const FollowUp = mongoose.model('FollowUp', FollowUpSchema);
