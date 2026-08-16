import { Link } from "react-router-dom";
import { Check, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  emailPreview,
  formatDateTime,
  formatShortDate,
  isFollowUpOverdue,
} from "./leadUtils";

function buildTimeline({ emails = [], followUps = [] }) {
  const items = [
    ...emails.map((email) => ({
      type: "email",
      id: email._id,
      at: email.sentAt || email.createdAt,
      sortAt: new Date(email.sentAt || email.createdAt).getTime(),
      email,
    })),
    ...followUps.map((followUp) => ({
      type: "followUp",
      id: followUp._id,
      at: followUp.dueAt,
      sortAt: new Date(followUp.dueAt || followUp.createdAt).getTime(),
      followUp,
    })),
  ];

  return items.sort((a, b) => b.sortAt - a.sortAt);
}

export default function LeadTimeline({
  emails,
  followUps,
  onMarkSent,
  onUnmarkSent,
  onCompleteFollowUp,
  onSkipFollowUp,
  onDeleteFollowUp,
  markingEmailId,
  updatingFollowUpId,
}) {
  const timeline = buildTimeline({ emails, followUps });

  if (timeline.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-white/15 bg-surface-800/40 px-6 py-12 text-center">
        <p className="text-lg font-semibold text-gray-200">No activity yet</p>
        <p className="mt-2 text-sm text-gray-400">
          Generate an email or schedule a follow-up to start this lead&apos;s timeline.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">Timeline</h2>
      <ul className="space-y-3">
        {timeline.map((item) => {
          if (item.type === "email") {
            const email = item.email;
            const isSent = email.sendStatus === "sent";
            const busy = markingEmailId === email._id;
            return (
              <li
                key={`email-${email._id}`}
                className="rounded-2xl border border-white/10 bg-surface-800/50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {isSent ? "Email marked sent" : "Email generated"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          isSent
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-white/10 text-gray-300"
                        }`}
                      >
                        {isSent ? "Sent" : "Draft"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDateTime(isSent ? email.sentAt : email.createdAt)}
                    </p>
                    <p className="mt-3 text-sm text-gray-300">
                      {emailPreview(email.generatedEmail)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="ghost" className="text-gray-300 hover:bg-white/10 hover:text-white">
                      <Link to={`/email/${email._id}`}>Open</Link>
                    </Button>
                    {isSent ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => onUnmarkSent(email._id)}
                        className="text-gray-300 hover:bg-white/10 hover:text-white"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Undo sent
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() => onMarkSent(email._id)}
                        className="bg-brand text-white hover:bg-brand-400"
                      >
                        {busy ? "Saving..." : "Mark sent"}
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          }

          const followUp = item.followUp;
          const overdue = isFollowUpOverdue(followUp.dueAt, followUp.status);
          const busy = updatingFollowUpId === followUp._id;

          return (
            <li
              key={`followup-${followUp._id}`}
              className={`rounded-2xl border p-4 ${
                overdue
                  ? "border-red-500/40 bg-red-500/10"
                  : "border-white/10 bg-surface-800/50"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-white">Follow-up</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        followUp.status === "done"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : followUp.status === "skipped"
                            ? "bg-zinc-500/20 text-zinc-300"
                            : overdue
                              ? "bg-red-500/20 text-red-300"
                              : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {followUp.status === "pending" && overdue
                        ? "Overdue"
                        : followUp.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Due {formatShortDate(followUp.dueAt)} · {formatDateTime(followUp.dueAt)}
                  </p>
                  <p className="mt-3 text-sm text-gray-300">
                    {followUp.note || "No note"}
                  </p>
                </div>

                {followUp.status === "pending" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => onCompleteFollowUp(followUp._id)}
                      className="bg-brand text-white hover:bg-brand-400"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Done
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => onSkipFollowUp(followUp._id)}
                      className="text-gray-300 hover:bg-white/10 hover:text-white"
                    >
                      Skip
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => onDeleteFollowUp(followUp._id)}
                      className="text-red-300 hover:bg-white/10 hover:text-red-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
