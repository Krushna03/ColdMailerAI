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
  Plus,
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
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    bgGlow: "bg-emerald-500/10",
    icon: <ThumbsUp className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />,
  },
  meeting_request: {
    label: "Meeting Request",
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    bgGlow: "bg-purple-500/10",
    icon: <Calendar className="h-3 w-3 text-purple-500 dark:text-purple-400" />,
  },
  objection: {
    label: "Objection",
    badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
    bgGlow: "bg-amber-500/10",
    icon: <AlertTriangle className="h-3 w-3 text-amber-500 dark:text-amber-400" />,
  },
  out_of_office: {
    label: "Out of Office",
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    bgGlow: "bg-blue-500/10",
    icon: <Clock className="h-3 w-3 text-blue-500 dark:text-blue-400" />,
  },
  wrong_person: {
    label: "Wrong Person",
    badgeClass: "bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30",
    bgGlow: "bg-orange-500/10",
    icon: <UserX className="h-3 w-3 text-orange-500 dark:text-orange-400" />,
  },
  not_interested: {
    label: "Not Interested",
    badgeClass: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
    bgGlow: "bg-red-500/10",
    icon: <XCircle className="h-3 w-3 text-red-500 dark:text-red-400" />,
  },
  unsubscribe: {
    label: "Unsubscribe",
    badgeClass: "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40",
    bgGlow: "bg-rose-500/10",
    icon: <ShieldAlert className="h-3 w-3 text-rose-500 dark:text-rose-400" />,
  },
  neutral: {
    label: "General Inquiry",
    badgeClass: "bg-slate-500/15 text-slate-700 dark:text-gray-300 border-slate-500/30",
    bgGlow: "bg-slate-500/10",
    icon: <MessageSquare className="h-3 w-3 text-slate-500 dark:text-gray-400" />,
  },
  unknown: {
    label: "Unclassified",
    badgeClass: "bg-slate-500/10 text-slate-600 dark:text-gray-400 border-white/10",
    bgGlow: "bg-white/5",
    icon: <Bot className="h-3 w-3 text-slate-500 dark:text-gray-400" />,
  },
};

