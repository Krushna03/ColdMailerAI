import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Trash2,
  Mail,
  Users,
  CheckCircle,
  ArrowRight,
  MessageSquare,
  Layers,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Seo from "../components/common/Seo";
import {
  useSequences,
  useCreateSequence,
  useUpdateSequenceStatus,
  useDeleteSequence,
  useTriggerSequenceRun,
} from "../hooks/useSequences";
import { useMailboxes } from "../hooks/useMailboxes";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import ConfirmDeleteDialog from "../components/common/ConfirmDeleteDialog";
import { Sequence } from "../types/sequence";

export default function Sequences() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sequenceToDelete, setSequenceToDelete] = useState<Sequence | null>(null);

  // Form state for creating sequence
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templatePreset, setTemplatePreset] = useState<"saas" | "investor" | "blank">("saas");
  const [selectedMailboxId, setSelectedMailboxId] = useState("");
  const [stopOnReply, setStopOnReply] = useState(true);

  const { data: sequencesData, isLoading, refetch } = useSequences({
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search.trim() || undefined,
  });

  const { data: mailboxes = [] } = useMailboxes();
  const createMutation = useCreateSequence();
  const updateStatusMutation = useUpdateSequenceStatus();
  const deleteMutation = useDeleteSequence();
  const triggerRunMutation = useTriggerSequenceRun();

  const sequences = sequencesData?.sequences || [];

  // Summary Metrics
  const totalSequences = sequences.length;
  const activeSequences = sequences.filter((s) => s.status === "active").length;
  const totalEnrolled = sequences.reduce((sum, s) => sum + (s.stats?.totalEnrolled || 0), 0);
  const totalReplied = sequences.reduce((sum, s) => sum + (s.stats?.repliedCount || 0), 0);
  const replyRate = totalEnrolled > 0 ? Math.round((totalReplied / totalEnrolled) * 100) : 0;

  const handleCreateSequence = async () => {
    if (!name.trim()) return;

    let initialSteps: any[] = [];

    if (templatePreset === "saas") {
      initialSteps = [
        {
          order: 1,
          type: "email",
          title: "Day 0 — Initial Value Hook",
          delay: { value: 0, unit: "days" },
          template: {
            subject: "Quick question regarding {{company}}",
            body: "Hi {{firstName|there}},\n\nI noticed your recent expansion at {{company}}. We help sales teams automate personalized outreach.\n\nWould you be open to a 5-minute chat this week?\n\nBest,\n[My Name]",
          },
        },
        {
          order: 2,
          type: "wait",
         title: "Wait 3 days",
          delay: { value: 3, unit: "days" },
        },
        {
          order: 3,
          type: "condition",
          title: "If no reply",
          conditions: {
            field: "replyReceived",
            operator: "is_false",
            actionOnFalse: "stop",
          },
        },
        {
          order: 4,
          type: "email",
          title: "Email #2 — Case Study & Insights",
          delay: { value: 4, unit: "days" },
          template: {
            subject: "Following up on {{company}}'s workflow",
            body: "Hey {{firstName}},\n\nWanted to follow up with our latest SaaS report detailing how similar companies boosted reply rates by 3.4x.\n\nLet me know if you'd like a copy!\n\nBest,\n[My Name]",
          },
        },
        {
          order: 5,
          type: "wait",
          title: "Wait 5 days",
          delay: { value: 5, unit: "days" },
        },
        {
          order: 6,
          type: "email",
          title: "Breakup Email",
          delay: { value: 5, unit: "days" },
          template: {
            subject: "Permission to close file on {{company}}?",
            body: "Hi {{firstName}},\n\nI assume this isn't high priority right now. I won't bother you further.\n\nFeel free to reach out if priorities change down the road!\n\nBest,\n[My Name]",
          },
        },
      ];
    } else if (templatePreset === "investor") {
      initialSteps = [
        {
          order: 1,
          type: "email",
          title: "Step 1: Introduction Pitch",
          delay: { value: 0, unit: "days" },
          template: {
            subject: "Connecting regarding {{company}}",
            body: "Hi {{firstName|there}},\n\nWe are building the future of sales engagement with ColdMailerAI. Would love to share our deck.\n\nBest,\n[My Name]",
          },
        },
        {
          order: 2,
          type: "wait",
          title: "Wait 4 days",
          delay: { value: 4, unit: "days" },
        },
        {
          order: 3,
          type: "email",
          title: "Step 2: Traction Update",
          delay: { value: 4, unit: "days" },
          template: {
            subject: "Quick update on {{company}}'s growth",
            body: "Hey {{firstName}},\n\nFollowing up with our latest month-over-month numbers.\n\nBest,\n[My Name]",
          },
        },
      ];
    }

    try {
      const created = await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        status: "draft",
        settings: {
          stopOnReply,
          stopOnClick: false,
          stopOnMeetingBooked: true,
          sendOnDays: [1, 2, 3, 4, 5],
          sendWindow: { enabled: false, start: "09:00", end: "17:00", timezone: "UTC" },
          mailboxId: selectedMailboxId || null,
          trackOpens: true,
          trackClicks: true,
          maxDailyEnrollments: 100,
        },
        enrollmentRules: {
          allowReenrollment: false,
          stopIfLeadStatus: ["replied", "meeting", "closed", "archived"],
        },
        steps: initialSteps,
      });

      setCreateModalOpen(false);
      setName("");
      setDescription("");
      navigate(`/dashboard/sequences/${created._id}`);
    } catch {
      // Error message is toasted via useCreateSequence onError and displayed inline in dialog
    }
  };

  const handleToggleStatus = (seq: Sequence) => {
    const nextStatus = seq.status === "active" ? "paused" : "active";
    updateStatusMutation.mutate({ id: seq._id, status: nextStatus });
  };

  return (
    <div className="space-y-5 text-white">
      <Seo
        title="Sales Sequences & Workflow Cadences | ColdMailerAI"
        description="Multi-step sales sequences, condition branching, and sales engagement workflows that automatically stop on reply."
      />

      {/* Header */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Sales Sequences & Cadences
          </h1>
          <p className="mt-1 max-w-xl text-sm text-gray-400">
            Design multi-step email pipelines & AI workflows that automatically stop on reply.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => triggerRunMutation.mutate()}
            disabled={triggerRunMutation.isPending}
            className="h-8 px-3 text-xs sm:text-[13px] font-medium rounded-md border border-white/15 bg-surface-900 text-white hover:bg-white/5 transition-colors hover:text-white"
          >
            <RefreshCw
              className={`h-3 w-3 ${triggerRunMutation.isPending ? "animate-spin" : ""}`}
            />
            Run Engine Now
          </Button>

          <Button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="h-8 px-3 text-xs sm:text-[13px] rounded-md bg-brand text-white hover:bg-brand-400 font-medium shadow-none transition-colors flex items-center gap-1.5 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            New Sequence
          </Button>
        </div>
      </section>

      {/* Overview Stat Cards matching Dashboard & Mailboxes */}
      <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Sequences */}
        <article className="rounded-lg border border-white/10 bg-surface-900 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Total Sequences
            </p>
            <span className="rounded-md bg-white/5 p-1.5 text-gray-300 border border-white/5">
              <Workflow className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-xl sm:text-xl font-semibold text-white tracking-tight font-mono">
              {totalSequences}
            </p>
            {activeSequences > 0 && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-white/10 text-white ring-1 ring-inset ring-white/20 font-sans">
                {activeSequences} active
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Configured outreach cadences
          </p>
        </article>

        {/* Active Workflows */}
        <article className="rounded-lg border border-white/10 bg-surface-900 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Active Workflows
            </p>
            <span className="rounded-md bg-white/5 p-1.5 text-gray-300 border border-white/5">
              <Play className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-xl sm:text-xl font-semibold text-white tracking-tight font-mono">
              {activeSequences}
            </p>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-white/10 text-white ring-1 ring-inset ring-white/20 font-sans">
              Running
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Dispatching steps automatically
          </p>
        </article>

        {/* Leads Enrolled */}
        <article className="rounded-lg border border-white/10 bg-surface-900 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Leads Enrolled
            </p>
            <span className="rounded-md bg-white/5 p-1.5 text-gray-300 border border-white/5">
              <Users className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-xl sm:text-xl font-semibold text-white tracking-tight font-mono">
              {totalEnrolled}
            </p>
            {totalReplied > 0 && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-white/10 text-white ring-1 ring-inset ring-white/20 font-sans">
                {totalReplied} replies
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Prospects in active pipelines
          </p>
        </article>

        {/* Overall Reply Rate */}
        <article className="rounded-lg border border-white/10 bg-surface-900 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Overall Reply Rate
            </p>
            <span className="rounded-md bg-white/5 p-1.5 text-gray-300 border border-white/5">
              <MessageSquare className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-xl sm:text-xl font-semibold text-white tracking-tight font-mono">
              {replyRate}%
            </p>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-white/10 text-white ring-1 ring-inset ring-white/20 font-sans">
              Stop on reply
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Halts cadence when prospect responds
          </p>
        </article>
      </section>

      {/* Sequences Header & Filters */}
      <section className="space-y-4 pt-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {["all", "active", "draft", "paused"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`h-8 px-3 rounded-md text-xs font-medium capitalize transition-colors ${
                  statusFilter === tab
                    ? "bg-brand text-white font-medium shadow-none"
                    : "border border-white/15 bg-surface-900 text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sequences..."
              className="pl-9 h-8 text-xs bg-surface-900 border-white/15 text-white rounded-md placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Sequences Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
            <Loader2 className="h-5 w-5 animate-spin mr-2 text-brand-300" />
            Loading sequences...
          </div>
        ) : sequences.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/15 bg-surface-900 p-8 sm:p-9 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/5 text-gray-300">
              <Workflow className="h-5 w-5 text-brand-300" />
            </div>

            <h3 className="mt-3 text-base sm:text-lg font-semibold text-white tracking-tight">
              No Sequences Found
            </h3>
            <p className="mx-auto mt-1 max-w-lg text-xs sm:text-sm text-gray-400">
              Create multi-step sales cadences with automated follow-ups and reply-stopping rules.
            </p>
            <Button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="mt-4 h-9 px-3.5 text-xs sm:text-[13px] rounded-md bg-brand text-white hover:bg-brand-400 font-medium shadow-none transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Your First Sequence
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sequences.map((seq) => {
              const isActive = seq.status === "active";
              const isDraft = seq.status === "draft";
              const isPaused = seq.status === "paused";

              const mailboxEmail =
                typeof seq.settings?.mailboxId === "object" && seq.settings?.mailboxId?.email
                  ? seq.settings.mailboxId.email
                  : null;

              return (
                <div
                  key={seq._id}
                  className="group relative flex flex-col justify-between rounded-lg border border-white/10 bg-surface-900 hover:border-white/20 transition-colors p-4"
                >
                  <div>
                    {/* Top Bar */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset font-sans ${
                          isActive
                            ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                            : isPaused
                            ? "bg-amber-500/15 text-amber-300 ring-amber-500/30"
                            : "bg-white/5 text-gray-300 ring-white/10"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isActive
                              ? "bg-emerald-400 animate-pulse"
                              : isPaused
                              ? "bg-amber-400"
                              : "bg-gray-400"
                          }`}
                        />
                        {seq.status.toUpperCase()}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(seq)}
                          title={isActive ? "Pause Sequence" : "Activate Sequence"}
                          className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                        >
                          {isActive ? (
                            <Pause className="h-3.5 w-3.5 text-amber-400" />
                          ) : (
                            <Play className="h-3.5 w-3.5 text-emerald-400" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSequenceToDelete(seq);
                            setDeleteModalOpen(true);
                          }}
                          title="Delete Sequence"
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <Link
                      to={`/dashboard/sequences/${seq._id}`}
                      className="block group-hover:text-brand-300 transition-colors"
                    >
                      <h3 className="text-base font-semibold text-white group-hover:text-brand-300 transition-colors truncate">
                        {seq.name}
                      </h3>
                    </Link>
                    <p className="mt-1 text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {seq.description || "Automated multi-step outreach sequence."}
                    </p>

                    {/* Metadata Chips */}
                    <div className="flex flex-wrap items-center gap-2 mt-3 mb-4 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 text-gray-300">
                        <Layers className="h-3 w-3 text-brand-300" />
                        {seq.stepsCount || 0} Steps
                      </span>
                      {seq.settings?.stopOnReply && (
                        <span className="flex items-center gap-1 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 text-purple-300">
                          <CheckCircle className="h-3 w-3" />
                          Stop on Reply
                        </span>
                      )}
                      {mailboxEmail && (
                        <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 truncate max-w-[150px] text-gray-300 font-mono">
                          <Mail className="h-3 w-3" />
                          {mailboxEmail}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats & Link Footer */}
                  <div className="pt-3 border-t border-white/10 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-surface-950 p-2 rounded-md border border-white/5">
                        <div className="text-white font-mono font-medium text-xs sm:text-sm">{seq.stats?.totalEnrolled || 0}</div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block mt-0.5">Enrolled</span>
                      </div>
                      <div className="bg-surface-950 p-2 rounded-md border border-white/5">
                        <div className="text-emerald-400 font-mono font-medium text-xs sm:text-sm">{seq.stats?.activeCount || 0}</div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block mt-0.5">Active</span>
                      </div>
                      <div className="bg-surface-950 p-2 rounded-md border border-white/5">
                        <div className="text-purple-400 font-mono font-medium text-xs sm:text-sm">{seq.stats?.repliedCount || 0}</div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block mt-0.5">Replied</span>
                      </div>
                    </div>

                    <Button
                      asChild
                      variant="outline"
                      className="w-full h-8 text-xs rounded-md border border-white/15 bg-surface-900 text-gray-300 hover:bg-white/5 hover:text-white font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Link to={`/dashboard/sequences/${seq._id}`}>
                        View Pipeline
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* New Sequence Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-2xl bg-surface-950 border border-white/10 text-white rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white">
              Create New Sequence
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs">
              Configure a structured cadence workflow with dynamic steps, delays, and stop conditions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {createMutation.isError && (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  {(createMutation.error as any)?.response?.data?.errors?.join(". ") ||
                    (createMutation.error as any)?.response?.data?.message ||
                    createMutation.error?.message ||
                    "Validation error: Failed to create sequence"}
                </span>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-300 block mb-1.5">
                Sequence Name *
              </label>
              <Input
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SaaS Founder Outreach Cadence"
                className="bg-surface-900 border-white/15 text-white rounded-md placeholder:text-gray-500 md:text-sm h-9"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-300">
                  Description (Optional)
                </label>
                <span className={`text-[10px] ${description.length > 500 ? "text-red-400 font-medium" : "text-gray-500"}`}>
                  {description.length}/500
                </span>
              </div>
              <textarea
                value={description}
                maxLength={500}
                rows={2}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Targeting Series A founders in North America..."
                className="w-full bg-surface-900 border border-white/15 text-white rounded-md p-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:border-brand transition-colors resize-none"
              />
            </div>

            {/* Template Presets */}
            <div>
              <label className="text-xs font-medium text-gray-300 block mb-1.5">
                Starting Pipeline Preset
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: "saas",
                    title: "SaaS Outreach",
                    desc: "6 steps (Day 0 Email -> Wait 3d -> Condition -> Email #2 -> Breakup)",
                  },
                  {
                    id: "investor",
                    title: "Investor Pitch",
                    desc: "3 steps (Pitch -> Wait 4d -> Follow-up)",
                  },
                  {
                    id: "blank",
                    title: "Blank Canvas",
                    desc: "Start with an empty workflow",
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTemplatePreset(item.id as any)}
                    className={`p-3 rounded-lg border text-left transition-colors flex flex-col justify-between ${
                      templatePreset === item.id
                        ? "bg-brand/10 border-brand text-white"
                        : "bg-surface-900 border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className="text-xs font-medium text-white mb-1">{item.title}</span>
                    <span className="text-[10px] text-gray-400 leading-tight">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sender Mailbox */}
            <div>
              <label className="text-xs font-medium text-gray-300 block mb-1.5">
                Default Sender Mailbox
              </label>
              <Select
                value={selectedMailboxId || "auto"}
                onValueChange={(val) => setSelectedMailboxId(val === "auto" ? "" : val)}
              >
                <SelectTrigger className="w-full bg-surface-900 border-white/15 rounded-md text-xs text-white h-9 focus:ring-brand">
                  <SelectValue placeholder="Auto-Assign / Default Mailbox" />
                </SelectTrigger>
                <SelectContent className="bg-surface-900 border-white/15 text-white">
                  <SelectItem value="auto" className="text-xs">
                    Auto-Assign / Default Mailbox
                  </SelectItem>
                  {mailboxes.map((mb) => (
                    <SelectItem key={mb._id} value={mb._id} className="text-xs">
                      {mb.email} ({mb.provider.toUpperCase()} - Health: {mb.health?.score ?? 100}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stop on reply checkbox */}
            <div
              onClick={() => setStopOnReply(!stopOnReply)}
              className="flex items-start gap-3 cursor-pointer bg-surface-900 p-3 rounded-lg border border-white/10 hover:border-white/15 transition-colors"
            >
              <Checkbox
                checked={stopOnReply}
                onCheckedChange={(val) => setStopOnReply(Boolean(val))}
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5"
              />
              <div className="text-xs select-none">
                <span className="font-medium text-white block">
                  Automatically Stop on Reply (Recommended)
                </span>
                <span className="text-gray-400 text-[11px] leading-relaxed block mt-0.5">
                  When an enrolled lead replies, automatically halt further scheduled emails in this sequence.
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
              className="h-9 px-3 text-xs sm:text-[13px] rounded-md border border-white/15 bg-surface-900 text-gray-300 hover:bg-white/5 hover:text-white font-medium transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!name.trim() || createMutation.isPending}
              onClick={handleCreateSequence}
              className="h-9 px-3.5 text-xs sm:text-[13px] rounded-md bg-brand text-white hover:bg-brand-400 font-medium shadow-none transition-colors"
            >
              {createMutation.isPending ? "Creating..." : "Create & Open Builder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Sequence Dialog */}
      <ConfirmDeleteDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Sequence"
        description={`Are you sure you want to delete "${sequenceToDelete?.name}"? All workflow steps and active lead enrollments will be permanently removed.`}
        onConfirm={() => {
          if (sequenceToDelete) {
            deleteMutation.mutate(sequenceToDelete._id);
            setSequenceToDelete(null);
          }
        }}
      />
    </div>
  );
}
