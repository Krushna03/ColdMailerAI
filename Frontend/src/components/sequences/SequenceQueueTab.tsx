import React, { useState } from "react";
import {
  Clock,
  Send,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  AlertOctagon,
  Inbox,
  RefreshCw,
  Mail,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  useSendJobs,
  useSendJobStats,
  useRetrySendJob,
  useEmailEvents,
} from "../../hooks/useSequences";
import { SendJob, SendJobStatus } from "../../types/sequence";

interface SequenceQueueTabProps {
  sequenceId: string;
}

const STATUS_CONFIG: Record<
  SendJobStatus,
  { label: string; badgeClass: string; icon: React.ReactNode }
> = {
  scheduled: {
    label: "Scheduled",
    badgeClass: "bg-surface-800 text-gray-300 border-white/10",
    icon: <Clock className="h-3 w-3 text-gray-400" />,
  },
  queued: {
    label: "Queued",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: <Clock className="h-3 w-3 text-blue-400" />,
  },
  sending: {
    label: "Sending",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: <RotateCw className="h-3 w-3 text-amber-400 animate-spin" />,
  },
  sent: {
    label: "Sent",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: <Send className="h-3 w-3 text-emerald-400" />,
  },
  delivered: {
    label: "Delivered",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    icon: <CheckCircle2 className="h-3 w-3 text-emerald-300" />,
  },
  failed: {
    label: "Failed",
    badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: <AlertTriangle className="h-3 w-3 text-red-400" />,
  },
  retry: {
    label: "Retrying",
    badgeClass: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    icon: <RotateCw className="h-3 w-3 text-orange-400" />,
  },
  dead_letter: {
    label: "Dead Letter",
    badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    icon: <AlertOctagon className="h-3 w-3 text-rose-400" />,
  },
  bounced: {
    label: "Bounced",
    badgeClass: "bg-red-500/20 text-red-300 border-red-500/40",
    icon: <AlertOctagon className="h-3 w-3 text-red-300" />,
  },
  cancelled: {
    label: "Cancelled",
    badgeClass: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    icon: <Clock className="h-3 w-3 text-gray-500" />,
  },
};

