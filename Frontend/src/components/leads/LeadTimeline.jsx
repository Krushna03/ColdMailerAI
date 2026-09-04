import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Send,
  XCircle,
  Calendar,
  CheckCircle2,
  Tag,
  UserPlus,
  Edit3,
  FileText,
  Video,
  RotateCcw,
  Check,
  Trash2,
  Clock,
  Mail
} from "lucide-react";
import { Button } from "../ui/button";
import { format } from "date-fns";
import { emailPreview } from "./leadUtils";

const EVENT_CONFIG = {
  EMAIL_GENERATED: {
    icon: Mail,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    badge: "Draft",
    badgeColor: "bg-purple-500/15 text-purple-300",
  },
  EMAIL_SENT: {
    icon: Send,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    badge: "Sent",
    badgeColor: "bg-emerald-500/15 text-emerald-300",
  },
  EMAIL_FAILED: {
    icon: XCircle,
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    badge: "Failed",
    badgeColor: "bg-rose-500/15 text-rose-300",
  },
  FOLLOWUP_CREATED: {
    icon: Calendar,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    badge: "Scheduled",
    badgeColor: "bg-amber-500/15 text-amber-300",
  },
  FOLLOWUP_COMPLETED: {
    icon: CheckCircle2,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    badge: "Completed",
    badgeColor: "bg-emerald-500/15 text-emerald-300",
  },
  STATUS_CHANGED: {
    icon: Tag,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    badge: "Status",
    badgeColor: "bg-blue-500/15 text-blue-300",
  },
  LEAD_CREATED: {
    icon: UserPlus,
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    badge: "Created",
    badgeColor: "bg-cyan-500/15 text-cyan-300",
  },
  LEAD_UPDATED: {
    icon: Edit3,
    color: "text-gray-400 bg-gray-500/10 border-gray-500/20",
    badge: "Updated",
    badgeColor: "bg-gray-500/15 text-gray-300",
  },
  NOTE_ADDED: {
    icon: FileText,
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    badge: "Note",
    badgeColor: "bg-indigo-500/15 text-indigo-300",
  },
  MEETING_SCHEDULED: {
    icon: Video,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    badge: "Meeting",
    badgeColor: "bg-emerald-500/15 text-emerald-300",
  },
};

function buildTimelineItems({ activities = [], emails = [], followUps = [] }) {
  const itemsList = [];

  // Track added entity IDs to prevent duplicates
  const processedEmails = new Set();
  const processedFollowUps = new Set();

  // 1. Add logged activities
  activities.forEach((act) => {
    const time = new Date(act.createdAt).getTime();
    if (act.metadata?.emailId) processedEmails.add(String(act.metadata.emailId));
    if (act.metadata?.followUpId) processedFollowUps.add(String(act.metadata.followUpId));

    // Find linked email/followUp if available
    let linkedEmail = null;
    let linkedFollowUp = null;
    if (act.metadata?.emailId) {
      linkedEmail = emails.find((e) => String(e._id) === String(act.metadata.emailId));
    }
    if (act.metadata?.followUpId) {
      linkedFollowUp = followUps.find((f) => String(f._id) === String(act.metadata.followUpId));
    }

    itemsList.push({
      id: act._id,
      type: act.type,
      title: act.title,
      at: new Date(act.createdAt),
      sortAt: time,
      metadata: act.metadata,
      email: linkedEmail,
      followUp: linkedFollowUp,
    });
  });

  // 2. Supplementary items from emails if activity was not explicitly recorded
  emails.forEach((email) => {
    if (!processedEmails.has(String(email._id))) {
      const isSent = email.sendStatus === "sent";
      const dateStr = isSent && email.sentAt ? email.sentAt : email.createdAt;
      itemsList.push({
        id: `email-${email._id}`,
        type: isSent ? "EMAIL_SENT" : "EMAIL_GENERATED",
        title: isSent ? "Email sent" : "Email generated",
        at: new Date(dateStr),
        sortAt: new Date(dateStr).getTime(),
        email,
      });
    }
  });

  // 3. Supplementary items from followUps if activity was not explicitly recorded
  followUps.forEach((followUp) => {
    if (!processedFollowUps.has(String(followUp._id))) {
      const isDone = followUp.status === "done" || followUp.status === "skipped";
      const dateStr = followUp.dueAt || followUp.createdAt;
      itemsList.push({
        id: `followup-${followUp._id}`,
        type: isDone ? "FOLLOWUP_COMPLETED" : "FOLLOWUP_CREATED",
        title: isDone ? `Follow-up ${followUp.status}` : "Follow-up scheduled",
        at: new Date(dateStr),
        sortAt: new Date(dateStr).getTime(),
        followUp,
      });
    }
  });

  // Sort descending by date
  itemsList.sort((a, b) => b.sortAt - a.sortAt);

  // Group items by Date header e.g. "Aug 15"
  const grouped = [];
  itemsList.forEach((item) => {
    const dateLabel = format(item.at, "MMM d, yyyy");
    let group = grouped.find((g) => g.dateLabel === dateLabel);
    if (!group) {
      group = { dateLabel, date: item.at, items: [] };
      grouped.push(group);
    }
    group.items.push(item);
  });

  return grouped;
}

