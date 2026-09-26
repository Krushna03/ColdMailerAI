import mongoose, { Schema, Types, Model } from "mongoose";

export const EMAIL_SEND_STATUSES = ["generated", "sent"] as const;
export type EmailSendStatus = (typeof EMAIL_SEND_STATUSES)[number];

export interface IChatEmail {
  _id?: Types.ObjectId;
  prompt: string;
  generatedEmail: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IEmail {
  _id: Types.ObjectId;
  prompt: string;
  generatedEmail: string;
  userId: Types.ObjectId;
  workspaceId?: Types.ObjectId | null;
  createdBy?: Types.ObjectId | null;
  leadId?: Types.ObjectId | null;
  sendStatus: EmailSendStatus;
  sentAt?: Date | null;
  chatEmails: IChatEmail[];
  createdAt: Date;
  updatedAt: Date;
}

const UpdateEmailSchema = new Schema<IChatEmail>(
  {
    prompt: {
      type: String,
      required: true,
    },
    generatedEmail: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const EmailSchema = new Schema<IEmail>(
  {
    prompt: {
      type: String,
      required: true,
    },
    generatedEmail: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },
    sendStatus: {
      type: String,
      enum: EMAIL_SEND_STATUSES,
      default: "generated",
    },
    sentAt: {
      type: Date,
      default: null,
    },
    chatEmails: [UpdateEmailSchema],
  },
  { timestamps: true }
);

EmailSchema.index({ userId: 1, createdAt: -1 });
EmailSchema.index({ userId: 1, leadId: 1 });
EmailSchema.index({ leadId: 1, sendStatus: 1 });
EmailSchema.index({ workspaceId: 1, createdAt: -1 });
EmailSchema.index({ workspaceId: 1, leadId: 1 });

export const Email: Model<IEmail> = mongoose.model<IEmail>("Email", EmailSchema);
