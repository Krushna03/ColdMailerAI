import mongoose, { Schema, Model, Types, Document } from "mongoose";

export interface IMailboxCredential {
  _id: Types.ObjectId;
  mailboxId: Types.ObjectId;
  workspaceId: Types.ObjectId;
  provider: "gmail" | "outlook" | "smtp";
  authType: "oauth2" | "password";
  encryptedData: string;
  iv: string;
  authTag: string;
  algorithm: string;
  keyVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export type MailboxCredentialModelType = Model<IMailboxCredential>;
export type IMailboxCredentialDocument = Document<unknown, {}, IMailboxCredential> &
  IMailboxCredential;

const MailboxCredentialSchema = new Schema<IMailboxCredential, MailboxCredentialModelType>(
  {
    mailboxId: {
      type: Schema.Types.ObjectId,
      ref: "Mailbox",
      required: true,
      unique: true,
      index: true,
    },

    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["gmail", "outlook", "smtp"],
      required: true,
    },

    authType: {
      type: String,
      enum: ["oauth2", "password"],
      required: true,
    },

    // Sensitive AES-256-GCM ciphertext — NEVER selected by default
    encryptedData: {
      type: String,
      required: true,
      select: false,
    },

    iv: {
      type: String,
      required: true,
      select: false,
    },

    authTag: {
      type: String,
      required: true,
      select: false,
    },

    algorithm: {
      type: String,
      default: "aes-256-gcm",
    },

    keyVersion: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

MailboxCredentialSchema.index({ workspaceId: 1, mailboxId: 1 });

export const MailboxCredential =
  (mongoose.models.MailboxCredential as MailboxCredentialModelType) ||
  mongoose.model<IMailboxCredential, MailboxCredentialModelType>(
    "MailboxCredential",
    MailboxCredentialSchema
  );
