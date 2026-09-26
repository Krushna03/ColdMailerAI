import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export const FOLLOW_UP_STATUSES = ['pending', 'done', 'skipped'] as const;
export type FollowUpStatus = typeof FOLLOW_UP_STATUSES[number];

export interface IFollowUp extends Document {
  leadId: Types.ObjectId;
  userId: Types.ObjectId;
  workspaceId: Types.ObjectId | null;
  createdBy: Types.ObjectId | null;
  assignedTo: Types.ObjectId | null;
  dueAt: Date;
  note?: string;
  status: FollowUpStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const FollowUpSchema = new Schema<IFollowUp>(
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

export const FollowUp: Model<IFollowUp> = mongoose.model<IFollowUp>('FollowUp', FollowUpSchema);