export default function LeadTimeline({
  activities = [],
  emails = [],
  followUps = [],
  onMarkSent,
  onUnmarkSent,
  onCompleteFollowUp,
  onSkipFollowUp,
  onDeleteFollowUp,
  markingEmailId,
  updatingFollowUpId,
}) {
  const groupedTimeline = useMemo(
    () => buildTimelineItems({ activities, emails, followUps }),
    [activities, emails, followUps]
  );

  if (groupedTimeline.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-white/15 bg-surface-800/40 px-6 py-12 text-center">
        <p className="text-lg font-semibold text-gray-200">No activity yet</p>
        <p className="mt-2 text-sm text-gray-400">
          Generate an email or schedule a follow-up to start this lead&apos;s activity timeline.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Lead Activity Timeline</h2>
        <span className="text-xs font-mono text-gray-400">Single Source of Truth</span>
      </div>

      <div className="relative space-y-6 before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
        {groupedTimeline.map((group) => (
          <div key={group.dateLabel} className="relative pl-10 space-y-3">
            {/* Date Node Badge */}
            <div className="absolute left-0 top-0 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border border-brand/40 bg-surface-900 flex items-center justify-center shadow-md">
                <Clock className="h-4 w-4 text-brand" />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand">
                {group.dateLabel}
              </h3>
            </div>

            {/* Event Tree */}
            <div className="space-y-3">
              {group.items.map((item) => {
                const config = EVENT_CONFIG[item.type] || EVENT_CONFIG.LEAD_UPDATED;
                const Icon = config.icon;
                const timeLabel = format(item.at, "h:mm a");

                // Check actions for email / followup if attached
                const email = item.email || (item.metadata?.emailId && emails.find(e => String(e._id) === String(item.metadata.emailId)));
                const followUp = item.followUp || (item.metadata?.followUpId && followUps.find(f => String(f._id) === String(item.metadata.followUpId)));

                const isSent = email?.sendStatus === "sent";
                const isEmailBusy = email && markingEmailId === email._id;
                const isFollowUpBusy = followUp && updatingFollowUpId === followUp._id;

                return (
                  <div
                    key={item.id}
                    className="relative rounded-2xl border border-white/10 bg-surface-900/40 p-4 backdrop-blur-md transition-all duration-200 hover:border-white/20"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${config.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-white">
                              {item.title}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${config.badgeColor}`}
                            >
                              {config.badge}
                            </span>
                          </div>

                          <p className="mt-0.5 text-[11px] font-mono text-gray-400">
                            {timeLabel}
                          </p>

                          {/* Email Content Preview */}
                          {email?.generatedEmail && (
                            <p className="mt-2 text-xs text-gray-300 line-clamp-2 bg-surface-950/40 p-2 rounded-xl border border-white/5 font-sans">
                              {emailPreview(email.generatedEmail)}
                            </p>
                          )}

                          {/* Follow-up Note */}
                          {followUp?.note && (
                            <p className="mt-2 text-xs text-gray-300 bg-surface-950/40 p-2 rounded-xl border border-white/5">
                              {followUp.note}
                            </p>
                          )}

                          {/* Activity metadata detail if note or status */}
                          {item.metadata?.notes && (
                            <p className="mt-2 text-xs text-gray-300 bg-surface-950/40 p-2 rounded-xl border border-white/5">
                              {item.metadata.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Interactive Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {email && (
                          <>
                            <Button asChild size="sm" variant="ghost" className="h-8 text-xs text-gray-300 hover:bg-white/10 hover:text-white">
                              <Link to={`/email/${email._id}`}>Open</Link>
                            </Button>
                            {isSent ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={isEmailBusy}
                                onClick={() => onUnmarkSent(email._id)}
                                className="h-8 text-xs text-gray-300 hover:bg-white/10 hover:text-white"
                              >
                                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                Undo
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                disabled={isEmailBusy}
                                onClick={() => onMarkSent(email._id)}
                                className="h-8 text-xs bg-brand text-white hover:bg-brand-400"
                              >
                                {isEmailBusy ? "Saving..." : "Mark sent"}
                              </Button>
                            )}
                          </>
                        )}

                        {followUp && followUp.status === "pending" && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              disabled={isFollowUpBusy}
                              onClick={() => onCompleteFollowUp(followUp._id)}
                              className="h-8 text-xs bg-brand text-white hover:bg-brand-400"
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Done
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={isFollowUpBusy}
                              onClick={() => onSkipFollowUp(followUp._id)}
                              className="h-8 text-xs text-gray-300 hover:bg-white/10 hover:text-white"
                            >
                              Skip
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={isFollowUpBusy}
                              onClick={() => onDeleteFollowUp(followUp._id)}
                              className="h-8 text-xs text-red-300 hover:bg-white/10 hover:text-red-200"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
