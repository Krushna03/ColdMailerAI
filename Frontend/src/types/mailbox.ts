export type MailboxProvider = "gmail" | "outlook" | "smtp";

export type MailboxStatus =
  | "active"
  | "paused"
  | "error"
  | "disconnected"
  | "rate_limited";

export type HealthStatus = "excellent" | "good" | "fair" | "poor";

export interface MailboxHealth {
  score: number;
  status: HealthStatus;
  bounceCount: number;
  spamComplaintCount: number;
  consecutiveFailures: number;
  lastTestedAt?: string | Date | null;
  lastError?: string | null;
}

export interface SmtpConfig {
  host?: string | null;
  port?: number | null;
  secure?: boolean;
  username?: string | null;
}

export interface ImapConfig {
  host?: string | null;
  port?: number | null;
  secure?: boolean;
  username?: string | null;
}

export interface Mailbox {
  _id: string;
  workspaceId: string;
  userId: string;
  provider: MailboxProvider;
  email: string;
  name?: string;
  dailyLimit: number;
  sentToday: number;
  lastResetDate: string | Date;
  status: MailboxStatus;
  health: MailboxHealth;
  tokenExpiresAt?: string | Date | null;
  smtpConfig?: SmtpConfig;
  imapConfig?: ImapConfig;
  isDefault: boolean;
  warmupEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectSmtpPayload {
  email: string;
  name?: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  imapUser?: string;
  imapPass?: string;
  dailyLimit?: number;
}

export interface UpdateMailboxPayload {
  mailboxId: string;
  name?: string;
  dailyLimit?: number;
  status?: "active" | "paused";
  isDefault?: boolean;
  warmupEnabled?: boolean;
}

export interface SendMailboxEmailPayload {
  mailboxId: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  leadId?: string;
  emailId?: string;
}
