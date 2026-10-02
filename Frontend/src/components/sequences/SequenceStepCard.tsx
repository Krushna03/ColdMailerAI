import React from "react";
import {
  Mail,
  Clock,
  GitBranch,
  CheckSquare,
  Globe,
  Sparkles,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SequenceStep, StepType } from "../../types/sequence";
import { Button } from "../ui/button";

interface SequenceStepCardProps {
  step: SequenceStep;
  index: number;
  totalSteps: number;
  onEdit: (step: SequenceStep) => void;
  onDelete: (index: number) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
}

const STEP_TYPE_CONFIG: Record<
  StepType,
  { label: string; icon: React.ElementType; color: string; badgeBg: string; badgeBorder: string }
> = {
  email: {
    label: "EMAIL DISPATCH",
    icon: Mail,
    color: "text-blue-400",
    badgeBg: "bg-blue-500/10",
    badgeBorder: "border-blue-500/20",
  },
  wait: {
    label: "TIME DELAY",
    icon: Clock,
    color: "text-amber-400",
    badgeBg: "bg-amber-500/10",
    badgeBorder: "border-amber-500/20",
  },
  condition: {
    label: "LOGIC CONDITION",
    icon: GitBranch,
    color: "text-purple-400",
    badgeBg: "bg-purple-500/10",
    badgeBorder: "border-purple-500/20",
  },
  task: {
    label: "SALES TASK",
    icon: CheckSquare,
    color: "text-emerald-400",
    badgeBg: "bg-emerald-500/10",
    badgeBorder: "border-emerald-500/20",
  },
  webhook: {
    label: "EXTERNAL WEBHOOK",
    icon: Globe,
    color: "text-cyan-400",
    badgeBg: "bg-cyan-500/10",
    badgeBorder: "border-cyan-500/20",
  },
  ai_action: {
    label: "AI PERSONALIZATION",
    icon: Sparkles,
    color: "text-pink-400",
    badgeBg: "bg-pink-500/10",
    badgeBorder: "border-pink-500/20",
  },
};

export default function SequenceStepCard({
  step,
  index,
  totalSteps,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: SequenceStepCardProps) {
  const config = STEP_TYPE_CONFIG[step.type] || STEP_TYPE_CONFIG.email;
  const StepIcon = config.icon;

  const delayText =
    step.delay && step.delay.value > 0
      ? `Wait ${step.delay.value} ${step.delay.unit}`
      : "Immediately (Day 0)";

  return (
    <div className="relative group rounded-lg border border-white/10 bg-surface-900 hover:border-white/20 transition-colors p-4 sm:p-5">
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/5 border border-white/10 text-[11px] font-mono font-medium text-white">
            {step.order || index + 1}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[10px] font-medium font-sans border ${config.badgeBg} ${config.badgeBorder} ${config.color}`}
          >
            {config.label}
          </span>
          <span className="text-[11px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 font-mono">
            {delayText}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-0.5 text-gray-400">
          {onMoveUp && index > 0 && (
            <button
              type="button"
              onClick={() => onMoveUp(index)}
              title="Move Up"
              className="p-1 rounded-md hover:text-white hover:bg-white/5 transition-colors"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          )}
          {onMoveDown && index < totalSteps - 1 && (
            <button
              type="button"
              onClick={() => onMoveDown(index)}
              title="Move Down"
              className="p-1 rounded-md hover:text-white hover:bg-white/5 transition-colors"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(step)}
            title="Edit Step"
            className="p-1.5 rounded-md hover:text-white hover:bg-white/5 transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(index)}
            title="Delete Step"
            className="p-1.5 rounded-md hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm sm:text-[15px] font-semibold text-white mb-2">
        {step.title || `Step ${step.order}: ${config.label}`}
      </h4>

      {/* Body Content based on Step Type */}
      {step.type === "email" && (
        <div className="space-y-1.5 rounded-md bg-surface-950 p-3 border border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider font-mono">Subject:</span>
            <span className="text-xs font-medium text-gray-200 truncate">
              {step.template?.subject || "(No subject configured)"}
            </span>
          </div>
          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
            {step.template?.body || "(No email body template provided)"}
          </p>
          {step.template?.aiPrompt && (
            <div className="flex items-center gap-1.5 text-[11px] text-pink-300 bg-pink-500/10 px-2 py-0.5 rounded-md border border-pink-500/20 w-fit mt-1">
              <Sparkles className="h-3 w-3 shrink-0" />
              <span>AI Persona Generator Enabled</span>
            </div>
          )}
        </div>
      )}

      {step.type === "wait" && (
        <div className="rounded-lg bg-surface-950 p-3 border border-white/5 flex items-center gap-3">
          <Clock className="h-4 w-4 text-amber-400" />
          <span className="text-xs text-gray-300">
            Pauses workflow for <strong className="text-white">{step.delay?.value || 3} {step.delay?.unit || "days"}</strong> before proceeding to next action.
          </span>
        </div>
      )}

      {step.type === "condition" && (
        <div className="rounded-lg bg-surface-950 p-3.5 border border-white/5 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-purple-300 font-mono">
            <GitBranch className="h-3.5 w-3.5" />
            <span>
              If {step.conditions?.field === "replyReceived" ? "lead has not replied" : step.conditions?.field || "condition"}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Action if condition fails:{" "}
            <span className="text-purple-400 font-medium capitalize">
              {step.conditions?.actionOnFalse || "Stop Sequence"}
            </span>
          </p>
        </div>
      )}

      {step.type === "task" && (
        <div className="rounded-lg bg-surface-950 p-3.5 border border-white/5 space-y-1">
          <span className="text-xs font-medium text-emerald-300">
            {step.taskConfig?.title || "Manual Review Task"}
          </span>
          <p className="text-xs text-gray-400 line-clamp-1">
            {step.taskConfig?.description || "Review lead notes and prepare personalized research"}
          </p>
        </div>
      )}

      {step.type === "webhook" && (
        <div className="rounded-lg bg-surface-950 p-3.5 border border-white/5 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
              {step.webhookConfig?.method || "POST"}
            </span>
            <span className="text-xs font-mono text-gray-300 truncate">
              {step.webhookConfig?.url || "https://api.crm.com/v1/lead-webhook"}
            </span>
          </div>
        </div>
      )}

      {step.type === "ai_action" && (
        <div className="rounded-lg bg-surface-950 p-3.5 border border-white/5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-pink-300 font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Generative AI Deep Research & Lead Personalization</span>
          </div>
          <p className="text-xs text-gray-400 line-clamp-2">
            {step.aiActionConfig?.prompt || "Analyze lead industry and synthesize 3 value-add talking points"}
          </p>
        </div>
      )}

      {/* Step Stats Footer if available */}
      {step.stats && (step.stats.deliveredCount > 0 || step.stats.openedCount > 0) && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-4 text-xs text-gray-400">
          <div>
            Sent: <span className="text-white font-medium">{step.stats.deliveredCount}</span>
          </div>
          <div>
            Opened: <span className="text-white font-medium">{step.stats.openedCount}</span>
          </div>
          <div>
            Replied: <span className="text-emerald-400 font-medium">{step.stats.repliedCount}</span>
          </div>
        </div>
      )}
    </div>
  );
}
