import mongoose, { Schema } from "mongoose";

export const MAILBOX_PROVIDERS = ["gmail", "outlook", "smtp"];
export const MAILBOX_STATUSES = ["active", "paused", "error", "disconnected", "rate_limited"];
export const HEALTH_STATUSES = ["excellent", "good", "fair", "poor"];

const HealthSchema = new Schema(
  {
    score: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: HEALTH_STATUSES,
      default: "excellent",
    },
    bounceCount: {
      type: Number,
      default: 0,
    },
    spamComplaintCount: {
      type: Number,
      default: 0,
    },
    consecutiveFailures: {
      type: Number,
      default: 0,
    },
    lastTestedAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const MailboxSchema = new Schema(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: MAILBOX_PROVIDERS,
      required: [true, "Mailbox provider is required"],
    },

    email: {
      type: String,
      required: [true, "Mailbox email address is required"],
      lowercase: true,
      trim: true,
    },

    name: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

    dailyLimit: {
      type: Number,
      default: 50,
      min: 1,
      max: 2000,
    },

    sentToday: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastResetDate: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: MAILBOX_STATUSES,
      default: "active",
      index: true,
    },

    health: {
      type: HealthSchema,
      default: () => ({}),
    },

    tokenExpiresAt: {
      type: Date,
      default: null,
    },

    smtpConfig: {
      host: { type: String, default: null },
      port: { type: Number, default: null },
      secure: { type: Boolean, default: false },
      username: { type: String, default: null },
    },

    imapConfig: {
      host: { type: String, default: null },
      port: { type: Number, default: null },
      secure: { type: Boolean, default: false },
      username: { type: String, default: null },
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    warmupEnabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

MailboxSchema.index({ workspaceId: 1, email: 1 }, { unique: true });
MailboxSchema.index({ workspaceId: 1, status: 1 });
MailboxSchema.index({ workspaceId: 1, isDefault: 1 });

/**
 * Checks if daily limit needs reset (if current UTC date differs from lastResetDate).
 * Resets sentToday to 0 if rolled over.
 */
MailboxSchema.methods.checkAndResetDailyQuota = function () {
  const now = new Date();
  const last = this.lastResetDate ? new Date(this.lastResetDate) : new Date(0);

  const isSameDay =
    now.getUTCFullYear() === last.getUTCFullYear() &&
    now.getUTCMonth() === last.getUTCMonth() &&
    now.getUTCDate() === last.getUTCDate();

  if (!isSameDay) {
    this.sentToday = 0;
    this.lastResetDate = now;
  }
};

/**
 * Helper to determine if mailbox can currently send an email.
 */
MailboxSchema.methods.canSend = function () {
  this.checkAndResetDailyQuota();

  if (this.status !== "active") {
    return {
      allowed: false,
      reason: `Mailbox is currently ${this.status}`,
    };
  }

  if (this.sentToday >= this.dailyLimit) {
    return {
      allowed: false,
      reason: `Daily sending limit (${this.dailyLimit}) reached for today`,
    };
  }

  return { allowed: true };
};

/**
 * Increments sent counter and saves.
 */
MailboxSchema.methods.recordSendSuccess = async function () {
  this.checkAndResetDailyQuota();
  this.sentToday += 1;
  this.health.consecutiveFailures = 0;
  if (this.health.score < 100) {
    this.health.score = Math.min(100, this.health.score + 1);
  }
  this.health.status = this.health.score >= 90 ? "excellent" : this.health.score >= 70 ? "good" : "fair";
  return this.save();
};

/**
 * Records failure, adjusts health score and sets error status if consecutive failures >= 3.
 */
MailboxSchema.methods.recordSendFailure = async function (errorMessage) {
  this.health.consecutiveFailures = (this.health.consecutiveFailures || 0) + 1;
  this.health.lastError = errorMessage ? String(errorMessage).slice(0, 500) : "Send failure";
  this.health.score = Math.max(0, this.health.score - 15);
  
  if (this.health.score < 50 || this.health.consecutiveFailures >= 3) {
    this.status = "error";
    this.health.status = "poor";
  } else if (this.health.score < 70) {
    this.health.status = "fair";
  }

  return this.save();
};

export const Mailbox = mongoose.model("Mailbox", MailboxSchema);
