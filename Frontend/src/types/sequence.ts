export type SequenceStatus = "draft" | "active" | "paused" | "archived";

export type StepType = "email" | "wait" | "condition" | "task" | "webhook" | "ai_action";

export interface StepDelay {
  value: number;
  unit: "minutes" | "hours" | "days";
}

export interface StepTemplate {
  subject?: string;
  body?: string;
  templateId?: string | null;
  aiPrompt?: string;
}

export interface StepConditions {
  field?: "replyReceived" | "emailOpened" | "leadStatus" | "customField" | "none";
  operator?: "equals" | "not_equals" | "contains" | "is_true" | "is_false";
  value?: any;
  actionOnFalse?: "stop" | "skip" | "jump_to";
  jumpToStepOrder?: number | null;
}

export interface StepTaskConfig {
  title?: string;
  description?: string;
  assignedTo?: string | null;
}

export interface StepWebhookConfig {
  url?: string;
  method?: "POST" | "GET";
  headers?: Record<string, string>;
}

export interface StepAiActionConfig {
  actionType?: "generate_personalized_intro" | "analyze_lead" | "custom_prompt";
  prompt?: string;
  outputField?: string;
}

export interface StepStats {
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  repliedCount: number;
  failedCount: number;
}

export interface SequenceStep {
  _id?: string;
  sequenceId?: string;
  workspaceId?: string;
  order: number;
  type: StepType;
  title?: string;
  delay: StepDelay;
  template?: StepTemplate;
  conditions?: StepConditions;
  taskConfig?: StepTaskConfig;
  webhookConfig?: StepWebhookConfig;
  aiActionConfig?: StepAiActionConfig;
  stats?: StepStats;
  createdAt?: string;
  updatedAt?: string;
}

export interface SequenceSettings {
  stopOnReply: boolean;
  stopOnClick: boolean;
  stopOnMeetingBooked: boolean;
  sendOnDays: number[];
  sendWindow: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  mailboxId?: string | any | null;
  trackOpens: boolean;
  trackClicks: boolean;
  maxDailyEnrollments?: number;
}

export interface SequenceEnrollmentRules {
  allowReenrollment: boolean;
  stopIfLeadStatus: string[];
  autoEnrollSegmentId?: string | null;
  requiredTags?: string[];
  excludedTags?: string[];
}

export interface SequenceStats {
  totalEnrolled: number;
  activeCount: number;
  completedCount: number;
  repliedCount: number;
  bouncedCount: number;
  stoppedCount: number;
}

export interface Sequence {
  _id: string;
  workspaceId: string;
  userId: string;
  name: string;
  description?: string;
  status: SequenceStatus;
  settings: SequenceSettings;
  enrollmentRules: SequenceEnrollmentRules;
  stepsCount: number;
  steps?: SequenceStep[];
  stats: SequenceStats;
  createdAt: string;
  updatedAt: string;
}

export type EnrollmentStatus = "active" | "paused" | "completed" | "stopped" | "failed";

export type StopReason =
  | "replied"
  | "meeting_booked"
  | "unsubscribed"
  | "manual"
  | "lead_status_changed"
  | "completed"
  | "condition_stopped"
  | "error";

export interface StepExecutionLog {
  stepId?: string | null;
  stepOrder: number;
  type: string;
  executedAt: string;
  status: "success" | "skipped" | "failed";
  subject?: string;
  emailId?: string | null;
  error?: string;
  details?: Record<string, any>;
}

export interface SequenceEnrollment {
  _id: string;
  sequenceId: string;
  leadId: {
    _id: string;
    name: string;
    email: string;
    company?: any;
    jobTitle?: string;
    status: string;
  };
  workspaceId: string;
  userId: string;
  mailboxId?: {
    _id: string;
    name: string;
    email: string;
    provider: string;
  } | null;
  status: EnrollmentStatus;
  currentStepOrder: number;
  currentStepId?: {
    _id: string;
    order: number;
    type: string;
    title?: string;
  } | null;
  nextRunAt?: string | null;
  stopReason?: StopReason | null;
  stepHistory: StepExecutionLog[];
  leadSnapshot: {
    name: string;
    email: string;
    company: string;
    jobTitle?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type SendJobStatus =
  | "scheduled"
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "failed"
  | "retry"
  | "dead_letter"
  | "bounced"
  | "cancelled";

export interface SendJob {
  _id: string;
  workspaceId: string;
  userId: string;
  sequenceId: string;
  stepId?: {
    _id: string;
    order: number;
    title?: string;
  } | null;
  stepOrder: number;
  enrollmentId: string;
  leadId?: {
    _id: string;
    name: string;
    email: string;
    company?: any;
  } | null;
  mailboxId?: {
    _id: string;
    name: string;
    email: string;
    provider: string;
  } | null;
  status: SendJobStatus;
  priority: number;
  scheduledFor: string;
  queuedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  lockedAt?: string | null;
  lockedBy?: string | null;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: string | null;
  lastError?: string | null;
  errorHistory: Array<{
    attempt: number;
    error: string;
    code?: string;
    timestamp: string;
  }>;
  messagePayload: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
  };
  providerResponse?: {
    provider?: string;
    messageId?: string;
    sentAt?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SendJobStats {
  total: number;
  queued: number;
  scheduled: number;
  sending: number;
  sent: number;
  delivered: number;
  failed: number;
  retry: number;
  dead_letter: number;
  bounced: number;
  cancelled: number;
}

export interface EmailEvent {
  _id: string;
  type: string;
  leadId?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  sequenceId?: string;
  stepOrder?: number;
  mailboxId?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  messageId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}
