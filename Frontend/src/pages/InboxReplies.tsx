import React, { useState, useMemo } from "react";
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
  ArrowRight,
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

// Refined enterprise semantic badges matching ColdMailer design system
const CATEGORY_CONFIG: Record<
  ReplyCategory,
  {
    label: string;
    badgeClass: string;
    icon: React.ReactNode;
  }
> = {
  interested: {
    label: "Interested",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: <ThumbsUp className="h-3 w-3 text-emerald-400 shrink-0" />,
  },
  meeting_request: {
    label: "Meeting Request",
    badgeClass: "bg-brand/10 text-brand-300 border-brand/20",
    icon: <Calendar className="h-3 w-3 text-brand-300 shrink-0" />,
  },
  objection: {
    label: "Objection",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />,
  },
  out_of_office: {
    label: "Out of Office",
    badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    icon: <Clock className="h-3 w-3 text-sky-400 shrink-0" />,
  },
  wrong_person: {
    label: "Wrong Person",
    badgeClass: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    icon: <UserX className="h-3 w-3 text-orange-400 shrink-0" />,
  },
  not_interested: {
    label: "Not Interested",
    badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    icon: <XCircle className="h-3 w-3 text-rose-400 shrink-0" />,
  },
  unsubscribe: {
    label: "Unsubscribe",
    badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: <ShieldAlert className="h-3 w-3 text-red-400 shrink-0" />,
  },
  neutral: {
    label: "General Inquiry",
    badgeClass: "bg-white/5 text-gray-300 border-white/10",
    icon: <MessageSquare className="h-3 w-3 text-gray-400 shrink-0" />,
  },
  unknown: {
    label: "Unclassified",
    badgeClass: "bg-white/5 text-gray-400 border-white/10",
    icon: <Bot className="h-3 w-3 text-gray-400 shrink-0" />,
  },
};

// Enterprise timestamp formatter (Superhuman/Linear style)
function formatInboundDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const isThisYear = date.getFullYear() === now.getFullYear();
  if (isThisYear) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "2-digit" });
}

// Helper to clean quote markers like leading '>' from lines
const cleanQuoteMarkers = (text: string) => {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*>+\s?/, ""))
    .join("\n");
};

// Helper to separate new response from quoted thread
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

type FilterTab = "all" | "unread" | "opportunities" | "objections";

