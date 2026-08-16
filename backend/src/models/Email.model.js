import mongoose, { Schema } from 'mongoose';

export const EMAIL_SEND_STATUSES = ['generated', 'sent'];

const UpdateEmailSchema = new Schema({
    prompt: {
      type: String,
      required: true
    },

    generatedEmail: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

const EmailSchema = new Schema({
    prompt: {
      type: String,
      required: true
    },

    generatedEmail: {
      type: String,
      required: true
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    leadId: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      default: null
    },

    sendStatus: {
      type: String,
      enum: EMAIL_SEND_STATUSES,
      default: 'generated'
    },

    sentAt: {
      type: Date,
      default: null
    },

    chatEmails: [UpdateEmailSchema]
  },
  { timestamps: true }
);

EmailSchema.index({ userId: 1, createdAt: -1 });
EmailSchema.index({ userId: 1, leadId: 1 });
EmailSchema.index({ leadId: 1, sendStatus: 1 });

export const Email = mongoose.model('Email', EmailSchema);
