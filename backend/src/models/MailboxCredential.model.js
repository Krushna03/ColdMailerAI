import mongoose, { Schema } from "mongoose";

const MailboxCredentialSchema = new Schema(
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

export const MailboxCredential = mongoose.model("MailboxCredential", MailboxCredentialSchema);
