import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Workflow,
  ArrowLeft,
  Play,
  Pause,
  Plus,
  Users,
  Settings as SettingsIcon,
  RefreshCw,
  Clock,
  AlertCircle,
  AlertTriangle,
  History,
  Layers,
  Loader2,
  Send,
  Trash2,
  Copy,
  Save,
  RotateCcw,
  FileText,
  CheckCircle2,
  Globe,
  Calendar,
  ShieldAlert,
  Sparkles,
  Mail,
  Settings,
} from "lucide-react";
import Seo from "../components/common/Seo";
import {
  useSequence,
  useSaveSequenceSteps,
  useUpdateSequence,
  useUpdateSequenceStatus,
  useSequenceEnrollments,
  useUpdateEnrollmentStatus,
  useTriggerSequenceRun,
  useDeleteSequence,
  useCreateSequence,
} from "../hooks/useSequences";
import { useMailboxes } from "../hooks/useMailboxes";
import { useToast } from "../hooks/use-toast";
import { SequenceStep, SequenceEnrollment, SequenceStatus } from "../types/sequence";
import SequenceStepCard from "../components/sequences/SequenceStepCard";
import StepEditorModal from "../components/sequences/StepEditorModal";
import EnrollLeadsModal from "../components/sequences/EnrollLeadsModal";
import StepHistoryDialog from "../components/sequences/StepHistoryDialog";
import { SequenceQueueTab } from "../components/sequences/SequenceQueueTab";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

