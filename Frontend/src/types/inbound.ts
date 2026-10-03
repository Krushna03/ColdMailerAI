export type ReplyCategory =
  | "interested"
  | "meeting_request"
  | "objection"
  | "out_of_office"
  | "wrong_person"
  | "not_interested"
  | "unsubscribe"
  | "neutral"
  | "unknown";

export type ReplySentiment = "positive" | "negative" | "neutral";

export type InboundSource = "webhook" | "imap" | "simulation" | "manual";

export interface ReplyClassification {
  category: ReplyCategory;
  sentiment: ReplySentiment;
  confidence: number;
  summary?: string;
  suggestedAction?: string;
  classifiedAt?: string;
}

export interface InboundEmail {
  _id: string;
  workspaceId: string;
  userId: string;
  mailboxId?: {
    _id: string;
    email: string;
    provider: string;
    name?: string;
  };
  leadId?: {
    _id: string;
    name: string;
    email: string;
    company?: { name: string } | string;
    jobTitle?: string;
    status: string;
    phone?: string;
    tags?: string[];
    linkedinUrl?: string;
  };
  sequenceId?: {
    _id: string;
    name: string;
    status: string;
  };
  enrollmentId?: {
    _id: string;
    status: string;
    currentStepOrder: number;
    stepHistory?: any[];
  };
  emailId?: string;
  sendJobId?: string;
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  from: {
    name?: string;
    email: string;
  };
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  headers?: Record<string, string>;
  classification: ReplyClassification;
  isRead: boolean;
  source: InboundSource;
  metadata?: Record<string, any>;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface InboundStats {
  total: number;
  unreadCount: number;
  categories: Record<ReplyCategory, number>;
  interestedTotal: number;
}