export default function InboxReplies() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [simulateModalOpen, setSimulateModalOpen] = useState(false);
  const [aiReplyModalOpen, setAiReplyModalOpen] = useState(false);

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
    <div className="space-y-6">
      <Seo
        title="Inbox & Replies | ColdMailerAI"
        description="Monitor inbound replies, AI reply classification, and sequence cadence automation."
      />

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Inbound Replies & Smart Inbox</span>
                {stats?.unreadCount ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand text-white">
                    {stats.unreadCount} new
                  </span>
                ) : null}
              </h1>
              <p className="text-xs sm:text-sm text-gray-400">
                AI classifies incoming prospect intent, auto-stops sequence cadences, and suggests high-conversion replies.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => syncRepliesMutation.mutate()}
            disabled={syncRepliesMutation.isPending}
            className="h-8 text-xs font-medium border border-brand/30 bg-brand/10 text-brand-300 hover:bg-brand/20 transition-colors shadow-none"
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
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isEmailsFetching}
            className="h-8 text-xs font-medium border border-white/15 bg-surface-900 text-white hover:bg-white/5 transition-colors shadow-none"
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
            size="sm"
            onClick={() => setSimulateModalOpen(true)}
            className="h-8 px-3 text-xs font-semibold rounded-md bg-brand text-white hover:bg-brand-400 transition shadow-none"
          >
            Simulate Reply
          </Button>
        </div>
      </div>

      {/* Gmail Read Scope Notice if Re-auth is required */}
      {syncRepliesMutation.data?.reauthRequired?.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
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
            className="bg-amber-500 hover:bg-amber-600 text-white font-medium h-7 text-xs shrink-0"
          >
            <Link to="/dashboard/mailboxes">Reconnect Mailbox</Link>
          </Button>
        </div>
      )}

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-surface-900 border border-white/10 rounded-lg p-3.5 shadow-none">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total</span>
            <Inbox className="h-3.5 w-3.5 text-gray-400" />
          </div>
          <div className="text-xl font-semibold text-white font-mono">{stats?.total ?? 0}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Across all mailboxes</div>
        </div>

        <div className="bg-surface-900 border border-white/10 rounded-lg p-3.5 shadow-none">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Interested</span>
            <ThumbsUp className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-semibold text-white font-mono">
            {stats?.categories?.interested ?? 0}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">High buying intent</div>
        </div>

        <div className="bg-surface-900 border border-white/10 rounded-lg p-3.5 shadow-none">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Meetings</span>
            <Calendar className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-semibold text-white font-mono">
            {stats?.categories?.meeting_request ?? 0}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">Call requests</div>
        </div>

        <div className="bg-surface-900 border border-white/10 rounded-lg p-3.5 shadow-none">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Objections</span>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-semibold text-white font-mono">
            {stats?.categories?.objection ?? 0}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">Price / vendor</div>
        </div>

        <div className="bg-surface-900 border border-white/10 rounded-lg p-3.5 shadow-none">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">OOO</span>
            <Clock className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-semibold text-white font-mono">
            {stats?.categories?.out_of_office ?? 0}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">Vacation replies</div>
        </div>

        <div className="bg-surface-900 border border-white/10 rounded-lg p-3.5 shadow-none">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Opt-Out</span>
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-semibold text-white font-mono">
            {stats?.categories?.unsubscribe ?? 0}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">Unsubscribed</div>
        </div>
      </div>

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
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat.id
                  ? "bg-brand text-white shadow-none"
                  : "bg-surface-900 border border-white/15 text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search prospect or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 bg-surface-900 border-white/15 text-xs text-white h-8 rounded-md focus:border-brand"
          />
        </div>
      </div>

      {/* Two-Pane Inbox View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[620px]">
        {/* Left Pane: Email List (5 cols) */}
        <div className="lg:col-span-4 rounded-lg border border-white/10 bg-surface-900 flex flex-col overflow-hidden shadow-none">
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-surface-950">
            <span className="text-xs font-semibold text-white">
              Inbound Messages ({inboundEmails.length})
            </span>
            {isEmailsFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scroll max-h-[680px]">
            {isEmailsLoading ? (
              <div className="py-24 text-center text-xs text-gray-400">
                <Loader2 className="h-6 w-6 animate-spin text-brand mx-auto mb-2" />
                Loading inbound replies...
              </div>
            ) : inboundEmails.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <Inbox className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs font-medium text-white">No replies found</p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-xs mx-auto">
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
                    className={`p-3.5 cursor-pointer transition-colors relative ${
                      isSelected
                        ? "bg-brand/10 border-l-2 border-brand"
                        : "hover:bg-white/5"
                    }`}
                  >
                    {!email.isRead && (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-brand" />
                    )}

                    <div className="flex items-start gap-2.5">
                      {/* Avatar */}
                      <div className="h-8 w-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-xs font-semibold text-brand-300 shrink-0">
                        {(email.from.name || email.from.email || "P")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span
                            className={`text-xs font-semibold truncate ${
                              email.isRead ? "text-gray-400" : "text-white font-bold"
                            }`}
                          >
                            {email.from.name || email.from.email}
                          </span>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap font-mono">
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

                        <div className="text-xs font-medium text-white truncate mb-1">
                          {email.subject}
                        </div>

                        <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                          {email.bodyText || "No preview text"}
                        </p>

                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${config.badgeClass}`}
                          >
                            {config.icon}
                            {config.label}
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

        {/* Right Pane: Selected Email & AI Card (7 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {activeEmail ? (
            <>
              {/* Card 1: AI Reply Intelligence Synopsis */}
              <div className="rounded-lg border border-white/10 bg-surface-900 p-4 sm:p-5 shadow-none space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-md bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                        <span>AI Intent Classification</span>
                        <span className="text-[10px] font-normal text-gray-400">
                          ({Math.round((activeEmail.classification?.confidence || 0.85) * 100)}% confidence)
                        </span>
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        CATEGORY_CONFIG[activeEmail.classification?.category]?.badgeClass || ""
                      }`}
                    >
                      {CATEGORY_CONFIG[activeEmail.classification?.category]?.icon}
                      {CATEGORY_CONFIG[activeEmail.classification?.category]?.label}
                    </span>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => reclassifyMutation.mutate(activeEmail._id)}
                      disabled={reclassifyMutation.isPending}
                      title="Re-run AI classifier"
                      className="h-7 px-2.5 text-[11px] font-medium border border-white/15 bg-surface-950 text-white hover:bg-white/5 transition-colors shadow-none"
                    >
                      <RefreshCw
                        className={`h-3 w-3 mr-1 ${reclassifyMutation.isPending ? "animate-spin" : ""}`}
                      />
                      Re-classify
                    </Button>
                  </div>
                </div>

                {activeEmail.classification?.summary && (
                  <div>
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                      Summary of Prospect Response
                    </span>
                    <p className="text-xs sm:text-[13px] text-gray-700 dark:text-gray-200 bg-surface-950 p-3 rounded-lg border border-white/10 leading-relaxed font-sans">
                      {activeEmail.classification.summary}
                    </p>
                  </div>
                )}

                {activeEmail.classification?.suggestedAction && (
                  <div>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Recommended Next Action
                    </span>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                      <p className="text-xs sm:text-[12px] text-emerald-800 dark:text-emerald-200 leading-relaxed font-medium">
                        {activeEmail.classification.suggestedAction}
                      </p>
                      {activeEmail.leadId?._id && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setAiReplyModalOpen(true)}
                          className="bg-emerald-500 text-white font-medium text-xs h-7 px-3 shrink-0 shadow-none"
                        >
                          Generate Contextual Reply
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Prospect Profile & Cadence Link */}
              <div className="rounded-lg border border-white/10 bg-surface-900 p-4 py-3 shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-sm font-semibold text-brand-300 shrink-0">
                    {(activeEmail.from.name || activeEmail.from.email || "L").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {activeEmail.from.name || activeEmail.from.email}
                      </span>
                      {activeEmail.leadId?.status && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-gray-300 ring-1 ring-inset ring-white/10">
                          {activeEmail.leadId.status.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 font-mono">{activeEmail.from.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {activeEmail.leadId?._id && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAiReplyModalOpen(true)}
                      className="h-8 px-3 text-xs font-medium rounded-md border border-white/15 bg-surface-950 text-white hover:bg-white/5 transition-colors shadow-none"
                    >
                      7-Pillar AI Reply
                    </Button>
                  )}

                  {activeEmail.leadId?._id && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs font-medium rounded-md border border-white/15 bg-surface-950 text-white hover:bg-white/5 transition-colors shadow-none"
                    >
                      <Link to={`/dashboard/leads/${activeEmail.leadId._id}`}>
                        <User className="h-3.5 w-3.5 mr-1 text-gray-400" />
                        CRM Profile
                      </Link>
                    </Button>
                  )}

                  {activeEmail.sequenceId?._id && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs font-medium rounded-md border border-white/15 bg-surface-950 text-white hover:bg-white/5 transition-colors shadow-none"
                    >
                      <Link to={`/dashboard/sequences/${activeEmail.sequenceId._id}`}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1 text-gray-400" />
                        Sequence
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

              {/* Card 3: Full Inbound Message Content */}
              <div className="rounded-lg border border-white/10 bg-surface-900 p-5 shadow-none space-y-3 flex-1">
                <div className="pb-3 border-b border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <h2 className="text-base font-semibold text-white">
                      {activeEmail.subject}
                    </h2>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(activeEmail.bodyText);
                      }}
                      className="h-7 px-2.5 text-xs font-medium border border-white/15 bg-surface-950 text-white hover:bg-white/5 transition-colors shadow-none"
                    >
                      <Copy className="h-3 w-3 mr-1 text-gray-400" />
                      Copy Content
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                    <div>
                      <span className="text-gray-400">From: </span>
                      <span className="text-white font-medium">
                        {activeEmail.from.name ? `${activeEmail.from.name} <${activeEmail.from.email}>` : activeEmail.from.email}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">To: </span>
                      <span className="text-white font-medium">{activeEmail.to}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Date: </span>
                      <span className="text-white font-mono">
                        {new Date(activeEmail.receivedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="max-w-none text-xs sm:text-sm text-gray-700 dark:text-gray-200 leading-relaxed font-sans whitespace-pre-wrap bg-surface-950 p-4 rounded-lg border border-white/10">
                  {activeEmail.bodyText || "No text content available."}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full rounded-lg border border-dashed border-white/15 bg-surface-900 p-12 text-center text-gray-400 flex flex-col items-center justify-center">
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
        <DialogContent className="bg-surface-950 border-white/15 text-white sm:max-w-lg">
          <form onSubmit={handleSimulateSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Simulate Inbound Lead Reply
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-400">
                Simulates an incoming prospect reply to test automated sequence pausing, cancellation of follow-up jobs, and AI reply classification.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Target CRM Lead
                </label>
                <Select value={simLeadId} onValueChange={setSimLeadId}>
                  <SelectTrigger className="bg-surface-900 border-white/10 text-xs text-white h-9 rounded-lg">
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
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Reply Email Subject
                </label>
                <Input
                  value={simSubject}
                  onChange={(e) => setSimSubject(e.target.value)}
                  placeholder="Re: Following up"
                  className="bg-surface-900 border-white/10 text-xs text-white h-9 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Inbound Reply Message Body
                </label>
                <Textarea
                  rows={3}
                  value={simBody}
                  onChange={(e) => setSimBody(e.target.value)}
                  placeholder="Type simulated prospect email..."
                  className="bg-surface-900 border-white/10 md:text-[13px] text-white rounded-lg resize-none"
                />
              </div>

              {/* Sample Intent Buttons */}
              <div>
                <span className="text-[11px] font-medium text-gray-400 block mb-1">
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
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-gray-300 border border-white/10"
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
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-gray-300 border border-white/10"
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
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-gray-300 border border-white/10"
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
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-gray-300 border border-white/10"
                  >
                    Out of Office
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSimBody("Please unsubscribe me and remove my email from your database.")
                    }
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-gray-300 border border-white/10"
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
                className="h-8 text-xs border-white/10 text-gray-950 "
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={simulateMutation.isPending || !simLeadId}
                className="h-8 text-xs bg-brand text-white hover:bg-brand-400 font-medium"
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
        initialLeadId={activeEmail?.leadId?._id}
      />
    </div>
  );
}