export const SequenceQueueTab: React.FC<SequenceQueueTabProps> = ({ sequenceId }) => {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [activeSubView, setActiveSubView] = useState<"jobs" | "events">("jobs");

  const { data: stats, isLoading: isStatsLoading } = useSendJobStats(sequenceId);
  const {
    data: jobsData,
    isLoading: isJobsLoading,
    refetch: refetchJobs,
  } = useSendJobs({
    sequenceId,
    status: selectedStatus === "all" ? undefined : selectedStatus,
    limit: 50,
  });

  const { data: events = [], isLoading: isEventsLoading } = useEmailEvents({
    sequenceId,
    limit: 50,
  });

  const retryMutation = useRetrySendJob();

  const jobs = jobsData?.jobs || [];

  return (
    <div className="space-y-6">
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-surface-900 border border-white/5 rounded-lg p-3">
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
            Total Outbox
          </span>
          <span className="text-xl font-bold text-white mt-1 block">
            {isStatsLoading ? "..." : stats?.total || 0}
          </span>
        </div>

        <div className="bg-surface-900 border border-blue-500/10 rounded-lg p-3">
          <span className="text-[11px] font-medium text-blue-400 uppercase tracking-wider block flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            Queued
          </span>
          <span className="text-xl font-bold text-blue-200 mt-1 block">
            {isStatsLoading ? "..." : stats?.queued || 0}
          </span>
        </div>

        <div className="bg-surface-900 border border-amber-500/10 rounded-lg p-3">
          <span className="text-[11px] font-medium text-amber-400 uppercase tracking-wider block flex items-center gap-1.5">
            <RotateCw className="h-3 w-3 text-amber-400 animate-spin" />
            Sending
          </span>
          <span className="text-xl font-bold text-amber-200 mt-1 block">
            {isStatsLoading ? "..." : stats?.sending || 0}
          </span>
        </div>

        <div className="bg-surface-900 border border-emerald-500/10 rounded-lg p-3">
          <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider block">
            Sent / Delivered
          </span>
          <span className="text-xl font-bold text-emerald-200 mt-1 block">
            {isStatsLoading ? "..." : (stats?.sent || 0) + (stats?.delivered || 0)}
          </span>
        </div>

        <div className="bg-surface-900 border border-orange-500/10 rounded-lg p-3">
          <span className="text-[11px] font-medium text-orange-400 uppercase tracking-wider block">
            Retrying
          </span>
          <span className="text-xl font-bold text-orange-200 mt-1 block">
            {isStatsLoading ? "..." : stats?.retry || 0}
          </span>
        </div>

        <div className="bg-surface-900 border border-rose-500/10 rounded-lg p-3">
          <span className="text-[11px] font-medium text-rose-400 uppercase tracking-wider block">
            Dead Letter
          </span>
          <span className="text-xl font-bold text-rose-200 mt-1 block">
            {isStatsLoading ? "..." : stats?.dead_letter || 0}
          </span>
        </div>

        <div className="bg-surface-900 border border-red-500/10 rounded-lg p-3">
          <span className="text-[11px] font-medium text-red-400 uppercase tracking-wider block">
            Bounced
          </span>
          <span className="text-xl font-bold text-red-200 mt-1 block">
            {isStatsLoading ? "..." : stats?.bounced || 0}
          </span>
        </div>
      </div>

      {/* Sub-view Switcher & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-900/60 border border-white/5 rounded-lg p-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSubView("jobs")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${activeSubView === "jobs"
                ? "bg-brand text-white shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Send Jobs ({jobs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView("events")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${activeSubView === "events"
                ? "bg-brand text-white shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Audit Trail ({events.length})</span>
          </button>
        </div>

        {activeSubView === "jobs" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Filter status:</span>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[145px] h-7 bg-surface-950 border-white/10 text-xs text-white focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent className="bg-surface-950 border-white/10 text-white text-xs">
                <SelectItem className="text-xs" value="all">All States</SelectItem>
                <SelectItem className="text-xs" value="queued">Queued</SelectItem>
                <SelectItem className="text-xs" value="scheduled">Scheduled</SelectItem>
                <SelectItem className="text-xs" value="sending">Sending (Locked)</SelectItem>
                <SelectItem className="text-xs" value="sent">Sent</SelectItem>
                <SelectItem className="text-xs" value="delivered">Delivered</SelectItem>
                <SelectItem className="text-xs" value="retry">Retrying</SelectItem>
                <SelectItem className="text-xs" value="dead_letter">Dead Letter</SelectItem>
                <SelectItem className="text-xs" value="bounced">Bounced</SelectItem>
                <SelectItem className="text-xs" value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetchJobs()}
              className="h-7 px-2 border-white/10 text-gray-300 hover:text-white"
            >
              <RefreshCw className="h-3 w-3 text-gray-700" />
            </Button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeSubView === "jobs" ? (
        <div className="space-y-3">
          {isJobsLoading ? (
            <div className="py-16 text-center text-gray-400">
              <RotateCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand" />
              <p className="text-xs">Loading queue state...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-white/10 rounded-xl bg-surface-900/30">
              <Inbox className="h-10 w-10 mx-auto text-gray-500 mb-2" />
              <p className="text-sm font-medium text-gray-300">No jobs in queue</p>
              <p className="text-xs text-gray-500 mt-1">
                {selectedStatus !== "all"
                  ? `No jobs found with status "${selectedStatus}".`
                  : "Enroll leads and trigger the cadence to dispatch jobs."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => {
                const config = STATUS_CONFIG[job.status] || {
                  label: job.status,
                  badgeClass: "bg-surface-800 text-gray-400",
                  icon: <Clock className="h-3 w-3" />,
                };
                const isExpanded = expandedJobId === job._id;
                const canRetry = job.status === "dead_letter" || job.status === "failed";

                return (
                  <div
                    key={job._id}
                    className="bg-surface-900 border border-white/10 rounded-lg p-3.5 transition-all hover:border-white/20"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Lead and Subject */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-white">
                            {job.leadId?.name || job.messagePayload?.to || "Unknown Lead"}
                          </span>
                          <span className="text-xs text-gray-400">&lt;{job.messagePayload?.to}&gt;</span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${config.badgeClass}`}
                          >
                            {config.icon}
                            <span>{config.label}</span>
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-surface-800 text-gray-300 border border-white/5">
                            Step #{job.stepOrder}
                          </span>
                        </div>

                        <p className="text-xs text-gray-300 flex items-center gap-1.5 truncate max-w-xl">
                          <Mail className="h-3 w-3 text-gray-400 shrink-0" />
                          <span className="font-medium text-gray-200">
                            {job.messagePayload?.subject || "No Subject"}
                          </span>
                        </p>
                      </div>

                      {/* Right: Actions & Timestamps */}
                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        {canRetry && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => retryMutation.mutate(job._id)}
                            disabled={retryMutation.isPending}
                            className="h-7 px-2.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded flex items-center gap-1"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Retry Job</span>
                          </Button>
                        )}

                        <button
                          type="button"
                          onClick={() => setExpandedJobId(isExpanded ? null : job._id)}
                          className="h-7 px-2 text-xs text-gray-400 hover:text-white rounded border border-white/10 flex items-center gap-1"
                        >
                          <span>{isExpanded ? "Hide" : "Inspect"}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Metadata Subline */}
                    <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-400">
                      <span>
                        Attempts: <strong className="text-gray-200">{job.attempts}</strong> /{" "}
                        {job.maxAttempts}
                      </span>

                      {job.nextAttemptAt && (
                        <span>
                          Next retry:{" "}
                          <strong className="text-orange-400">
                            {new Date(job.nextAttemptAt).toLocaleTimeString()}
                          </strong>
                        </span>
                      )}

                      {job.lockedBy && (
                        <span>
                          Worker: <code className="text-amber-300 font-mono">{job.lockedBy}</code>
                        </span>
                      )}

                      {job.providerResponse?.messageId && (
                        <span>
                          Provider ID:{" "}
                          <code className="text-emerald-400 font-mono">
                            {job.providerResponse.messageId}
                          </code>
                        </span>
                      )}

                      <span className="ml-auto text-gray-400 shrink-0 whitespace-nowrap">
                        {job.completedAt
                          ? `Completed ${new Date(job.completedAt).toLocaleTimeString()}`
                          : `Scheduled for ${new Date(job.scheduledFor).toLocaleTimeString()}`}
                      </span>
                    </div>

                    {/* Inspection Drawer */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-3 bg-surface-950/60 p-3 rounded-md">
                        {job.lastError && (
                          <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                            <strong className="block font-semibold mb-0.5">Last Error:</strong>
                            <p className="font-mono text-[11px] break-all">{job.lastError}</p>
                          </div>
                        )}

                        {job.errorHistory && job.errorHistory.length > 0 && (
                          <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">
                              Error History ({job.errorHistory.length})
                            </span>
                            <div className="space-y-1">
                              {job.errorHistory.map((err, idx) => (
                                <div
                                  key={idx}
                                  className="text-[11px] font-mono text-gray-300 bg-surface-900 p-2 rounded flex items-start sm:items-center justify-between gap-4"
                                >
                                  <span className="flex-1 min-w-0 break-words leading-relaxed">
                                    Attempt #{err.attempt}: {err.error}
                                  </span>
                                  <span className="text-gray-400 font-mono text-[11px] shrink-0 whitespace-nowrap min-w-[95px] text-right font-medium">
                                    {new Date(err.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">
                            HTML Payload Preview
                          </span>
                          <div className="p-2 rounded bg-surface-900 border border-white/5 max-h-40 overflow-y-auto text-xs text-gray-300 font-sans">
                            {job.messagePayload?.text || "(No text content)"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Event Stream Audit Log */
        <div className="space-y-2">
          {isEventsLoading ? (
            <div className="py-16 text-center text-gray-400">
              <RotateCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand" />
              <p className="text-xs">Loading audit event trail...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-white/10 rounded-xl bg-surface-900/30">
              <Activity className="h-10 w-10 mx-auto text-gray-500 mb-2" />
              <p className="text-sm font-medium text-gray-300">No events recorded yet</p>
            </div>
          ) : (
            <div className="border border-white/10 rounded-lg divide-y divide-white/5 bg-surface-900">
              {events.map((event) => (
                <div key={event._id} className="p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-800 text-brand-300 border border-white/5 uppercase">
                      {event.type}
                    </span>
                    <span className="text-gray-200">
                      {event.leadId?.name || event.leadId?.email || "Lead"}
                    </span>
                    {event.stepOrder && (
                      <span className="text-gray-400">(Step #{event.stepOrder})</span>
                    )}
                    {event.messageId && (
                      <code className="text-[11px] text-gray-400 font-mono hidden md:inline">
                        ID: {event.messageId}
                      </code>
                    )}
                  </div>

                  <span className="text-[11px] text-gray-400 shrink-0 whitespace-nowrap min-w-[90px] text-right font-mono">
                    {new Date(event.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
