import React, { useState } from "react";
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
  ExternalLink,
  Trash2,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "../../hooks/useNotifications";
import { NotificationItem, NotificationType } from "../../types/notification";

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ReactNode; badgeClass: string; label: string }
> = {
  lead_interested: {
    icon: <Flame className="h-4 w-4 text-orange-400 animate-pulse" />,
    badgeClass: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    label: "Hot Lead",
  },
  meeting_request: {
    icon: <Calendar className="h-4 w-4 text-purple-400" />,
    badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    label: "Meeting",
  },
  prospect_objection: {
    icon: <AlertTriangle className="h-4 w-4 text-amber-400" />,
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    label: "Objection",
  },
  wrong_person: {
    icon: <UserX className="h-4 w-4 text-blue-400" />,
    badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    label: "Referral",
  },
  reply_received: {
    icon: <MessageSquare className="h-4 w-4 text-emerald-400" />,
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    label: "Reply",
  },
  sequence_stopped: {
    icon: <Sparkles className="h-4 w-4 text-cyan-400" />,
    badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    label: "Sequence",
  },
  system: {
    icon: <Bell className="h-4 w-4 text-gray-400" />,
    badgeClass: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    label: "System",
  },
};

export function NotificationBell() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "unread" | "hot">("all");

  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: notifData, isLoading } = useNotifications({
    unreadOnly: filter === "unread",
    type: filter === "hot" ? "lead_interested" : undefined,
    limit: 15,
  });

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const deleteMutation = useDeleteNotification();

  const notifications = notifData?.notifications || [];

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markReadMutation.mutate(item._id);
    }

    if (item.leadId && item.leadId._id) {
      navigate(`/leads/${item.leadId._id}`);
    } else if (item.inboundEmailId) {
      navigate("/dashboard/inbox");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Sales Notifications"
          className="relative rounded-full p-2 text-gray-300 hover:bg-white/10 hover:text-white transition-all focus:outline-none"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-orange-600 to-rose-500 text-[10px] font-bold text-white shadow-lg shadow-orange-500/40 animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[360px] sm:w-[420px] rounded-xl border border-white/10 bg-surface-900/95 p-0 text-white shadow-2xl backdrop-blur-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-white">Sales Alerts</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-300 border border-orange-500/30">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="h-7 text-xs text-gray-400 hover:text-white hover:bg-white/5"
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 border-b border-white/10 px-3 py-2 bg-surface-800/40">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === "all"
                ? "bg-white/15 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === "unread"
                ? "bg-white/15 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Unread
          </button>
          <button
            onClick={() => setFilter("hot")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === "hot"
                ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                : "text-gray-400 hover:text-orange-300"
            }`}
          >
            <Flame className="h-3 w-3 text-orange-400" />
            Hot Leads
          </button>
        </div>

        {/* Notification Items List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-white/5 custom-scroll">
          {isLoading ? (
            <div className="py-10 text-center text-xs text-gray-400">Loading alerts...</div>
          ) : notifications.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-gray-400">
                <Bell className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-gray-300">All caught up!</p>
              <p className="text-xs text-gray-500 mt-0.5">
                New lead replies and sequence stops will appear here in real-time.
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.system;
              const isUrgent = item.priority === "urgent" || item.type === "lead_interested";

              return (
                <div
                  key={item._id}
                  onClick={() => handleNotificationClick(item)}
                  className={`group relative flex items-start gap-3 p-3.5 cursor-pointer transition-colors ${
                    item.isRead ? "hover:bg-white/[0.03]" : "bg-white/[0.04] hover:bg-white/[0.07]"
                  }`}
                >
                  {/* Status Indicator Dot */}
                  {!item.isRead && (
                    <span className="absolute left-1 top-4 h-1.5 w-1.5 rounded-full bg-orange-400 shadow-sm shadow-orange-400" />
                  )}

                  {/* Icon Avatar */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-800 border border-white/10 mt-0.5">
                    {config.icon}
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`rounded px-1.5 py-0.2 text-[10px] font-semibold border ${config.badgeClass}`}
                      >
                        {config.label}
                      </span>
                      {isUrgent && (
                        <span className="rounded bg-rose-500/20 px-1 text-[9px] font-bold text-rose-300 uppercase tracking-wider border border-rose-500/30">
                          Priority
                        </span>
                      )}
                    </div>

                    <p className={`text-xs ${item.isRead ? "text-gray-300" : "text-white font-medium"} leading-snug line-clamp-1`}>
                      {item.title}
                    </p>

                    <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5">
                      {item.message}
                    </p>

                    {item.suggestedAction && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20 w-fit">
                        <Sparkles className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{item.suggestedAction}</span>
                      </div>
                    )}

                    <span className="text-[10px] text-gray-500 mt-1 block">
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Quick Delete */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(item._id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-rose-400 p-1 rounded transition-opacity"
                    title="Dismiss alert"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-4 py-2.5 flex items-center justify-between bg-surface-800/60">
          <button
            onClick={() => navigate("/dashboard/inbox")}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>Open Inbound Inbox</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
export default NotificationBell;
