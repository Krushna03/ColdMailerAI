export interface ChatEmail {
  _id?: string;
  prompt: string;
  generatedEmail: string;
  createdAt?: string;
  updatedAt?: string;
}

export type EmailSendStatus = "generated" | "sent";

export interface EmailRecord {
  _id: string;
  prompt: string;
  generatedEmail: string;
  userId: string;
  workspaceId?: string | null;
  createdBy?: string | null;
  leadId?: string | null;
  sendStatus: EmailSendStatus;
  sentAt?: string | null;
  chatEmails?: ChatEmail[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EmailHistoryItem {
  _id: string;
  prompt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanUsageSummary {
  planName?: string;
  monthlyLimit?: number | null;
  monthlyUsed?: number;
  remaining?: number | null;
  percentUsed?: number;
  billingPeriodEnd?: string | null;
  [key: string]: any;
}

export interface BatchJobResult {
  leadId: string;
  leadName: string;
  leadEmail?: string;
  leadCompany?: string | any;
  success: boolean;
  emailId?: string | null;
  generatedEmail?: string | null;
  error?: string | null;
}

export type BatchJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "completed_with_errors"
  | "failed"
  | "cancelled";

export interface BatchJob {
  _id: string;
  userId?: string;
  workspaceId?: string | null;
  leadIds?: string[];
  status: BatchJobStatus;
  totalLeads: number;
  processedLeads: number;
  successCount?: number;
  successfulCount?: number;
  failureCount?: number;
  failedCount?: number;
  instructions?: string;
  purpose?: string;
  tone?: string;
  results?: BatchJobResult[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcessedEmail {
  email: string;
  content: string;
  isValid: boolean;
}

export interface ExtractionValidation {
  isValid: boolean;
  hasMissingElements: {
    subjectLine: boolean;
    greeting: boolean;
    callToAction: boolean;
    signature: boolean;
    additionalContent: boolean;
  };
}
