import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Workflow,
  ArrowLeft,
  Play,
  Pause,
  Plus,
  Users,
  Settings,
  RefreshCw,
  Clock,
  AlertCircle,
  History,
  Layers,
  Loader2,
  Send,
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
} from "../hooks/useSequences";
import { useMailboxes } from "../hooks/useMailboxes";
import { SequenceStep, SequenceEnrollment } from "../types/sequence";
import SequenceStepCard from "../components/sequences/SequenceStepCard";
import StepEditorModal from "../components/sequences/StepEditorModal";
import EnrollLeadsModal from "../components/sequences/EnrollLeadsModal";
import StepHistoryDialog from "../components/sequences/StepHistoryDialog";
import { SequenceQueueTab } from "../components/sequences/SequenceQueueTab";
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

export default function SequenceDetail() {
  const { sequenceId } = useParams<{ sequenceId: string }>();
  const navigate = useNavigate();

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

  const [localSteps, setLocalSteps] = useState<SequenceStep[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Settings form state
  const [settingsStopOnReply, setSettingsStopOnReply] = useState(true);
  const [settingsStopOnMeeting, setSettingsStopOnMeeting] = useState(true);
  const [settingsMailboxId, setSettingsMailboxId] = useState("");
  const [settingsSendDays, setSettingsSendDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Sync loaded sequence
  React.useEffect(() => {
    if (sequence) {
      setLocalSteps(sequence.steps || []);
      setSettingsStopOnReply(sequence.settings?.stopOnReply ?? true);
      setSettingsStopOnMeeting(sequence.settings?.stopOnMeetingBooked ?? true);
      setSettingsMailboxId(
        typeof sequence.settings?.mailboxId === "object"
          ? sequence.settings?.mailboxId?._id
          : sequence.settings?.mailboxId || ""
      );
      setSettingsSendDays(sequence.settings?.sendOnDays || [1, 2, 3, 4, 5]);
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
    await updateSequenceMutation.mutateAsync({
      id: sequence._id,
      updates: {
        settings: {
          ...sequence.settings,
          stopOnReply: settingsStopOnReply,
          stopOnMeetingBooked: settingsStopOnMeeting,
          mailboxId: settingsMailboxId || null,
          sendOnDays: settingsSendDays,
        },
      },
    });
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
              className="h-8 w-8 p-0 rounded-md border border-white/15 bg-surface-900 text-gray-300 hover:text-white hover:bg-white/5 shrink-0"
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
                  className={`inline-flex items-center gap-1.5 rounded-full mt-1 px-2.5 py-0.5 text-[10px] font-medium ring-1 ring-inset font-sans ${isActive
                      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                      : "bg-amber-500/15 text-amber-300 ring-amber-500/30"
                    }`}
                >
                  {sequence.status.toUpperCase()}
                </span>
              </div>
              <p
                title={sequence.description?.trim() || undefined}
                className="text-xs text-gray-400 truncate mt-0.5 max-w-sm sm:max-w-md lg:max-w-xl"
              >
                {sequence.description?.trim()
                  ? sequence.description.trim().length > 70
                    ? `${sequence.description.trim().slice(0, 70).trim()}...`
                    : sequence.description.trim()
                  : "Multi-step automated sales sequence"}
              </p>
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
            <span>Workflow Steps ({localSteps.length})</span>
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
            <Settings className="h-3.5 w-3.5" />
            <span>Cadence Settings</span>
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

      {/* TAB 3: CADENCE SETTINGS */}
      {activeTab === "settings" && (
        <div className="max-w-2xl rounded-xl border border-white/10 bg-surface-900/90 p-6 space-y-6 shadow-lg">
          <div>
            <h3 className="text-base font-bold text-white mb-1">Cadence Enrollment & Stop Rules</h3>
            <p className="text-xs text-gray-400">
              Control reply stopping automation, sending windows, and preferred mailboxes.
            </p>
          </div>

          <div className="space-y-4">
            {/* Stop on reply */}
            <div
              onClick={() => setSettingsStopOnReply(!settingsStopOnReply)}
              className="flex items-center justify-between p-3.5 rounded-lg bg-surface-950 border border-white/5 cursor-pointer hover:border-white/10 transition-colors"
            >
              <div className="pr-4">
                <span className="text-sm font-semibold text-white block">
                  Stop Sequence on Lead Reply
                </span>
                <span className="text-xs text-gray-400">
                  Automatically stops future emails the moment an enrolled lead replies.
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
              className="flex items-center justify-between p-3.5 rounded-lg bg-surface-950 border border-white/5 cursor-pointer hover:border-white/10 transition-colors"
            >
              <div className="pr-4">
                <span className="text-sm font-semibold text-white block">
                  Stop Sequence on Meeting Scheduled
                </span>
                <span className="text-xs text-gray-400">
                  Halt remaining steps once a calendar meeting is booked or lead status changes to Meeting.
                </span>
              </div>
              <Checkbox
                checked={settingsStopOnMeeting}
                onCheckedChange={(val) => setSettingsStopOnMeeting(Boolean(val))}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Sender Mailbox */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                Default Sender Mailbox for this Cadence
              </label>
              <Select
                value={settingsMailboxId || "auto"}
                onValueChange={(val) => setSettingsMailboxId(val === "auto" ? "" : val)}
              >
                <SelectTrigger className="w-full bg-surface-950 border-white/10 text-xs text-white h-10 rounded-lg focus:ring-none focus-visible:ring-none">
                  <SelectValue placeholder="Auto-select first available active mailbox" />
                </SelectTrigger>
                <SelectContent className="bg-surface-950 border-white/15 text-white">
                  <SelectItem value="auto" className="text-xs">
                    Auto-select first available active mailbox
                  </SelectItem>
                  {mailboxes.map((mb) => (
                    <SelectItem key={mb._id} value={mb._id} className="text-xs">
                      {mb.email} ({mb.provider.toUpperCase()} — Health Score: {mb.health?.score ?? 100}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sending Days */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-2">
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
                      className={`h-8 w-12 rounded-lg text-xs font-semibold border transition ${selected
                          ? "bg-brand border-brand text-white"
                          : "bg-surface-950 border-white/10 text-gray-400 hover:text-white"
                        }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end">
            <Button
              type="button"
              onClick={handleSaveSettings}
              disabled={updateSequenceMutation.isPending}
              className="bg-brand text-white hover:bg-brand-400 text-xs font-semibold"
            >
              {updateSequenceMutation.isPending ? "Saving..." : "Save Cadence Settings"}
            </Button>
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
    </div>
  );
}
