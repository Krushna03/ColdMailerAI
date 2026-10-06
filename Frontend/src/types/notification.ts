export type NotificationType =
  | "lead_interested"
  | "meeting_request"
  | "prospect_objection"
  | "wrong_person"
  | "reply_received"
  | "sequence_stopped"
  | "system";

export type NotificationPriority = "urgent" | "high" | "medium" | "low";

export interface NotificationItem {
  _id: string;
  workspaceId: string;
  userId: string;
  leadId?: {
    _id: string;
    name: string;
    email: string;
    company?: string | { name?: string };
    jobTitle?: string;
  } | null;
  inboundEmailId?: string | null;
  sequenceId?: {
    _id: string;
    name: string;
  } | null;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  suggestedAction?: string | null;
  isRead: boolean;
  readAt?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}
