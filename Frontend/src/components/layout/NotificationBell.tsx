import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Flame,
  Calendar,
  AlertTriangle,
  UserX,
  MessageSquare,
  Check,
  CheckCheck,
  Trash2,
  Sparkles,
  ArrowRight,
  Building2,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "../ui/dialog";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "../../hooks/useNotifications";
import { NotificationItem, NotificationType } from "../../types/notification";
import { cn } from "../../lib/utils";

interface TypeConfig {
  icon: React.ComponentType<{ className?: string }>;
  iconContainerClass: string;
  badgeClass: string;
  label: string;
}

const TYPE_CONFIG: Record<NotificationType, TypeConfig> = {
  lead_interested: {
    icon: Flame,
    iconContainerClass: "bg-amber-500/10 border-amber-500/25 text-amber-400",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/25",
    label: "Hot Lead",
  },
  meeting_request: {
    icon: Calendar,
    iconContainerClass: "bg-purple-500/10 border-purple-500/25 text-purple-300",
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/25",
    label: "Meeting",
  },
  prospect_objection: {
    icon: AlertTriangle,
    iconContainerClass: "bg-rose-500/10 border-rose-500/25 text-rose-400",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/25",
    label: "Objection",
  },
  wrong_person: {
    icon: UserX,
    iconContainerClass: "bg-blue-500/10 border-blue-500/25 text-blue-400",
    badgeClass: "bg-blue-500/15 text-blue-300 border-blue-500/25",
    label: "Referral",
  },
  reply_received: {
    icon: MessageSquare,
    iconContainerClass: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    label: "Reply",
  },
  sequence_stopped: {
    icon: Sparkles,
    iconContainerClass: "bg-cyan-500/10 border-cyan-500/25 text-cyan-300",
    badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
    label: "Sequence",
  },
  system: {
    icon: Bell,
    iconContainerClass: "bg-white/5 border-white/10 text-gray-400",
    badgeClass: "bg-white/10 text-gray-300 border-white/15",
    label: "System",
  },
};

