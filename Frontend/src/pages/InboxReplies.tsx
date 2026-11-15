import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Inbox,
  Sparkles,
  Calendar,
  AlertTriangle,
  Clock,
  UserX,
  XCircle,
  ShieldAlert,
  Search,
  RefreshCw,
  Mail,
  User,
  ExternalLink,
  Bot,
  Copy,
  Check,
  Loader2,
  MessageSquare,
  Building2,
  ThumbsUp,
} from "lucide-react";
import Seo from "../components/common/Seo";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  useInboundEmails,
  useInboundStats,
  useMarkInboundRead,
  useReclassifyReply,
  useSimulateReply,
  useSyncInboundReplies,
} from "../hooks/useInbound";
import { useLeads } from "../hooks/useLeads";
import { InboundEmail, ReplyCategory } from "../types/inbound";
import { ContextualAIGeneratorModal } from "../components/email/ContextualAIGeneratorModal";

const CATEGORY_CONFIG: Record<
  ReplyCategory,
  {
    label: string;
    badgeClass: string;
    bgGlow: string;
    icon: React.ReactNode;
  }
> = {
  interested: {
    label: "Interested",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    bgGlow: "bg-emerald-500/10",
    icon: <ThumbsUp className="h-3 w-3 text-emerald-400 shrink-0" />,
  },
  meeting_request: {
    label: "Meeting Request",
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    bgGlow: "bg-purple-500/10",
    icon: <Calendar className="h-3 w-3 text-purple-300 shrink-0" />,
  },
  objection: {
    label: "Objection",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    bgGlow: "bg-amber-500/10",
    icon: <AlertTriangle className="h-3 w-3 text-amber-300 shrink-0" />,
  },
  out_of_office: {
    label: "Out of Office",
    badgeClass: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    bgGlow: "bg-blue-500/10",
    icon: <Clock className="h-3 w-3 text-blue-300 shrink-0" />,
  },
  wrong_person: {
    label: "Wrong Person",
    badgeClass: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    bgGlow: "bg-orange-500/10",
    icon: <UserX className="h-3 w-3 text-orange-300 shrink-0" />,
  },
  not_interested: {
    label: "Not Interested",
    badgeClass: "bg-red-500/15 text-red-300 border-red-500/30",
    bgGlow: "bg-red-500/10",
    icon: <XCircle className="h-3 w-3 text-red-300 shrink-0" />,
  },
  unsubscribe: {
    label: "Unsubscribe",
    badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    bgGlow: "bg-rose-500/10",
    icon: <ShieldAlert className="h-3 w-3 text-rose-300 shrink-0" />,
  },
  neutral: {
    label: "General Inquiry",
    badgeClass: "bg-slate-500/20 text-gray-200 border-slate-500/30",
    bgGlow: "bg-slate-500/10",
    icon: <MessageSquare className="h-3 w-3 text-gray-300 shrink-0" />,
  },
  unknown: {
    label: "Unclassified",
    badgeClass: "bg-slate-500/15 text-gray-300 border-white/10",
    bgGlow: "bg-white/5",
    icon: <Bot className="h-3 w-3 text-gray-400 shrink-0" />,
  },
};

// Helper to clean quote markers like leading '>' from lines
const cleanQuoteMarkers = (text: string) => {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*>+\s?/, ""))
    .join("\n");
};

// Helper to intelligently separate new response from quoted thread
const splitEmailThread = (body: string) => {
  if (!body) return { mainText: "", quotedText: "" };
  const quotePattern = /(?:\r?\n\r?\n|\r?\n)(?:On\s+.+?(?:wrote|wrote\s*:)|-{2,}\s*Original Message\s*-{2,}|>{1,}\s*)/i;
  const matchIndex = body.search(quotePattern);
  if (matchIndex > 0) {
    const rawQuoted = body.slice(matchIndex).trim();
    return {
      mainText: body.slice(0, matchIndex).trim(),
      quotedText: cleanQuoteMarkers(rawQuoted),
    };
  }
  return { mainText: body, quotedText: "" };
};