export default function SequenceDetail() {
  const { sequenceId } = useParams<{ sequenceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"steps" | "leads" | "settings" | "queue">("steps");

  // Step modal
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<SequenceStep | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);

  // Enroll modal
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);

  // History timeline dialog
  const [historyEnrollment, setHistoryEnrollment] = useState<SequenceEnrollment | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  // Queries & Mutations
  const { data: sequence, isLoading } = useSequence(sequenceId);
  const { data: enrollmentsData, isLoading: enrollmentsLoading } = useSequenceEnrollments(sequenceId);
  const { data: mailboxes = [] } = useMailboxes();

  const saveStepsMutation = useSaveSequenceSteps();
  const updateSequenceMutation = useUpdateSequence();
  const updateStatusMutation = useUpdateSequenceStatus();
  const updateEnrollmentMutation = useUpdateEnrollmentStatus();
  const triggerRunMutation = useTriggerSequenceRun();
  const deleteSequenceMutation = useDeleteSequence();
  const createSequenceMutation = useCreateSequence();

  const [localSteps, setLocalSteps] = useState<SequenceStep[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Settings form state: General Details
  const [settingsName, setSettingsName] = useState("");
  const [settingsDescription, setSettingsDescription] = useState("");
  const [settingsStatus, setSettingsStatus] = useState<SequenceStatus>("draft");

  // Settings form state: Delivery & Sending Window
  const [settingsMailboxId, setSettingsMailboxId] = useState("");
  const [settingsSendDays, setSettingsSendDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [settingsSendWindowEnabled, setSettingsSendWindowEnabled] = useState(false);
  const [settingsSendWindowStart, setSettingsSendWindowStart] = useState("09:00");
  const [settingsSendWindowEnd, setSettingsSendWindowEnd] = useState("17:00");
  const [settingsSendWindowTimezone, setSettingsSendWindowTimezone] = useState("UTC");
  const [settingsMaxDailyEnrollments, setSettingsMaxDailyEnrollments] = useState(100);
  const [settingsTrackOpens, setSettingsTrackOpens] = useState(true);
  const [settingsTrackClicks, setSettingsTrackClicks] = useState(true);

  // Settings form state: Stop & Automation Rules
  const [settingsStopOnReply, setSettingsStopOnReply] = useState(true);
  const [settingsStopOnMeeting, setSettingsStopOnMeeting] = useState(true);
  const [settingsStopOnClick, setSettingsStopOnClick] = useState(false);
  const [settingsAllowReenrollment, setSettingsAllowReenrollment] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Sync loaded sequence
  React.useEffect(() => {
    if (sequence) {
      setLocalSteps(sequence.steps || []);
      setSettingsName(sequence.name || "");
      setSettingsDescription(sequence.description || "");
      setSettingsStatus(sequence.status || "draft");
      setSettingsStopOnReply(sequence.settings?.stopOnReply ?? true);
      setSettingsStopOnMeeting(sequence.settings?.stopOnMeetingBooked ?? true);
      setSettingsStopOnClick(sequence.settings?.stopOnClick ?? false);
      setSettingsMailboxId(
        typeof sequence.settings?.mailboxId === "object"
          ? sequence.settings?.mailboxId?._id
          : sequence.settings?.mailboxId || ""
      );
      setSettingsSendDays(sequence.settings?.sendOnDays || [1, 2, 3, 4, 5]);
      setSettingsSendWindowEnabled(sequence.settings?.sendWindow?.enabled ?? false);
      setSettingsSendWindowStart(sequence.settings?.sendWindow?.start || "09:00");
      setSettingsSendWindowEnd(sequence.settings?.sendWindow?.end || "17:00");
      setSettingsSendWindowTimezone(sequence.settings?.sendWindow?.timezone || "UTC");
      setSettingsMaxDailyEnrollments(sequence.settings?.maxDailyEnrollments ?? 100);
      setSettingsTrackOpens(sequence.settings?.trackOpens ?? true);
      setSettingsTrackClicks(sequence.settings?.trackClicks ?? true);
      setSettingsAllowReenrollment(sequence.enrollmentRules?.allowReenrollment ?? false);
    }
  }, [sequence]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin text-brand mb-3" />
        <p className="text-sm">Loading workflow sequence...</p>
      </div>
    );
  }

  if (!sequence) {
    return (
      <div className="rounded-xl border border-white/10 bg-surface-900 p-8 text-center text-white">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold mb-2">Sequence Not Found</h2>
        <p className="text-sm text-gray-400 mb-4">The requested sequence does not exist or has been deleted.</p>
        <Button asChild variant="outline" className="border-white/10 text-white">
          <Link to="/dashboard/sequences">Return to Sequences</Link>
        </Button>
      </div>
    );
  }

  const enrollments = enrollmentsData?.enrollments || [];
  const isActive = sequence.status === "active";

  const handleToggleStatus = () => {
    const nextStatus = isActive ? "paused" : "active";
    updateStatusMutation.mutate({ id: sequence._id, status: nextStatus });
  };

  // Step Management
  const handleOpenAddStep = () => {
    setEditingStep(null);
    setEditingIndex(-1);
    setStepModalOpen(true);
  };

  const handleEditStep = (step: SequenceStep) => {
    const idx = localSteps.findIndex((s) => s.order === step.order);
    setEditingStep(step);
    setEditingIndex(idx);
    setStepModalOpen(true);
  };

  const handleSaveStep = (step: SequenceStep) => {
    let updated: SequenceStep[] = [];
    if (editingIndex >= 0) {
      updated = localSteps.map((s, idx) => (idx === editingIndex ? step : s));
    } else {
      updated = [...localSteps, { ...step, order: localSteps.length + 1 }];
    }

    // Re-index order
    const ordered = updated.map((s, i) => ({ ...s, order: i + 1 }));
    setLocalSteps(ordered);
    setHasUnsavedChanges(true);
  };

  const handleDeleteStep = (index: number) => {
    const updated = localSteps.filter((_, idx) => idx !== index);
    const ordered = updated.map((s, i) => ({ ...s, order: i + 1 }));
    setLocalSteps(ordered);
    setHasUnsavedChanges(true);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const copy = [...localSteps];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    const ordered = copy.map((s, i) => ({ ...s, order: i + 1 }));
    setLocalSteps(ordered);
    setHasUnsavedChanges(true);
  };

  const handleMoveDown = (index: number) => {
    if (index === localSteps.length - 1) return;
    const copy = [...localSteps];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    const ordered = copy.map((s, i) => ({ ...s, order: i + 1 }));
    setLocalSteps(ordered);
    setHasUnsavedChanges(true);
  };

  const handleSavePipeline = async () => {
    const sanitizedSteps = localSteps.map((step, idx) => ({
      ...step,
      order: idx + 1,
      webhookConfig: step.type === "webhook" ? step.webhookConfig : undefined,
      taskConfig: step.type === "task" ? step.taskConfig : undefined,
      aiActionConfig: step.type === "ai_action" ? step.aiActionConfig : undefined,
    }));

    await saveStepsMutation.mutateAsync({
      id: sequence._id,
      steps: sanitizedSteps,
    });
    setHasUnsavedChanges(false);
  };

  const handleSaveSettings = async () => {
    if (!settingsName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a valid sequence name.",
        variant: "destructive",
      });
      return;
    }

    await updateSequenceMutation.mutateAsync({
      id: sequence._id,
      updates: {
        name: settingsName.trim(),
        description: settingsDescription.trim(),
        status: settingsStatus,
        settings: {
          ...sequence.settings,
          stopOnReply: settingsStopOnReply,
          stopOnMeetingBooked: settingsStopOnMeeting,
          stopOnClick: settingsStopOnClick,
          mailboxId: settingsMailboxId || null,
          sendOnDays: settingsSendDays,
          sendWindow: {
            enabled: settingsSendWindowEnabled,
            start: settingsSendWindowStart,
            end: settingsSendWindowEnd,
            timezone: settingsSendWindowTimezone,
          },
          maxDailyEnrollments: Number(settingsMaxDailyEnrollments) || 100,
          trackOpens: settingsTrackOpens,
          trackClicks: settingsTrackClicks,
        },
        enrollmentRules: {
          ...sequence.enrollmentRules,
          allowReenrollment: settingsAllowReenrollment,
        },
      },
    });
  };

  const handleResetSettings = () => {
    if (!sequence) return;
    setSettingsName(sequence.name || "");
    setSettingsDescription(sequence.description || "");
    setSettingsStatus(sequence.status || "draft");
    setSettingsStopOnReply(sequence.settings?.stopOnReply ?? true);
    setSettingsStopOnMeeting(sequence.settings?.stopOnMeetingBooked ?? true);
    setSettingsStopOnClick(sequence.settings?.stopOnClick ?? false);
    setSettingsMailboxId(
      typeof sequence.settings?.mailboxId === "object"
        ? sequence.settings?.mailboxId?._id
        : sequence.settings?.mailboxId || ""
    );
    setSettingsSendDays(sequence.settings?.sendOnDays || [1, 2, 3, 4, 5]);
    setSettingsSendWindowEnabled(sequence.settings?.sendWindow?.enabled ?? false);
    setSettingsSendWindowStart(sequence.settings?.sendWindow?.start || "09:00");
    setSettingsSendWindowEnd(sequence.settings?.sendWindow?.end || "17:00");
    setSettingsSendWindowTimezone(sequence.settings?.sendWindow?.timezone || "UTC");
    setSettingsMaxDailyEnrollments(sequence.settings?.maxDailyEnrollments ?? 100);
    setSettingsTrackOpens(sequence.settings?.trackOpens ?? true);
    setSettingsTrackClicks(sequence.settings?.trackClicks ?? true);
    setSettingsAllowReenrollment(sequence.enrollmentRules?.allowReenrollment ?? false);

    toast({
      title: "Settings Reverted",
      description: "Reverted configuration back to the last saved state.",
    });
  };

  const handleDeleteSequence = async () => {
    try {
      await deleteSequenceMutation.mutateAsync(sequence._id);
      setDeleteDialogOpen(false);
      navigate("/dashboard/sequences");
    } catch {
      // toast is already handled in mutation
    }
  };

  const handleDuplicateSequence = async () => {
    try {
      const cloned = await createSequenceMutation.mutateAsync({
        name: `${sequence.name} (Copy)`,
        description: sequence.description,
        status: "draft",
        settings: {
          ...sequence.settings,
          mailboxId: settingsMailboxId || null,
        },
        steps: localSteps.map((step, idx) => ({
          ...step,
          order: idx + 1,
        })),
      });

      if (cloned?._id) {
        navigate(`/dashboard/sequences/${cloned._id}`);
      }
    } catch {
      // toast is handled in mutation
    }
  };

  const handleToggleDay = (day: number) => {
    if (settingsSendDays.includes(day)) {
      setSettingsSendDays(settingsSendDays.filter((d) => d !== day));
    } else {
      setSettingsSendDays([...settingsSendDays, day].sort());
    }
  };

  return (
    <div className="space-y-6 text-white pb-12 -mt-4">
      <Seo
        title={`${sequence.name} — Sequence Workflow | ColdMailerAI`}
        description="Configure sequence steps, condition branches, and lead cadence enrollments."
      />

      {/* Sticky Top Header & Tabs Wrapper */}
      <div className="sticky top-14 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-6 bg-surface-950/95 backdrop-blur-md border-b border-white/10 pt-2 pb-0">
        {/* Top Navigation & Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-6 w-8 p-0 rounded-md border border-white/15 bg-surface-900 text-gray-300 hover:text-white hover:bg-white/5 shrink-0"
            >
              <Link to="/dashboard/sequences">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-semibold text-white tracking-tight truncate">
                  {sequence.name}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full mt-1 px-2.5 py-1 text-[10px] font-medium ring-1 ring-inset font-sans ${isActive
                    ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                    : "bg-amber-500/15 text-amber-300 ring-amber-500/30"
                    }`}
                >
                  {sequence.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {hasUnsavedChanges && (
              <Button
                type="button"
                onClick={handleSavePipeline}
                disabled={saveStepsMutation.isPending}
                className="h-8 px-3 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-500 shadow-none transition-colors flex items-center gap-1.5"
              >
                {saveStepsMutation.isPending ? "Saving..." : "Save Pipeline"}
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={handleToggleStatus}
              disabled={updateStatusMutation.isPending}
              className="h-8 px-3 text-xs font-medium rounded-md border border-white/15 bg-surface-900 text-white hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
            >
              {isActive ? (
                <>
                  <Pause className="h-3 w-3 text-amber-400" />
                  <span>Pause Sequence</span>
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 text-white" />
                  <span>Activate Sequence</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={() => setEnrollModalOpen(true)}
              className="h-8 px-3 text-xs font-medium rounded-md bg-brand text-white hover:bg-brand-400 shadow-none transition-colors flex items-center gap-1.5"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Enroll Leads</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => triggerRunMutation.mutate()}
              disabled={triggerRunMutation.isPending}
              title="Execute due sequence steps immediately"
              className="h-8 w-8 p-0 rounded-md border border-white/15 bg-surface-900 text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center shrink-0"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${triggerRunMutation.isPending ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* Tabs Switcher */}
        <div className="flex -mb-px gap-1 mt-2">
          <button
            type="button"
            onClick={() => setActiveTab("steps")}
            className={`flex items-center gap-2 pb-2 px-3.5 text-xs sm:text-[13px] font-medium border-b-2 transition-colors ${activeTab === "steps"
              ? "border-brand text-white"
              : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Cadence ({localSteps.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("leads")}
            className={`flex items-center gap-2 pb-2 px-3.5 text-xs sm:text-[13px] font-medium border-b-2 transition-colors ${activeTab === "leads"
              ? "border-brand text-white"
              : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Enrolled Leads ({enrollments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("queue")}
            className={`flex items-center gap-2 pb-2 px-3.5 text-xs sm:text-[13px] font-medium border-b-2 transition-colors ${activeTab === "queue"
              ? "border-brand text-white"
              : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>Outbox & Queue</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 pb-2 px-3.5 text-xs sm:text-[13px] font-medium border-b-2 transition-colors ${activeTab === "settings"
              ? "border-brand text-white"
              : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
          >
            <SettingsIcon className="h-3.5 w-3.5" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* TAB 1: WORKFLOW PIPELINE BUILDER */}
      {activeTab === "steps" && (
        <div className="space-y-6 pt-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-white">Execution Sequence Pipeline</h3>
              <p className="text-xs text-gray-400">
                Steps execute sequentially. Delays, conditions, and actions automatically guide each lead through the funnel.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleOpenAddStep}
              className="h-8 px-3 text-xs font-medium rounded-md bg-brand text-white hover:bg-brand-400 shadow-none transition-colors flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Step</span>
            </Button>
          </div>

          {localSteps.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/15 bg-surface-900 p-8 sm:p-9 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/5 text-gray-300">
                <Workflow className="h-5 w-5 text-brand-300" />
              </div>
              <h4 className="mt-3 text-base sm:text-md font-semibold text-white tracking-tight">No Steps Configured</h4>
              <p className="mx-auto mt-1 max-w-md text-xs sm:text-[13px] text-gray-400">
                Add your initial email or condition rule to begin this sequence.
              </p>
              <Button
                type="button"
                onClick={handleOpenAddStep}
                className="mt-4 h-9 px-3.5 text-xs sm:text-[13px] rounded-md bg-brand text-white hover:bg-brand-400 font-medium shadow-none transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add First Step
              </Button>
            </div>
          ) : (
            <div className="relative pl-4 sm:pl-8 space-y-4">
              {/* Vertical connector line */}
              <div className="absolute left-[7px] sm:left-[10px] top-0 bottom-0 w-px bg-white/15" />

              {localSteps.map((step, idx) => {
                const isFirst = idx === 0;

                return (
                  <div key={idx} className="relative">
                    {/* Visual Connector Label */}
                    {!isFirst && step.type !== "wait" && step.delay?.value > 0 && (
                      <div className="my-2.5 ml-2 sm:ml-0 flex items-center gap-1.5 text-[11px] text-gray-400 bg-surface-950 px-2.5 py-0.5 rounded-full border border-white/10 w-fit font-mono">
                        <Clock className="h-3 w-3 text-amber-400" />
                        <span>
                          {`Wait ${step.delay.value} ${step.delay.unit}`}
                        </span>
                        {step.type === "condition" && (
                          <span className="text-purple-400 ml-1">
                            • If no reply
                          </span>
                        )}
                      </div>
                    )}

                    <div className="ml-2 sm:ml-0">
                      <SequenceStepCard
                        step={step}
                        index={idx}
                        totalSteps={localSteps.length}
                        onEdit={handleEditStep}
                        onDelete={handleDeleteStep}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Bottom "Add Next Step" button */}
              <div className="pt-2 pl-2 sm:pl-0">
                <button
                  type="button"
                  onClick={handleOpenAddStep}
                  className="w-full py-2.5 rounded-lg border border-dashed border-white/15 hover:border-brand/40 bg-surface-900/40 hover:bg-white/5 text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2 text-xs font-medium"
                >
                  <Plus className="h-3.5 w-3.5 text-brand-300" />
                  <span>Add Step to Pipeline</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ENROLLED LEADS */}
      {activeTab === "leads" && (
        <div className="space-y-4 pt-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Enrolled Cadence Leads</h3>
              <p className="text-xs text-gray-400">
                Track each lead's current step, next scheduled send date, and execution history.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setEnrollModalOpen(true)}
              className="bg-brand text-white hover:bg-brand-400 text-xs font-semibold h-8"
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Enroll More Leads
            </Button>
          </div>

          {enrollmentsLoading ? (
            <div className="py-20 text-center text-xs text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin text-brand mx-auto mb-2" />
              Loading enrolled leads...
            </div>
          ) : enrollments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-surface-900/30 p-12 text-center">
              <Users className="h-10 w-10 text-gray-400 mx-auto mb-3 opacity-60" />
              <h4 className="text-base font-bold text-white mb-1">No Leads Enrolled Yet</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
                Enroll leads from your database or saved segments to launch this outreach cadence.
              </p>
              <Button
                type="button"
                onClick={() => setEnrollModalOpen(true)}
                className="bg-brand text-white hover:bg-brand-400 text-xs font-semibold"
              >
                Enroll Leads Now
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-surface-900/90 overflow-hidden shadow-lg">
              <div className="overflow-x-auto custom-scroll">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-surface-950 text-gray-400 text-[11px] uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Lead</th>
                      <th className="px-4 py-3 font-semibold">Current Step</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Next Run</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {enrollments.map((enr) => {
                      const isLeadActive = enr.status === "active";
                      const isReplied = enr.stopReason === "replied";
                      const isCompleted = enr.status === "completed";

                      const companyName =
                        typeof enr.leadId?.company === "object" && enr.leadId?.company?.name
                          ? enr.leadId.company.name
                          : typeof enr.leadId?.company === "string"
                            ? enr.leadId.company
                            : enr.leadSnapshot?.company || "Company";

                      return (
                        <tr key={enr._id} className="hover:bg-white/[0.02] transition">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-white">
                              {enr.leadId?.name || enr.leadSnapshot?.name || "Unnamed"}
                            </div>
                            <div className="text-gray-400 text-[11px] flex items-center gap-1.5">
                              <span>{companyName}</span>
                              <span>•</span>
                              <span className="font-mono">{enr.leadId?.email || enr.leadSnapshot?.email}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] bg-white/5 border border-white/10 text-white font-medium">
                              Step {enr.currentStepOrder}
                              {enr.currentStepId?.title && ` - ${enr.currentStepId.title}`}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${isReplied
                                ? "bg-purple-500/10 border-purple-500/20 text-purple-300"
                                : isCompleted
                                  ? "bg-blue-500/10 border-blue-500/20 text-blue-300"
                                  : isLeadActive
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                    : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                                }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${isLeadActive ? "bg-emerald-400 animate-pulse" : "bg-current"
                                  }`}
                              />
                              {isReplied ? "STOPPED: REPLIED" : enr.status}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-gray-400">
                            {enr.nextRunAt ? (
                              <span className="flex items-center gap-1 text-[11px]">
                                <Clock className="h-3 w-3 text-amber-400" />
                                {new Date(enr.nextRunAt).toLocaleDateString()} at{" "}
                                {new Date(enr.nextRunAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setHistoryEnrollment(enr);
                                  setHistoryDialogOpen(true);
                                }}
                                className="h-7 px-2 text-[11px] border-white/10 bg-white/5 text-gray-300 hover:text-white"
                              >
                                <History className="h-3 w-3 mr-1" />
                                History ({enr.stepHistory?.length || 0})
                              </Button>

                              {isLeadActive ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateEnrollmentMutation.mutate({
                                      sequenceId: sequence._id,
                                      enrollmentId: enr._id,
                                      status: "paused",
                                    })
                                  }
                                  title="Pause lead cadence"
                                  className="p-1 rounded text-gray-400 hover:text-amber-400 hover:bg-white/10"
                                >
                                  <Pause className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                enr.status === "paused" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateEnrollmentMutation.mutate({
                                        sequenceId: sequence._id,
                                        enrollmentId: enr._id,
                                        status: "active",
                                      })
                                    }
                                    title="Resume lead cadence"
                                    className="p-1 rounded text-gray-400 hover:text-emerald-400 hover:bg-white/10"
                                  >
                                    <Play className="h-3.5 w-3.5" />
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SETTINGS SECTION */}
      {activeTab === "settings" && (
        <div className="max-w-4xl space-y-5">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Sequence & Cadence Settings</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Manage general details, sending schedules, automation stop rules, and lifecycle controls.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleResetSettings}
                disabled={updateSequenceMutation.isPending}
                className="h-8 px-3 text-xs border-white/10 text-gray-900 hover:text-gray-950 flex items-center gap-1.5"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Discard Changes</span>
              </Button>
              <Button
                type="button"
                onClick={handleSaveSettings}
                disabled={updateSequenceMutation.isPending}
                className="h-8 px-4 text-xs font-semibold bg-brand text-white hover:bg-brand-400 shadow-none flex items-center gap-1.5"
              >
                {updateSequenceMutation.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3" />
                    <span>Save Settings</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* CARD 1: GENERAL SEQUENCE DETAILS */}
          <div className="rounded-xl border border-white/10 bg-surface-900/90 p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <h3 className="text-base font-semibold text-white">General Information</h3>
            </div>

            <div className="space-y-4">
              {/* Sequence Name */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Sequence Name <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[11px] text-gray-500">{settingsName.length}/100</span>
                </div>
                <Input
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  maxLength={100}
                  placeholder="e.g. Enterprise SaaS Decision Makers Outreach"
                  className="bg-surface-950 border-white/10 text-white text-xs h-9 rounded-lg"
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Campaign Description
                  </label>
                  <span className="text-[11px] text-gray-500">{settingsDescription.length}/500</span>
                </div>
                <Textarea
                  value={settingsDescription}
                  onChange={(e) => setSettingsDescription(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Summarize the outreach objective, target demographic, value proposition, or persona..."
                  className="bg-surface-950 border-white/10 text-white md:text-[13px] rounded-lg min-h-[64px]"
                />
              </div>

              {/* Lifecycle Status Selector */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Lifecycle Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "active", label: "Active", desc: "Executing & dispatching" },
                    { id: "paused", label: "Paused", desc: "Halts new sends" },
                    { id: "draft", label: "Draft", desc: "Editing in progress" },
                    { id: "archived", label: "Archived", desc: "Completed / inactive" },
                  ].map((s) => {
                    const selected = settingsStatus === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSettingsStatus(s.id as SequenceStatus)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all ${selected
                            ? "bg-brand/15 border-brand text-white shadow-sm"
                            : "bg-surface-950 border-white/5 text-gray-400 hover:border-white/15 hover:text-white"
                          }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold capitalize">{s.label}</span>
                          {selected && <CheckCircle2 className="h-3 w-3 text-brand" />}
                        </div>
                        <span className="text-[10px] text-gray-500 block leading-tight">{s.desc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: DELIVERY & SENDING SCHEDULE */}
          <div className="rounded-xl border border-white/10 bg-surface-900/90 p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <h3 className="text-base font-semibold text-white">Delivery & Sending Window</h3>
            </div>

            <div className="space-y-4">
              {/* Preferred Mailbox */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Default Outbound Mailbox
                </label>
                <Select
                  value={settingsMailboxId || "auto"}
                  onValueChange={(val) => setSettingsMailboxId(val === "auto" ? "" : val)}
                >
                  <SelectTrigger className="w-full bg-surface-950 border-white/10 text-xs text-white h-9 rounded-lg">
                    <SelectValue placeholder="Auto-select first available active mailbox" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-950 border-white/15 text-white">
                    <SelectItem value="auto" className="text-xs">
                      Auto-select first available active mailbox
                    </SelectItem>
                    {mailboxes.map((mb) => (
                      <SelectItem key={mb._id} value={mb._id} className="text-xs">
                        {mb.email} ({mb.provider.toUpperCase()} — Health: {mb.health?.score ?? 100}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-gray-500 mt-1">
                  Emails dispatched from this cadence will prioritize this mailbox configuration.
                </p>
              </div>

              {/* Sending Days */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Allowed Sending Days
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { day: 1, label: "Mon" },
                    { day: 2, label: "Tue" },
                    { day: 3, label: "Wed" },
                    { day: 4, label: "Thu" },
                    { day: 5, label: "Fri" },
                    { day: 6, label: "Sat" },
                    { day: 0, label: "Sun" },
                  ].map((item) => {
                    const selected = settingsSendDays.includes(item.day);
                    return (
                      <button
                        key={item.day}
                        type="button"
                        onClick={() => handleToggleDay(item.day)}
                        className={`h-8 w-12 rounded-lg text-xs font-semibold border transition-all ${selected
                            ? "bg-brand border-brand text-white shadow-sm"
                            : "bg-surface-950 border-white/10 text-gray-400 hover:text-white"
                          }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sending Window Toggle & Controls */}
              <div className="p-3.5 rounded-lg bg-surface-950 border border-white/5 space-y-3">
                <div
                  onClick={() => setSettingsSendWindowEnabled(!settingsSendWindowEnabled)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Enforce Daily Sending Time Window
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Restrict email dispatch to recipient business hours to maximize engagement.
                    </span>
                  </div>
                  <Checkbox
                    checked={settingsSendWindowEnabled}
                    onCheckedChange={(val) => setSettingsSendWindowEnabled(Boolean(val))}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {settingsSendWindowEnabled && (
                  <div className="pt-3 border-t border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-gray-400 block mb-1">
                        Start Time
                      </label>
                      <Input
                        type="time"
                        value={settingsSendWindowStart}
                        onChange={(e) => setSettingsSendWindowStart(e.target.value)}
                        className="bg-surface-900 border-white/10 text-xs text-white h-8 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-gray-400 block mb-1">
                        End Time
                      </label>
                      <Input
                        type="time"
                        value={settingsSendWindowEnd}
                        onChange={(e) => setSettingsSendWindowEnd(e.target.value)}
                        className="bg-surface-900 border-white/10 text-xs text-white h-8 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-gray-400 block mb-1">
                        Timezone
                      </label>
                      <Select
                        value={settingsSendWindowTimezone}
                        onValueChange={(val) => setSettingsSendWindowTimezone(val)}
                      >
                        <SelectTrigger className="w-full bg-surface-900 border-white/10 text-xs text-white h-8 rounded-md">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent className="bg-surface-950 border-white/15 text-white">
                          <SelectItem value="UTC" className="text-xs">UTC (Universal)</SelectItem>
                          <SelectItem value="America/New_York" className="text-xs">Eastern Time (US/Canada)</SelectItem>
                          <SelectItem value="America/Chicago" className="text-xs">Central Time (US/Canada)</SelectItem>
                          <SelectItem value="America/Los_Angeles" className="text-xs">Pacific Time (US/Canada)</SelectItem>
                          <SelectItem value="Europe/London" className="text-xs">London (GMT/BST)</SelectItem>
                          <SelectItem value="Europe/Paris" className="text-xs">Paris, Berlin (CET)</SelectItem>
                          <SelectItem value="Asia/Kolkata" className="text-xs">India (IST)</SelectItem>
                          <SelectItem value="Asia/Singapore" className="text-xs">Singapore (SGT)</SelectItem>
                          <SelectItem value="Asia/Tokyo" className="text-xs">Tokyo (JST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Daily Enrollment Limit & Tracking */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                    Max Daily Enrollments
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={2000}
                    value={settingsMaxDailyEnrollments}
                    onChange={(e) => setSettingsMaxDailyEnrollments(Number(e.target.value))}
                    className="bg-surface-950 border-white/10 text-xs text-white h-9 rounded-lg"
                  />
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    Paces new leads enrolled per day to protect domain reputation.
                  </span>
                </div>

                <div className="space-y-2 pt-2">
                  <div
                    onClick={() => setSettingsTrackOpens(!settingsTrackOpens)}
                    className="flex items-center justify-between p-2 rounded-lg bg-surface-950 border border-white/5 cursor-pointer hover:border-white/10"
                  >
                    <span className="text-xs text-gray-300">Track Email Opens (Pixel)</span>
                    <Checkbox
                      checked={settingsTrackOpens}
                      onCheckedChange={(val) => setSettingsTrackOpens(Boolean(val))}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div
                    onClick={() => setSettingsTrackClicks(!settingsTrackClicks)}
                    className="flex items-center justify-between p-2 rounded-lg bg-surface-950 border border-white/5 cursor-pointer hover:border-white/10"
                  >
                    <span className="text-xs text-gray-300">Track Link Clicks (Redirect)</span>
                    <Checkbox
                      checked={settingsTrackClicks}
                      onCheckedChange={(val) => setSettingsTrackClicks(Boolean(val))}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: AUTOMATION & STOP RULES */}
          <div className="rounded-xl border border-white/10 bg-surface-900/90 p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <h3 className="text-base font-semibold text-white">Automation & Stop Triggers</h3>
            </div>

            <div className="space-y-2.5">
              {/* Stop on reply */}
              <div
                onClick={() => setSettingsStopOnReply(!settingsStopOnReply)}
                className="flex items-center justify-between p-3 rounded-lg bg-surface-950 border border-white/5 cursor-pointer hover:border-white/15 transition-colors"
              >
                <div className="pr-4">
                  <span className="text-xs font-semibold text-white block">
                    Stop Sequence on Lead Reply
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Immediately halts remaining sequence follow-ups the moment an enrolled lead replies.
                  </span>
                </div>
                <Checkbox
                  checked={settingsStopOnReply}
                  onCheckedChange={(val) => setSettingsStopOnReply(Boolean(val))}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Stop on meeting */}
              <div
                onClick={() => setSettingsStopOnMeeting(!settingsStopOnMeeting)}
                className="flex items-center justify-between p-3 rounded-lg bg-surface-950 border border-white/5 cursor-pointer hover:border-white/15 transition-colors"
              >
                <div className="pr-4">
                  <span className="text-xs font-semibold text-white block">
                    Stop Sequence on Meeting Scheduled
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Stops subsequent cadence steps once a calendar meeting is booked or lead status changes to Meeting.
                  </span>
                </div>
                <Checkbox
                  checked={settingsStopOnMeeting}
                  onCheckedChange={(val) => setSettingsStopOnMeeting(Boolean(val))}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Stop on click */}
              <div
                onClick={() => setSettingsStopOnClick(!settingsStopOnClick)}
                className="flex items-center justify-between p-3 rounded-lg bg-surface-950 border border-white/5 cursor-pointer hover:border-white/15 transition-colors"
              >
                <div className="pr-4">
                  <span className="text-xs font-semibold text-white block">
                    Stop Sequence on Link Click
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Stops cadence if the prospect engages by clicking any link in an email.
                  </span>
                </div>
                <Checkbox
                  checked={settingsStopOnClick}
                  onCheckedChange={(val) => setSettingsStopOnClick(Boolean(val))}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Allow re-enrollment */}
              <div
                onClick={() => setSettingsAllowReenrollment(!settingsAllowReenrollment)}
                className="flex items-center justify-between p-3 rounded-lg bg-surface-950 border border-white/5 cursor-pointer hover:border-white/15 transition-colors"
              >
                <div className="pr-4">
                  <span className="text-xs font-semibold text-white block">
                    Allow Lead Re-enrollment
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Permits leads that previously completed this cadence to be enrolled again in the future.
                  </span>
                </div>
                <Checkbox
                  checked={settingsAllowReenrollment}
                  onCheckedChange={(val) => setSettingsAllowReenrollment(Boolean(val))}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          </div>

          {/* CARD 4: DANGER ZONE */}
          <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-2 border-b border-red-500/10 text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Danger Zone</h3>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-lg bg-surface-950/60 border border-red-500/10">
              <div>
                <span className="text-xs font-semibold text-white block">Duplicate Cadence</span>
                <span className="text-[11px] text-gray-400">
                  Create an exact clone of this sequence, including all {localSteps.length} pipeline steps and configuration.
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleDuplicateSequence}
                disabled={createSequenceMutation.isPending}
                className="border-white/10 text-xs text-gray-900 shrink-0 flex items-center gap-1.5"
              >
                {createSequenceMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>Clone Sequence</span>
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-lg bg-red-950/20 border border-red-500/20">
              <div>
                <span className="text-xs font-semibold text-red-300 block">Delete Sequence</span>
                <span className="text-[11px] text-gray-400">
                  Permanently delete this cadence, all pipeline steps, queued messages, and lead enrollments.
                </span>
              </div>
              <Button
                type="button"
                onClick={() => setDeleteDialogOpen(true)}
                className="bg-red-600/90 hover:bg-red-600 text-white text-xs font-semibold shrink-0 flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Sequence</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SENDING ENGINE OUTBOX & QUEUE */}
      {activeTab === "queue" && (
        <SequenceQueueTab sequenceId={sequence._id} />
      )}

      {/* Step Editor Modal */}
      <StepEditorModal
        open={stepModalOpen}
        onOpenChange={setStepModalOpen}
        step={editingStep}
        order={editingStep?.order || localSteps.length + 1}
        onSave={handleSaveStep}
      />

      {/* Enroll Leads Modal */}
      <EnrollLeadsModal
        open={enrollModalOpen}
        onOpenChange={setEnrollModalOpen}
        sequenceId={sequence._id}
        sequenceName={sequence.name}
        defaultMailboxId={
          typeof sequence.settings?.mailboxId === "object"
            ? sequence.settings?.mailboxId?._id
            : sequence.settings?.mailboxId
        }
        existingEnrollments={enrollments}
      />

      {/* History Timeline Dialog */}
      <StepHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        enrollment={historyEnrollment}
      />

      {/* Delete Sequence Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md bg-surface-950 border border-white/10 text-white p-6 shadow-2xl">
          <DialogHeader>
            <div className="h-10 w-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-bold text-white">
              Delete Sequence "{sequence.name}"?
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400 leading-relaxed pt-1">
              Are you sure you want to permanently delete this sequence? This will remove all{" "}
              <strong className="text-white font-medium">{localSteps.length} steps</strong>, cancel any{" "}
              <strong className="text-white font-medium">{enrollments.length} lead enrollments</strong>, and purge all queued outbox jobs.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-5 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteSequenceMutation.isPending}
              className="text-xs border-white/10 text-gray-300 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteSequence}
              disabled={deleteSequenceMutation.isPending}
              className="text-xs bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center gap-1.5"
            >
              {deleteSequenceMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Yes, Delete Sequence</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