export default function InboxReplies() {
  const [selectedFilterTab, setSelectedFilterTab] = useState<FilterTab>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [simulateModalOpen, setSimulateModalOpen] = useState(false);
  const [aiReplyModalOpen, setAiReplyModalOpen] = useState(false);
  const [showQuotedThread, setShowQuotedThread] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  // Simulation form state
  const [simLeadId, setSimLeadId] = useState("");
  const [simSubject, setSimSubject] = useState("Re: Outreach proposal");
  const [simBody, setSimBody] = useState(
    "Hi, thanks for reaching out. We are very interested in exploring this! Could you share pricing details and a 15-minute intro link?"
  );

  const { data: stats, isLoading: isStatsLoading, refetch: refetchStats } = useInboundStats();

  // Determine query parameters based on active tab & category select
  const queryCategory = useMemo(() => {
    if (selectedCategory !== "all") return selectedCategory;
    if (selectedFilterTab === "opportunities") return "interested";
    if (selectedFilterTab === "objections") return "objection";
    return undefined;
  }, [selectedCategory, selectedFilterTab]);

  const queryIsRead = useMemo(() => {
    if (selectedFilterTab === "unread") return false;
    return undefined;
  }, [selectedFilterTab]);

  const {
    data: inboundData,
    isLoading: isEmailsLoading,
    isFetching: isEmailsFetching,
    refetch: refetchEmails,
  } = useInboundEmails({
    category: queryCategory,
    isRead: queryIsRead,
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
    setCopiedBody(false);
    if (!email.isRead) {
      markReadMutation.mutate({ id: email._id, isRead: true });
    }
  };

  const handleRefresh = () => {
    refetchEmails();
    refetchStats();
  };

  const handleCopyBody = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
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
    <div className="min-w-0 max-w-full space-y-4 font-sans">
      <Seo
        title="Inbox & Replies | ColdMailerAI"
        description="Monitor inbound prospect replies, AI classification, and sequence cadence automation."
      />

      {/* Top Header Bar */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl flex items-center gap-2.5">
            <span>Inbound Replies</span>
            {Boolean(stats?.unreadCount) && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-brand text-white font-mono tabular-nums">
                {stats?.unreadCount} new
              </span>
            )}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-gray-400">
            Review prospect replies, track intent analytics, and execute AI-assisted follow-ups.
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

      {/* Triage Tabs & Filter Bar */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Segmented Control Tabs */}
        <div className="inline-flex items-center rounded-lg border border-white/10 bg-surface-900 p-0.5 overflow-x-auto max-w-full">
          {[
            { id: "all" as FilterTab, label: "All Messages", count: stats?.total },
            { id: "unread" as FilterTab, label: "Unread", count: stats?.unreadCount },
            {
              id: "opportunities" as FilterTab,
              label: "Opportunities",
              count: (stats?.categories?.interested ?? 0) + (stats?.categories?.meeting_request ?? 0),
            },
            {
              id: "objections" as FilterTab,
              label: "Objections",
              count: (stats?.categories?.objection ?? 0) + (stats?.categories?.wrong_person ?? 0),
            },
          ].map((tab) => {
            const isActive = selectedFilterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedFilterTab(tab.id);
                  setSelectedCategory("all");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-white/10 text-white font-semibold"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === "number" && tab.count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full tabular-nums ${
                      isActive ? "bg-brand text-white" : "bg-white/10 text-gray-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Secondary Category Filter & Search */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <Select
            value={selectedCategory}
            onValueChange={(val) => {
              setSelectedCategory(val);
              if (val === "interested" || val === "meeting_request") {
                setSelectedFilterTab("opportunities");
              } else if (val === "objection") {
                setSelectedFilterTab("objections");
              } else if (val === "all") {
                setSelectedFilterTab("all");
              }
            }}
          >
            <SelectTrigger className="h-8 w-44 text-xs bg-surface-900 border-white/15 text-white rounded-md">
              <SelectValue placeholder="Filter category..." />
            </SelectTrigger>
            <SelectContent className="bg-surface-950 border-white/15 text-white">
              <SelectItem value="all" className="text-xs">All Categories</SelectItem>
              <SelectItem value="interested" className="text-xs">Interested</SelectItem>
              <SelectItem value="meeting_request" className="text-xs">Meeting Request</SelectItem>
              <SelectItem value="objection" className="text-xs">Objection</SelectItem>
              <SelectItem value="out_of_office" className="text-xs">Out of Office</SelectItem>
              <SelectItem value="wrong_person" className="text-xs">Wrong Person</SelectItem>
              <SelectItem value="not_interested" className="text-xs">Not Interested</SelectItem>
              <SelectItem value="unsubscribe" className="text-xs">Unsubscribe</SelectItem>
              <SelectItem value="neutral" className="text-xs">General Inquiry</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search sender, email, subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 bg-surface-900 border-white/15 text-xs text-white h-8 rounded-md focus:border-brand"
            />
          </div>
        </div>
      </section>

      {/* Two-Pane Master-Detail Inbox View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-auto lg:h-[calc(100dvh-340px)] min-h-[560px]">
        {/* Left Pane: Email Thread List (4 cols) */}
        <div className="lg:col-span-4 rounded-lg border border-white/10 bg-surface-900 flex flex-col overflow-hidden shadow-none h-full min-h-0">
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-surface-950 shrink-0">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Inbound Queue ({inboundEmails.length})
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
                <p className="text-xs font-semibold text-white">No replies found</p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-xs mx-auto text-pretty">
                  Prospect replies will automatically appear here with AI intent classification and suggested actions.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSimulateModalOpen(true)}
                  className="mt-4 h-8 px-3 text-xs font-medium border border-white/15 bg-surface-900 text-white hover:bg-white/5 shadow-none transition-colors"
                >
                  Simulate Prospect Reply
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
                    className={`p-3.5 cursor-pointer transition-colors border-l-2 relative ${
                      isSelected
                        ? "bg-white/5 border-brand"
                        : "border-transparent hover:bg-white/[0.03]"
                    }`}
                  >
                    {/* Top Row: Sender + Company + Timestamp */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {!email.isRead && (
                          <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                        )}
                        <span
                          className={`text-xs truncate ${
                            email.isRead ? "text-gray-300 font-medium" : "text-white font-semibold"
                          }`}
                        >
                          {email.from.name || email.from.email}
                        </span>
                        {companyName && (
                          <span className="text-[10px] text-gray-400 truncate max-w-[110px] hidden sm:inline">
                            · {companyName}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap font-mono tabular-nums shrink-0">
                        {formatInboundDate(email.receivedAt)}
                      </span>
                    </div>

                    {/* Middle Row: Subject Line */}
                    <p
                      className={`text-xs truncate mb-1 ${
                        isSelected ? "text-white font-medium" : "text-gray-200"
                      }`}
                    >
                      {email.subject || "(No Subject)"}
                    </p>

                    {/* Snippet Row */}
                    <p className="text-[11px] text-gray-400 truncate leading-relaxed">
                      {email.bodyText || "No preview text"}
                    </p>

                    {/* Bottom Metadata: Status Pill + Sequence Tag */}
                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${config.badgeClass}`}
                      >
                        {config.icon}
                        <span>{config.label}</span>
                      </span>

                      {email.sequenceId && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-400 bg-surface-950 border border-white/5 truncate max-w-[130px]">
                          {email.sequenceId.name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Conversation & Action Surface (8 cols) */}
        <div className="lg:col-span-8 rounded-lg border border-white/10 bg-surface-900 flex flex-col overflow-hidden shadow-none h-full min-h-0">
          {activeEmail ? (
            <>
              {/* Thread Header Toolbar */}
              <div className="px-4 py-3 border-b border-white/10 bg-surface-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-[14px] font-semibold text-white truncate">
                        {activeEmail.from.name || activeEmail.from.email}
                      </span>
                      {activeEmail.leadId?.status && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-medium bg-white/10 text-white ring-1 ring-inset ring-white/20 uppercase font-sans">
                          {activeEmail.leadId.status}
                        </span>
                      )}
                      <span
                      className={`inline-flex items-center gap-1 px-2 py-0 rounded-full text-[10px] font-medium border ${
                        CATEGORY_CONFIG[activeEmail.classification?.category]?.badgeClass || ""
                      }`}
                    >
                      <span>{CATEGORY_CONFIG[activeEmail.classification?.category]?.label}</span>
                    </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 truncate mt-0.5">
                      <span className="font-mono">{activeEmail.from.email}</span>
                      {(typeof activeEmail.leadId?.company === "object"
                        ? activeEmail.leadId.company?.name
                        : activeEmail.leadId?.company) && (
                        <>
                          <span className="text-gray-600">·</span>
                          <span className="text-gray-300 truncate text-[11px] flex items-center gap-1">
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

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setAiReplyModalOpen(true)}
                    className="h-7 px-2.5 text-[11px] font-semibold rounded-md bg-brand text-white hover:bg-brand-400 transition shadow-none inline-flex items-center gap-1.5"
                  >
                    Draft AI Reply
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => reclassifyMutation.mutate(activeEmail._id)}
                    disabled={reclassifyMutation.isPending}
                    title="Re-run AI intent classifier"
                    className="h-7 px-2 text-[11px] font-medium rounded-md border border-white/15 bg-surface-900 text-white hover:bg-white/5 transition-colors shadow-none inline-flex items-center gap-1.5"
                  >
                    <RefreshCw
                      className={`h-3 w-3 text-gray-400 ${
                        reclassifyMutation.isPending ? "animate-spin text-brand" : ""
                      }`}
                    />
                    Reclassify
                  </Button>

                  {activeEmail.leadId?._id && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px] font-medium rounded-md border border-white/15 bg-surface-900 text-white hover:bg-white/5 transition-colors shadow-none inline-flex items-center gap-1.5"
                    >
                      <Link to={`/dashboard/leads/${activeEmail.leadId._id}`}>
                        <User className="h-3 w-3 text-gray-400" />
                        CRM Profile
                      </Link>
                    </Button>
                  )}

                  {activeEmail.sequenceId?._id && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px] font-medium rounded-md border border-white/15 bg-surface-900 text-white hover:bg-white/5 transition-colors shadow-none inline-flex items-center gap-1"
                    >
                      <Link to={`/dashboard/sequences/${activeEmail.sequenceId._id}`}>
                        <ExternalLink className="h-2 w-2 text-gray-400" />
                        Sequence
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

              {/* Executive Intelligence Brief */}
              <div className="border-b border-white/10 bg-surface-950/80 px-4 py-2.5 space-y-2 shrink-0">
                {/* 1-Sentence Synthesis */}
                {activeEmail.classification?.summary && (
                  <div className="text-[11px] text-gray-300 leading-relaxed font-sans flex items-start gap-1">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider shrink-0 pt-0.5">
                      Summary:
                    </span>
                    <p className="text-gray-200">{activeEmail.classification.summary}</p>
                  </div>
                )}

                {/* Recommended Action Row */}
                {activeEmail.classification?.suggestedAction && (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-surface-900 px-2 py-0.5">
                    <div className="flex items-start sm:items-center gap-1 min-w-0">
                      <span className="text-[10px] font-semibold text-brand-300 uppercase tracking-wider shrink-0">
                        Next Action:
                      </span>
                      <span className="text-[11px] text-gray-200 font-medium truncate">
                        {activeEmail.classification.suggestedAction}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Reading Surface */}
              <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-3.5 custom-scroll">
                <div className="space-y-1.5 pb-3 border-b border-white/5">
                  <h2 className="text-xs sm:text-[13px] font-semibold text-white tracking-tight text-balance">
                    {activeEmail.subject || "(No Subject)"}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-400">
                    <div>
                      <span className="text-gray-400">From: </span>
                      <span className="text-gray-200 font-medium">
                        {activeEmail.from.name
                          ? `${activeEmail.from.name} <${activeEmail.from.email}>`
                          : activeEmail.from.email}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">To: </span>
                      <span className="text-gray-200 font-medium">{activeEmail.to}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Received: </span>
                      <span className="text-gray-300 font-mono">
                        {new Date(activeEmail.receivedAt).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {(() => {
                  const { mainText, quotedText } = splitEmailThread(activeEmail.bodyText || "");
                  return (
                    <div className="space-y-3">
                      <div className="text-xs text-gray-200 leading-relaxed font-sans whitespace-pre-wrap text-pretty">
                        {mainText || activeEmail.bodyText || "No text content available."}
                      </div>

                      {quotedText && (
                        <div className="pt-1">
                          <button
                            type="button"
                            aria-expanded={showQuotedThread}
                            aria-label={showQuotedThread ? "Hide quoted message history" : "Show quoted message history"}
                            onClick={() => setShowQuotedThread(!showQuotedThread)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                          >
                            <span className="font-mono text-gray-300">···</span>
                            <span>{showQuotedThread ? "Hide quoted history" : "Show quoted history"}</span>
                          </button>
                          {showQuotedThread && (
                            <div className="mt-2 pl-3 border-l-2 border-white/20 text-[11px] text-gray-400 font-sans leading-relaxed whitespace-pre-wrap bg-white/[0.02] py-1.5 rounded-r text-pretty">
                              {quotedText}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Docked Follow-Up Bar */}
              <div className="px-4 py-2.5 border-t border-white/10 bg-surface-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
                <div className="flex items-center gap-2 text-[11px] text-gray-400 min-w-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="truncate">
                    Ready to follow up with{" "}
                    <strong className="text-white font-semibold">
                      {activeEmail.from.name || activeEmail.from.email}
                    </strong>
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setAiReplyModalOpen(true)}
                  className="h-7 px-3 text-[11px] font-semibold rounded-md bg-brand text-white hover:bg-brand-400 transition shadow-none inline-flex items-center gap-1.5 shrink-0"
                >
                  <Sparkles className="h-3 w-3" />
                  Open AI Reply Composer
                </Button>
              </div>
            </>
          ) : (
            <div className="h-full rounded-lg border border-dashed border-white/15 bg-surface-900 p-8 text-center text-gray-400 flex flex-col items-center justify-center min-h-[460px]">
              <Mail className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-xs sm:text-[13px] font-semibold text-white">Select a reply from the queue</p>
              <p className="text-[11px] text-gray-400 mt-1 max-w-xs text-pretty">
                View prospect message history, AI intent classification, and compose context-aware responses.
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
                    {leads.map((l: any) => {
                      const compName =
                        typeof l.company === "object" ? l.company?.name : l.company;
                      return (
                        <SelectItem key={l._id} value={l._id} className="text-xs">
                          {l.name} — {l.email} ({compName || "Lead"})
                        </SelectItem>
                      );
                    })}
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