export default function InboxReplies() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [simulateModalOpen, setSimulateModalOpen] = useState(false);
  const [aiReplyModalOpen, setAiReplyModalOpen] = useState(false);
  const [showQuotedThread, setShowQuotedThread] = useState(false);

  // Simulation form state
  const [simLeadId, setSimLeadId] = useState("");
  const [simSubject, setSimSubject] = useState("Re: Outreach proposal");
  const [simBody, setSimBody] = useState(
    "Hi, thanks for reaching out. We are very interested in exploring this! Could you share pricing details and a 15-minute intro link?"
  );

  const { data: stats, isLoading: isStatsLoading, refetch: refetchStats } = useInboundStats();
  const {
    data: inboundData,
    isLoading: isEmailsLoading,
    isFetching: isEmailsFetching,
    refetch: refetchEmails,
  } = useInboundEmails({
    category: selectedCategory === "all" ? undefined : selectedCategory,
    search: searchTerm || undefined,
    limit: 50,
  });

  const { data: leadsData } = useLeads({});
  const leads = leadsData?.pages.flatMap((p) => p.leads) || [];

  const markReadMutation = useMarkInboundRead();
  const reclassifyMutation = useReclassifyReply();
  const simulateMutation = useSimulateReply();
  const syncRepliesMutation = useSyncInboundReplies();

  const inboundEmails = inboundData?.inboundEmails || [];

  // Pick first email by default if none selected
  const activeEmail =
    inboundEmails.find((e) => e._id === selectedEmailId) ||
    inboundEmails[0] ||
    null;

  const handleSelectEmail = (email: InboundEmail) => {
    setSelectedEmailId(email._id);
    setShowQuotedThread(false);
    if (!email.isRead) {
      markReadMutation.mutate({ id: email._id, isRead: true });
    }
  };

  const handleRefresh = () => {
    refetchEmails();
    refetchStats();
  };

  const handleSimulateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simLeadId && !simBody) return;

    await simulateMutation.mutateAsync({
      leadId: simLeadId || undefined,
      subject: simSubject,
      bodyText: simBody,
    });

    setSimulateModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <Seo
        title="Inbox & Replies | ColdMailerAI"
        description="Monitor inbound replies, AI reply classification, and sequence cadence automation."
      />

      {/* Top Header Bar */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl flex items-center gap-2.5">
            <span>Inbound Replies & Smart Inbox</span>
            {Boolean(stats?.unreadCount) && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-brand text-white font-mono tabular-nums">
                {stats?.unreadCount} new
              </span>
            )}
          </h1>
          <p className="mt-0.5 text-sm text-gray-400">
            Track prospect replies, classify intent, and draft AI responses.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isEmailsFetching}
            className="h-8 px-3 text-xs sm:text-[13px] font-medium rounded-md border border-white/15 bg-surface-900 text-white hover:bg-white/5 transition-colors shadow-none inline-flex items-center gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-gray-400 ${
                isEmailsFetching ? "animate-spin text-brand" : ""
              }`}
            />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => syncRepliesMutation.mutate()}
            disabled={syncRepliesMutation.isPending}
            className="h-8 px-3 text-xs sm:text-[13px] font-medium rounded-md border border-brand/30 bg-brand/10 text-brand-300 hover:bg-brand/20 transition-colors shadow-none inline-flex items-center gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-brand-300 ${
                syncRepliesMutation.isPending ? "animate-spin" : ""
              }`}
            />
            {syncRepliesMutation.isPending ? "Syncing..." : "Sync Mailbox"}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setSimulateModalOpen(true)}
            className="h-8 px-3.5 text-xs sm:text-[13px] font-semibold rounded-md bg-brand text-white hover:bg-brand-400 transition shadow-none"
          >
            Simulate Reply
          </Button>
        </div>
      </section>

      {/* Gmail Read Scope Notice if Re-auth is required */}
      {syncRepliesMutation.data?.reauthRequired?.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-semibold text-white">Gmail Read Permission Required: </span>
              Your connected Gmail mailbox was authorized prior to read syncing. To pull replies directly from Gmail, please reconnect it to approve email read permissions.
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white font-medium h-7 text-xs shrink-0 rounded-md shadow-none"
          >
            <Link to="/dashboard/mailboxes">Reconnect Mailbox</Link>
          </Button>
        </div>
      )}

      {/* Filter Chips Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scroll">
          {[
            { id: "all", label: "All Replies" },
            { id: "interested", label: "Interested" },
            { id: "meeting_request", label: "Meetings" },
            { id: "objection", label: "Objections" },
            { id: "out_of_office", label: "Out of Office" },
            { id: "wrong_person", label: "Wrong Person" },
            { id: "not_interested", label: "Not Interested" },
            { id: "unsubscribe", label: "Unsubscribe" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${selectedCategory === cat.id
                ? "bg-brand text-white shadow-none"
                : "bg-surface-900 border border-white/15 text-gray-400 hover:text-white hover:bg-white/5"
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search prospect or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 bg-surface-900 border-white/15 md:text-[13px] text-white h-7 rounded-md focus:border-brand"
          />
        </div>
      </div>

      {/* Two-Pane Inbox View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-auto lg:h-[calc(100dvh-290px)] min-h-[520px]">
        {/* Left Pane: Email List (4 cols) */}
        <div className="lg:col-span-4 rounded-lg border border-white/10 bg-surface-900 flex flex-col overflow-hidden shadow-none h-full min-h-0">
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-surface-950 shrink-0">
            <span className="text-xs font-semibold text-white">
              Inbound Messages ({inboundEmails.length})
            </span>
            {isEmailsFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/5 custom-scroll">
            {isEmailsLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse space-y-2 p-3 rounded-md bg-white/[0.02]">
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-28 bg-white/10 rounded" />
                      <div className="h-2.5 w-12 bg-white/10 rounded" />
                    </div>
                    <div className="h-3.5 w-40 bg-white/10 rounded" />
                    <div className="h-2.5 w-full bg-white/5 rounded" />
                    <div className="h-4 w-20 bg-white/10 rounded-full mt-2" />
                  </div>
                ))}
              </div>
            ) : inboundEmails.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <Inbox className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs font-medium text-white">No replies found</p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-xs mx-auto text-pretty">
                  When prospects respond to your cold email sequences, their replies appear here with AI classification.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSimulateModalOpen(true)}
                  className="mt-4 h-8 px-3 text-xs font-medium border border-white/15 bg-surface-900 text-white hover:bg-white/5 shadow-none transition-colors"
                >
                  Test with Simulation
                </Button>
              </div>
            ) : (
              inboundEmails.map((email) => {
                const config =
                  CATEGORY_CONFIG[email.classification?.category] || CATEGORY_CONFIG.unknown;
                const isSelected = activeEmail?._id === email._id;
                const companyName =
                  typeof email.leadId?.company === "object"
                    ? email.leadId.company?.name
                    : email.leadId?.company || "";

                return (
                  <div
                    key={email._id}
                    onClick={() => handleSelectEmail(email)}
                    className={`p-3.5 cursor-pointer transition-colors border-l-2 ${isSelected
                      ? "bg-brand/10 border-brand"
                      : "border-transparent hover:bg-white/5"
                      }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Avatar */}
                      <div className="h-7 w-7 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-xs font-semibold text-brand-300 shrink-0 mt-0.5">
                        {(email.from.name || email.from.email || "P")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {!email.isRead && (
                              <span className="h-2 w-2 rounded-full bg-brand shrink-0" />
                            )}
                            <span
                              className={`text-xs truncate ${email.isRead ? "text-gray-300 font-medium" : "text-white font-bold"
                                }`}
                            >
                              {email.from.name || email.from.email}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap font-mono tabular-nums shrink-0">
                            {new Date(email.receivedAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>

                        {companyName && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-1 truncate">
                            <Building2 className="h-3 w-3 text-gray-400 shrink-0" />
                            <span>{companyName}</span>
                          </div>
                        )}

                        <div className="text-xs font-medium text-white truncate mb-0.5">
                          {email.subject}
                        </div>

                        <p className="text-[11px] text-gray-400 truncate">
                          {email.bodyText || "No preview text"}
                        </p>

                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${config.badgeClass}`}
                          >
                            {config.icon}
                            <span>{config.label}</span>
                          </span>

                          {email.sequenceId && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-950 text-gray-400 border border-white/10 truncate max-w-[140px]">
                              {email.sequenceId.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Selected Email & AI Card (Unified Thread View) */}
        <div className="lg:col-span-8 rounded-lg border border-white/10 bg-surface-900 flex flex-col overflow-hidden shadow-none h-full min-h-0">
          {activeEmail ? (
            <>
              {/* Header: Prospect Profile & Quick Actions */}
              <div className="p-4 sm:px-5 sm:py-3.5 border-b border-white/10 bg-surface-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-sm font-semibold text-brand-300 shrink-0">
                    {(activeEmail.from.name || activeEmail.from.email || "L").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">
                        {activeEmail.from.name || activeEmail.from.email}
                      </span>
                      {activeEmail.leadId?.status && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-white/10 text-gray-300 ring-1 ring-inset ring-white/10 uppercase">
                          {activeEmail.leadId.status}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 truncate">
                      <span className="font-mono">{activeEmail.from.email}</span>
                      {(typeof activeEmail.leadId?.company === "object"
                        ? activeEmail.leadId.company?.name
                        : activeEmail.leadId?.company) && (
                          <>
                            <span className="text-gray-600">·</span>
                            <span className="text-gray-300 flex items-center gap-1 truncate text-[11px]">
                              <Building2 className="h-3 w-3 text-gray-400 shrink-0" />
                              {typeof activeEmail.leadId?.company === "object"
                                ? activeEmail.leadId.company?.name
                                : activeEmail.leadId?.company}
                            </span>
                          </>
                        )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setAiReplyModalOpen(true)}
                    className="h-7 px-2.5 text-[11px] font-semibold rounded-md bg-brand text-white hover:bg-brand-400 transition shadow-none inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="h-3 w-3" />
                    AI Reply
                  </Button>

                  {activeEmail.leadId?._id && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px] font-medium rounded-md border border-white/15 bg-surface-900 text-white hover:bg-white/5 transition-colors shadow-none"
                    >
                      <Link to={`/dashboard/leads/${activeEmail.leadId._id}`}>
                        <User className="h-3 w-3 -mr-1 text-gray-400" />
                        CRM Profile
                      </Link>
                    </Button>
                  )}

                  {activeEmail.sequenceId?._id && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px] font-medium rounded-md border border-white/15 bg-surface-900 text-white hover:bg-white/5 transition-colors shadow-none"
                    >
                      <Link to={`/dashboard/sequences/${activeEmail.sequenceId._id}`}>
                        <ExternalLink className="h-3 w-3 -mr-1 text-gray-400" />
                        Sequence
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

              {/* AI Intent & Recommendation Banner */}
              <div className="border-b border-white/10 bg-surface-950/60 px-4 sm:px-5 py-3 space-y-2.5 shrink-0">
                {/* Row 1: AI Intent classification & Re-classify button */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      AI Intent:
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        CATEGORY_CONFIG[activeEmail.classification?.category]?.badgeClass || ""
                      }`}
                    >
                      {CATEGORY_CONFIG[activeEmail.classification?.category]?.icon}
                      <span>{CATEGORY_CONFIG[activeEmail.classification?.category]?.label}</span>
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono tabular-nums whitespace-nowrap">
                      ({Math.round((activeEmail.classification?.confidence || 0.85) * 100)}% match)
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => reclassifyMutation.mutate(activeEmail._id)}
                    disabled={reclassifyMutation.isPending}
                    title="Re-run AI classifier"
                    className="h-6 px-2 text-[11px] font-medium border border-white/15 bg-surface-900 text-gray-300 hover:text-white hover:bg-white/5 transition-colors shadow-none shrink-0 inline-flex items-center gap-1.5"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${reclassifyMutation.isPending ? "animate-spin text-brand" : ""}`}
                    />
                    Re-classify
                  </Button>
                </div>

                {/* Row 2: Summary of Prospect Response */}
                {activeEmail.classification?.summary && (
                  <div className="text-xs text-gray-300 leading-relaxed flex items-start gap-2 pt-0.5">
                    <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider shrink-0 whitespace-nowrap pt-0.5">
                      Summary:
                    </span>
                    <p className="text-gray-300 leading-relaxed">
                      {activeEmail.classification.summary}
                    </p>
                  </div>
                )}

                {/* Row 3: Suggested Next Action Callout (Dedicated row, never squeezed) */}
                {activeEmail.classification?.suggestedAction && (
                  <div className="flex items-start gap-2.5 rounded-md bg-brand/10 border border-brand/20 px-2 py-1 text-[11px]">
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 min-w-0">
                      <span className="text-[10px] font-semibold text-brand-300 uppercase tracking-wider shrink-0 whitespace-nowrap min-w-fit">
                        Next Step:
                      </span>
                      <span className="text-gray-200 font-medium leading-relaxed">
                        {activeEmail.classification.suggestedAction}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Email Content Area */}
              <div className="flex-1 min-h-0 p-5 sm:p-5 sm:py-4 overflow-y-auto space-y-4 custom-scroll">
                <div className="space-y-2 pb-4 border-b border-white/5">
                  <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                    {activeEmail.subject}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-gray-400">
                    <div>
                      <span className="text-gray-200">From: </span>
                      <span className="text-white font-medium">
                        {activeEmail.from.name
                          ? `${activeEmail.from.name} <${activeEmail.from.email}>`
                          : activeEmail.from.email}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-200">To: </span>
                      <span className="text-white font-medium">{activeEmail.to}</span>
                    </div>
                    <div>
                      <span className="text-gray-200">Date: </span>
                      <span className="text-white font-mono">
                        {new Date(activeEmail.receivedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {(() => {
                  const { mainText, quotedText } = splitEmailThread(activeEmail.bodyText || "");
                  return (
                    <div className="space-y-3">
                      <div className="text-xs sm:text-[13px] text-gray-100 leading-relaxed font-sans whitespace-pre-wrap text-pretty">
                        {mainText || activeEmail.bodyText || "No text content available."}
                      </div>

                      {quotedText && (
                        <div className="pt-1">
                          <button
                            type="button"
                            aria-expanded={showQuotedThread}
                            aria-label={showQuotedThread ? "Hide quoted history" : "Show quoted history"}
                            onClick={() => setShowQuotedThread(!showQuotedThread)}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                          >
                            <span className="font-mono text-gray-300">···</span>
                            <span>{showQuotedThread ? "Hide quoted history" : "Show quoted history"}</span>
                          </button>
                          {showQuotedThread && (
                            <div className="mt-2.5 pl-3.5 border-l-2 border-brand/35 text-xs text-gray-400 font-sans leading-relaxed whitespace-pre-wrap bg-white/[0.01] py-1.5 rounded-r text-pretty">
                              {quotedText}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Bottom Quick Action Footer */}
              <div className="p-2.5 px-5 border-t border-white/10 bg-surface-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-gray-400">
                  <span className="text-white font-medium">Ready to reply?</span> Use AI to draft a personalized response based on lead context.
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setAiReplyModalOpen(true)}
                  className="h-7 px-3 text-xs font-semibold rounded-md bg-brand text-white hover:bg-brand-400 transition shadow-none inline-flex items-center gap-1.5 shrink-0"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate AI Reply
                </Button>
              </div>
            </>
          ) : (
            <div className="h-full rounded-lg border border-dashed border-white/15 bg-surface-900 p-12 text-center text-gray-400 flex flex-col items-center justify-center min-h-[460px]">
              <Mail className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-white">Select an email to view conversation details</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                View the AI classification insight, intent score, and suggested responses for each prospective lead.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reply Simulation Dialog */}
      <Dialog open={simulateModalOpen} onOpenChange={setSimulateModalOpen}>
        <DialogContent className="bg-surface-950 border border-white/15 text-white sm:max-w-lg shadow-none">
          <form onSubmit={handleSimulateSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg font-semibold text-white flex items-center gap-2 text-balance">
                Simulate Inbound Lead Reply
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-400 text-pretty">
                Simulates an incoming prospect reply to test automated sequence pausing, cancellation of follow-up jobs, and AI reply classification.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  Target CRM Lead
                </label>
                <Select value={simLeadId} onValueChange={setSimLeadId}>
                  <SelectTrigger className="bg-surface-900 border-white/15 text-xs text-white h-9 rounded-md">
                    <SelectValue placeholder="Select a lead to reply as..." />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-950 border-white/15 text-white max-h-56">
                    {leads.map((l: any) => (
                      <SelectItem key={l._id} value={l._id} className="text-xs">
                        {l.name} — {l.email} ({l.company?.name || "Lead"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  Reply Email Subject
                </label>
                <Input
                  value={simSubject}
                  onChange={(e) => setSimSubject(e.target.value)}
                  placeholder="Re: Following up"
                  className="bg-surface-900 border-white/15 text-xs text-white h-9 rounded-md"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  Inbound Reply Message Body
                </label>
                <Textarea
                  rows={3}
                  value={simBody}
                  onChange={(e) => setSimBody(e.target.value)}
                  placeholder="Type simulated prospect email..."
                  className="bg-surface-900 border-white/15 md:text-[13px] text-white rounded-md resize-none"
                />
              </div>

              {/* Sample Intent Buttons */}
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Quick Intent Templates:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setSimBody(
                        "This looks great! Could you send over pricing and a quick product overview deck?"
                      )
                    }
                    className="px-2.5 py-1 rounded-md bg-surface-900 hover:bg-white/5 text-[11px] text-gray-300 hover:text-white border border-white/10 transition-colors"
                  >
                    Interested
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSimBody(
                        "Let's jump on a quick call next Tuesday at 2pm. Here is my calendar: calendly.com/prospect"
                      )
                    }
                    className="px-2.5 py-1 rounded-md bg-surface-900 hover:bg-white/5 text-[11px] text-gray-300 hover:text-white border border-white/10 transition-colors"
                  >
                    Book Meeting
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSimBody(
                        "We already use Competitor X and have no budget this quarter. Check back in next year."
                      )
                    }
                    className="px-2.5 py-1 rounded-md bg-surface-900 hover:bg-white/5 text-[11px] text-gray-300 hover:text-white border border-white/10 transition-colors"
                  >
                    Objection
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSimBody(
                        "I am out of the office on annual leave until October 25th with limited email access."
                      )
                    }
                    className="px-2.5 py-1 rounded-md bg-surface-900 hover:bg-white/5 text-[11px] text-gray-300 hover:text-white border border-white/10 transition-colors"
                  >
                    Out of Office
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSimBody("Please unsubscribe me and remove my email from your database.")
                    }
                    className="px-2.5 py-1 rounded-md bg-surface-900 hover:bg-white/5 text-[11px] text-gray-300 hover:text-white border border-white/10 transition-colors"
                  >
                    Unsubscribe
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSimulateModalOpen(false)}
                className="h-8 px-3 text-xs font-medium rounded-md border border-white/15 bg-surface-900 text-white hover:bg-white/5 transition-colors shadow-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={simulateMutation.isPending || !simLeadId}
                className="h-8 px-4 text-xs bg-brand text-white hover:bg-brand-400 font-semibold rounded-md shadow-none"
              >
                {simulateMutation.isPending ? "Processing..." : "Ingest & Classify Reply"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ContextualAIGeneratorModal
        open={aiReplyModalOpen}
        onOpenChange={setAiReplyModalOpen}
        initialLeadId={
          typeof activeEmail?.leadId === "string"
            ? activeEmail.leadId
            : activeEmail?.leadId?._id
        }
        replyContext={
          activeEmail
            ? {
                subject: activeEmail.subject,
                fromName: activeEmail.from?.name || activeEmail.from?.email?.split("@")[0],
                fromEmail: activeEmail.from?.email,
                companyName:
                  typeof activeEmail.leadId?.company === "object"
                    ? activeEmail.leadId?.company?.name
                    : typeof activeEmail.leadId?.company === "string"
                      ? activeEmail.leadId?.company
                      : undefined,
                summary: activeEmail.classification?.summary,
                suggestedAction: activeEmail.classification?.suggestedAction,
                bodySnippet: activeEmail.bodyText?.slice(0, 300),
                intent: activeEmail.classification?.intent,
              }
            : undefined
        }
      />
    </div>
  );
}
