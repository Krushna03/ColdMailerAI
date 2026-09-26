export type LeadStatus =
  | "new"
  | "contacted"
  | "replied"
  | "meeting"
  | "closed"
  | "archived";

export type EmailVerificationStatus =
  | "unknown"
  | "valid"
  | "invalid"
  | "risky"
  | "catch_all"
  | "disposable";

export type FollowUpStatus = "pending" | "done" | "skipped";

export interface LeadCompany {
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  revenue?: string;
}

export interface EmailVerification {
  status: EmailVerificationStatus;
  provider?: string;
  score?: number;
  reason?: string;
  mxRecords?: string[];
  checkedAt?: string | Date | null;
}

export interface FollowUp {
  _id: string;
  leadId: string;
  dueAt: string;
  note?: string;
  status: FollowUpStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isDefault?: boolean;
  userId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Lead {
  _id: string;
  userId: string;
  workspaceId?: string | null;
  name: string;
  email: string;
  company?: LeadCompany | string;
  role?: string;
  jobTitle?: string;
  notes?: string;
  status: LeadStatus;
  categoryId?: string | LeadCategory | null;
  tags?: string[];
  customFields?: Record<string, any>;
  emailVerification?: EmailVerification;
  nextFollowUpAt?: string | null;
  lastContactedAt?: string | null;
  lastActivityAt?: string | null;
  followUps?: FollowUp[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadFilterParams {
  status?: string | null;
  verificationStatus?: string | null;
  overdueOnly?: boolean;
  categoryId?: string | null;
  search?: string | null;
  tags?: string | string[] | null;
  segmentId?: string | null;
}

export interface ImportJobSummary {
  _id: string;
  userId?: string;
  workspaceId?: string | null;
  status: "pending" | "processing" | "completed" | "completed_with_errors" | "failed" | "cancelled";
  totalRows: number;
  processedRows: number;
  validCount: number;
  invalidCount: number;
  riskyCount: number;
  disposableCount: number;
  catchAllCount: number;
  duplicateCount: number;
  insertedCount: number;
  errors?: Array<{ row: number; email: string; message: string }>;
  fileName?: string;
  fileSize?: number;
  verifyEmails?: boolean;
  startedAt?: string | null;
  completedAt?: string | null;
  attempts?: number;
  maxAttempts?: number;
}

export interface BatchJobSummary {
  _id: string;
  userId?: string;
  status: "pending" | "processing" | "completed" | "completed_with_errors" | "failed" | "cancelled";
  totalLeads: number;
  processedLeads: number;
  successfulCount: number;
  failedCount: number;
  successCount?: number;
  failureCount?: number;
  results?: any[];
  leadIds?: string[];
  purpose?: string;
  tone?: string;
  createdAt?: string;
  updatedAt?: string;
}