function formatRelativeTime(dateInput: string | Date | undefined): string {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const now = Date.now();
  const diffInSeconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function sanitizeTitle(rawTitle: string | undefined, type: NotificationType, leadName?: string): string {
  const cleaned = (rawTitle || "")
    // Remove leading emojis and whitespace
    .replace(/^[\s\p{Emoji}\u200d\uFE0F\uFE0E]+/u, "")
    // Remove redundant leading colons or hyphens
    .replace(/^[:\-\s]+/, "")
    .trim();

  if (cleaned) return cleaned;

  switch (type) {
    case "lead_interested":
      return leadName ? `Hot lead interested: ${leadName}` : "Hot lead interested";
    case "meeting_request":
      return leadName ? `Meeting requested by ${leadName}` : "Meeting requested";
    case "prospect_objection":
      return leadName ? `Objection raised by ${leadName}` : "Prospect objection";
    case "wrong_person":
      return leadName ? `Referral / wrong contact: ${leadName}` : "Referral received";
    case "reply_received":
      return leadName ? `Reply from ${leadName}` : "New reply received";
    case "sequence_stopped":
      return "Sequence automatically paused";
    default:
      return "Activity alert";
  }
}

function sanitizeMessage(rawMessage: string | undefined, leadName?: string): string {
  if (rawMessage && rawMessage.trim()) return rawMessage.trim();
  return leadName
    ? `${leadName} interacted with your outreach sequence.`
    : "A prospect interaction was recorded.";
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | "hot">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: notifData, isLoading } = useNotifications({
    unreadOnly: filter === "unread",
    type: filter === "hot" ? "lead_interested" : undefined,
    limit: 30,
  });

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const deleteMutation = useDeleteNotification();

  const notifications = notifData?.notifications || [];

  const filteredNotifications = useMemo(() => {
    if (!searchTerm.trim()) return notifications;
    const term = searchTerm.toLowerCase();
    return notifications.filter((item) => {
      const titleMatch = (item.title || "").toLowerCase().includes(term);
      const messageMatch = (item.message || "").toLowerCase().includes(term);
      const leadNameMatch = (item.leadId?.name || "").toLowerCase().includes(term);
      const leadEmailMatch = (item.leadId?.email || "").toLowerCase().includes(term);
      const company =
        typeof item.leadId?.company === "object"
          ? item.leadId.company?.name || ""
          : item.leadId?.company || "";
      const companyMatch = company.toLowerCase().includes(term);
      return titleMatch || messageMatch || leadNameMatch || leadEmailMatch || companyMatch;
    });
  }, [notifications, searchTerm]);

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markReadMutation.mutate(item._id);
    }
    setOpen(false);

    if (item.inboundEmailId) {
      navigate(`/dashboard/inbox?emailId=${item.inboundEmailId}`);
    } else if (item.leadId && item.leadId._id) {
      navigate(`/dashboard/inbox`);
    } else if (item.sequenceId && item.sequenceId._id) {
      navigate(`/dashboard/sequences/${item.sequenceId._id}`);
    } else {
      navigate("/dashboard/inbox");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Sales notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          title="Activity & Sales Alerts"
          className="relative flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white font-mono tabular-nums ring-2 ring-surface-950 shadow-sm animate-in fade-in zoom-in-75">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl w-[95vw] sm:w-full p-0 gap-0 overflow-hidden rounded-xl border border-white/10 bg-surface-900 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header Toolbar */}
        <div className="flex items-center justify-between border-b border-white/10 bg-surface-950 px-5 py-4 shrink-0 pr-12">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-gray-300 shrink-0">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-semibold text-white tracking-tight">
                  Activity & Alerts
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                Real-time prospect replies, objections, and outreach sequence alerts
              </DialogDescription>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              title="Mark all notifications as read"
              className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium text-gray-400 hover:text-white rounded-md hover:bg-white/5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5 text-brand-300" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Filter Segmented Pills & Search Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/10 bg-surface-950/70 px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                filter === "all"
                  ? "bg-white/10 text-white font-medium shadow-none"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                filter === "unread"
                  ? "bg-white/10 text-white font-medium shadow-none"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-brand px-1.5 py-0.2 text-[10px] font-bold text-white font-mono tabular-nums">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFilter("hot")}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                filter === "hot"
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/25 font-medium"
                  : "bg-white/5 text-gray-400 hover:text-amber-300 hover:bg-white/5"
              )}
            >
              <span>Hot Leads</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter alerts..."
              className="w-full h-7 pl-8 pr-2.5 text-xs bg-surface-900 border border-white/10 rounded-md text-white placeholder:text-gray-500 focus:outline-none focus:border-brand/50 font-sans"
            />
          </div>
        </div>

        {/* Notification Stream */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/5 custom-scroll">
          {isLoading ? (
            <div className="p-5 space-y-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="flex items-start gap-3.5 animate-pulse">
                  <div className="h-9 w-9 rounded-lg bg-white/5 border border-white/5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-36 bg-white/10 rounded" />
                    <div className="h-3 w-4/5 bg-white/5 rounded" />
                    <div className="h-2.5 w-1/3 bg-white/5 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-400">
                {searchTerm ? (
                  <Search className="h-5 w-5 text-gray-400" />
                ) : filter === "unread" ? (
                  <CheckCheck className="h-5 w-5 text-emerald-400" />
                ) : filter === "hot" ? (
                  <Flame className="h-5 w-5 text-amber-400" />
                ) : (
                  <Bell className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <p className="text-sm font-semibold text-white">
                {searchTerm
                  ? "No matching alerts"
                  : filter === "unread"
                  ? "All caught up"
                  : filter === "hot"
                  ? "No hot leads yet"
                  : "No notifications"}
              </p>
              <p className="mt-1 text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                {searchTerm
                  ? `No notifications found matching "${searchTerm}". Try clearing your search term.`
                  : filter === "unread"
                  ? "You have reviewed all incoming alerts. New prospect replies will show here."
                  : filter === "hot"
                  ? "Prospects replying with high interest will trigger priority alerts here."
                  : "Campaign replies, objections, and milestones will appear here in real-time."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.system;
              const IconComponent = config.icon;
              const isUrgent =
                item.priority === "urgent" ||
                item.priority === "high" ||
                item.type === "lead_interested";

              const leadName = item.leadId?.name || item.leadId?.email;
              const leadCompany =
                typeof item.leadId?.company === "object"
                  ? item.leadId.company?.name
                  : item.leadId?.company;

              const displayTitle = sanitizeTitle(item.title, item.type, leadName);
              const displayMessage = sanitizeMessage(item.message, leadName);
              const formattedTime = formatRelativeTime(item.createdAt);

              return (
                <div
                  key={item._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNotificationClick(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleNotificationClick(item);
                    }
                  }}
                  className={cn(
                    "group relative flex items-start gap-3.5 p-4 cursor-pointer transition-colors text-left outline-none",
                    item.isRead
                      ? "bg-transparent hover:bg-white/[0.04] border-l-2 border-l-transparent"
                      : "bg-brand/[0.03] hover:bg-brand/[0.07] border-l-2 border-l-brand"
                  )}
                >
                  {/* Body & Meta */}
                  <div className="flex-1 min-w-0 pr-2">
                    {/* Meta Row: Badges, Company, Timestamp */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {/* Unread micro-dot */}
                        {!item.isRead && (
                          <span
                            title="Unread"
                            className="h-1.5 w-1.5 rounded-full bg-brand-400 shrink-0"
                          />
                        )}

                        {isUrgent && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 uppercase tracking-wider font-sans">
                            <span className="h-1 w-1 rounded-full bg-rose-400" />
                            Priority
                          </span>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span
                        className="text-[11px] font-mono tabular-nums text-gray-400 shrink-0 whitespace-nowrap"
                        title={new Date(item.createdAt).toLocaleString()}
                      >
                        {formattedTime}
                      </span>
                    </div>

                    {/* Notification Title */}
                    <p
                      className={cn(
                        "text-sm font-semibold leading-snug line-clamp-1",
                        item.isRead ? "text-gray-200" : "text-white"
                      )}
                    >
                      {displayTitle}
                    </p>

                    {/* Message Preview */}
                    <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                      {displayMessage}
                    </p>
                  </div>

                  {/* Quick Action Hover Bar */}
                  <div
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-2 shrink-0 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={() => markReadMutation.mutate(item._id)}
                        disabled={markReadMutation.isPending}
                        title="Mark as read"
                        aria-label="Mark as read"
                        className="pr-2.5 rounded-md text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(item._id)}
                      disabled={deleteMutation.isPending}
                      title="Dismiss alert"
                      aria-label="Dismiss alert"
                      className="rounded-md text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 bg-surface-950 px-5 py-3 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/dashboard/inbox");
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300 hover:text-white transition-colors cursor-pointer group"
          >
            <span>Open Inbound Inbox</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NotificationBell;
