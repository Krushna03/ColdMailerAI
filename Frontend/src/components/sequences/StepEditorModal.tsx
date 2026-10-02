import React, { useState, useEffect } from "react";
import {
  Mail,
  Clock,
  GitBranch,
  CheckSquare,
  Globe,
  Sparkles,
  HelpCircle,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { SequenceStep, StepType } from "../../types/sequence";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface StepEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: SequenceStep | null;
  order: number;
  onSave: (step: SequenceStep) => void;
}

const TEMPLATE_VARIABLES = [
  { label: "First Name", tag: "{{firstName|there}}" },
  { label: "Full Name", tag: "{{name}}" },
  { label: "Company", tag: "{{company}}" },
  { label: "Job Title", tag: "{{jobTitle}}" },
  { label: "Email", tag: "{{email}}" },
  { label: "Location", tag: "{{location}}" },
  { label: "Tech Stack", tag: "{{customFields.companyTech}}" },
  { label: "Funding", tag: "{{customFields.fundingStage}}" },
];

export default function StepEditorModal({
  open,
  onOpenChange,
  step,
  order,
  onSave,
}: StepEditorModalProps) {
  const [type, setType] = useState<StepType>("email");
  const [title, setTitle] = useState("");
  const [delayValue, setDelayValue] = useState<number>(order === 1 ? 0 : 3);
  const [delayUnit, setDelayUnit] = useState<"minutes" | "hours" | "days">("days");

  // Email template
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");

  // Condition
  const [conditionField, setConditionField] = useState<any>("replyReceived");
  const [conditionOperator, setConditionOperator] = useState<any>("is_false");
  const [actionOnFalse, setActionOnFalse] = useState<any>("stop");

  // Task
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");

  // Webhook
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookMethod, setWebhookMethod] = useState<"POST" | "GET">("POST");

  // AI Action
  const [aiActionType, setAiActionType] = useState<any>("generate_personalized_intro");
  const [aiActionPrompt, setAiActionPrompt] = useState("");

  useEffect(() => {
    if (step) {
      setType(step.type || "email");
      setTitle(step.title || "");
      setDelayValue(step.delay?.value ?? (order === 1 ? 0 : 3));
      setDelayUnit(step.delay?.unit || "days");
      setSubject(step.template?.subject || "");
      setBody(step.template?.body || "");
      setAiPrompt(step.template?.aiPrompt || "");
      setConditionField(step.conditions?.field || "replyReceived");
      setConditionOperator(step.conditions?.operator || "is_false");
      setActionOnFalse(step.conditions?.actionOnFalse || "stop");
      setTaskTitle(step.taskConfig?.title || "");
      setTaskDesc(step.taskConfig?.description || "");
      setWebhookUrl(step.webhookConfig?.url || "");
      setWebhookMethod(step.webhookConfig?.method || "POST");
      setAiActionType(step.aiActionConfig?.actionType || "generate_personalized_intro");
      setAiActionPrompt(step.aiActionConfig?.prompt || "");
    } else {
      setType("email");
      setTitle(`Step ${order}: Email Outreach`);
      setDelayValue(order === 1 ? 0 : 3);
      setDelayUnit("days");
      setSubject("Quick question regarding {{company}}");
      setBody("Hi {{firstName|there}},\n\nI came across {{company}} and was impressed by your recent growth.\n\nBest,\n[My Name]");
      setAiPrompt("");
      setConditionField("replyReceived");
      setConditionOperator("is_false");
      setActionOnFalse("stop");
      setTaskTitle("Manual Outreach Review");
      setTaskDesc("");
      setWebhookUrl("");
      setWebhookMethod("POST");
      setAiActionType("generate_personalized_intro");
      setAiActionPrompt("Generate 2 conversational sentences mentioning {{company}} and their industry.");
    }
  }, [step, order, open]);

  const insertVariable = (tag: string, target: "subject" | "body") => {
    if (target === "subject") {
      setSubject((prev) => `${prev} ${tag}`);
    } else {
      setBody((prev) => `${prev} ${tag}`);
    }
  };

  const handleSave = () => {
    const updated: SequenceStep = {
      ...(step || {}),
      order: step?.order || order,
      type,
      title: title.trim() || `Step ${order}: ${type.toUpperCase()}`,
      delay: {
        value: Number(delayValue) || 0,
        unit: delayUnit,
      },
      template: {
        subject: subject.trim(),
        body: body.trim(),
        aiPrompt: aiPrompt.trim(),
      },
      conditions: {
        field: conditionField,
        operator: conditionOperator,
        actionOnFalse,
      },
      taskConfig:
        type === "task"
          ? {
              title: taskTitle.trim(),
              description: taskDesc.trim(),
            }
          : undefined,
      webhookConfig:
        type === "webhook"
          ? {
              url: webhookUrl.trim(),
              method: webhookMethod,
            }
          : undefined,
      aiActionConfig:
        type === "ai_action"
          ? {
              actionType: aiActionType,
              prompt: aiActionPrompt.trim(),
            }
          : undefined,
    };

    onSave(updated);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-surface-950 border border-white/10 text-white max-h-[92vh] overflow-y-auto custom-scroll py-5">
        <DialogHeader>
          <DialogTitle className="text-md md:text-lg font-bold flex items-center gap-2">
            <span>{step ? `Edit Step #${step.order}` : `Configure Step #${order}`}</span>
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-xs">
            Customize cadence actions, wait delays, dynamic templates, or condition rules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Step Type Selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 block">
              Step Type
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { id: "email", label: "Email", icon: Mail, color: "text-white" },
                { id: "wait", label: "Wait Delay", icon: Clock, color: "text-white" },
                { id: "condition", label: "Condition", icon: GitBranch, color: "text-white" },
                { id: "task", label: "Task", icon: CheckSquare, color: "text-white" },
                { id: "webhook", label: "Webhook", icon: Globe, color: "text-white" },
                { id: "ai_action", label: "AI Action", icon: Sparkles, color: "text-white" },
              ].map((item) => {
                const Icon = item.icon;
                const active = type === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setType(item.id as StepType)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-center transition ${
                      active
                        ? "bg-brand/10 border-brand text-white shadow-md shadow-brand/10"
                        : "bg-surface-900 border-white/5 text-gray-400 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${item.color}`} />
                    <span className="text-[10px] md:text-[11px] font-medium leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title & Delay */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                Step Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Email #1: Value Proposition"
                className="bg-surface-900 border-white/10 text-white md:text-sm h-9"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                Execution Delay (Wait before running)
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  value={delayValue}
                  onChange={(e) => setDelayValue(Number(e.target.value))}
                  className="bg-surface-900 border-white/10 text-white w-24 h-9"
                />
                <Select
                  value={delayUnit}
                  onValueChange={(value) => setDelayUnit(value as any)}
                >
                  <SelectTrigger className="flex-1 bg-surface-900 border border-white/10 rounded-md px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-brand h-9">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-950 border-white/15 text-white">
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="minutes">Minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Conditional forms based on type */}
          {type === "email" && (
            <div className="space-y-3 rounded-xl bg-surface-900/60 p-4 border border-white/10">
              {/* Variable Chips */}
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-2">
                  Insert Variables:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => insertVariable(v.tag, "body")}
                      className="px-2 py-0.5 text-[10.5px] rounded-full bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/5 transition flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Email Subject
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject line with {{company}}..."
                  className="bg-surface-950 border-white/10 text-white font-medium md:text-[13px] h-9"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Email Body Template
                </label>
                <textarea
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Hi {{firstName|there}},&#10;&#10;Noticed what you're building at {{company}}..."
                  className="w-full bg-surface-950 border border-white/10 rounded-lg p-3 text-[13px] text-gray-200 focus:outline-none focus:border-brand custom-scroll leading-relaxed font-sans"
                />
              </div>

              <div>
                <label className="text-xs font-semibold flex items-center gap-1 mb-1.5">
                  Optional Dynamic AI Persona Instruction (Per-Lead Generator)
                </label>
                <Input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Write a personalized 2-sentence opening hook tailored to {{company}}'s market."
                  className="bg-surface-950 border-white/10 text-white text-[13px]"
                />
              </div>
            </div>
          )}

          {type === "condition" && (
            <div className="space-y-4 rounded-xl bg-surface-900/60 p-4 border border-purple-500/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                    Condition Check
                  </label>
                  <Select
                    value={conditionField}
                    onValueChange={(val) => setConditionField(val)}
                  >
                    <SelectTrigger className="w-full bg-surface-950 border-white/10 rounded-md text-xs sm:text-[13px] text-white h-9 focus:ring-brand">
                      <SelectValue placeholder="Select condition check" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-950 border-white/15 text-white">
                      <SelectItem value="replyReceived" className="text-xs sm:text-[13px]">Lead has replied to previous email</SelectItem>
                      <SelectItem value="emailOpened" className="text-xs sm:text-[13px]">Previous email was opened</SelectItem>
                      <SelectItem value="leadStatus" className="text-xs sm:text-[13px]">Lead Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                    Operator
                  </label>
                  <Select
                    value={conditionOperator}
                    onValueChange={(val) => setConditionOperator(val)}
                  >
                    <SelectTrigger className="w-full bg-surface-950 border-white/10 rounded-md text-xs sm:text-[13px] text-white h-9 focus:ring-brand">
                      <SelectValue placeholder="Select operator" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-950 border-white/15 text-white">
                      <SelectItem value="is_false" className="text-xs sm:text-[13px]">Is False (No reply received)</SelectItem>
                      <SelectItem value="is_true" className="text-xs sm:text-[13px]">Is True</SelectItem>
                      <SelectItem value="equals" className="text-xs sm:text-[13px]">Equals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  If Condition Fails:
                </label>
                <Select
                  value={actionOnFalse}
                  onValueChange={(val) => setActionOnFalse(val)}
                >
                  <SelectTrigger className="w-full bg-surface-950 border-white/10 rounded-md text-xs sm:text-[13px] text-white h-9 focus:ring-brand">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-950 border-white/15 text-white">
                    <SelectItem value="stop" className="text-xs sm:text-[13px]">Stop sequence immediately</SelectItem>
                    <SelectItem value="skip" className="text-xs sm:text-[13px]">Skip this step and proceed to next</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {type === "task" && (
            <div className="space-y-3 rounded-xl bg-surface-900/60 p-4 border border-emerald-500/20">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Task Title
                </label>
                <Input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Connect with {{firstName}} on LinkedIn"
                  className="bg-surface-950 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Description / Instructions
                </label>
                <textarea
                  rows={3}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Leave comments on recent post, mention our platform demo..."
                  className="w-full bg-surface-950 border border-white/10 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            </div>
          )}

          {type === "webhook" && (
            <div className="space-y-3 rounded-xl bg-surface-900/60 p-4 border border-cyan-500/20">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  HTTP Method & URL
                </label>
                <div className="flex gap-2">
                  <Select
                    value={webhookMethod}
                    onValueChange={(val) => setWebhookMethod(val as any)}
                  >
                    <SelectTrigger className="w-28 bg-surface-950 border-white/10 rounded-md text-xs sm:text-[13px] text-white h-8 focus:ring-brand">
                      <SelectValue placeholder="Method" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-950 border-white/15 text-white">
                      <SelectItem value="POST" className="text-xs sm:text-[13px]">POST</SelectItem>
                      <SelectItem value="GET" className="text-xs sm:text-[13px]">GET</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    className="flex-1 bg-surface-950 border-white/10 text-white h-9"
                  />
                </div>
              </div>
            </div>
          )}

          {type === "ai_action" && (
            <div className="space-y-3 rounded-xl bg-surface-900/60 p-4 border border-pink-500/20">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  AI Action Mode
                </label>
                <Select
                  value={aiActionType}
                  onValueChange={(val) => setAiActionType(val as any)}
                >
                  <SelectTrigger className="w-full bg-surface-950 border-white/10 rounded-md text-xs sm:text-[13px] text-white h-9 focus:ring-brand">
                    <SelectValue placeholder="Select AI mode" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-950 border-white/15 text-white">
                    <SelectItem value="generate_personalized_intro" className="text-xs sm:text-[13px]">Generate Hyper-Personalized Intro</SelectItem>
                    <SelectItem value="analyze_lead" className="text-xs sm:text-[13px]">Deep Lead Context Analysis</SelectItem>
                    <SelectItem value="custom_prompt" className="text-xs sm:text-[13px]">Custom Gemini Prompt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  AI Prompt
                </label>
                <textarea
                  rows={3}
                  value={aiActionPrompt}
                  onChange={(e) => setAiActionPrompt(e.target.value)}
                  placeholder="Review {{company}} and synthesize a custom value hook..."
                  className="w-full bg-surface-950 border border-white/10 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-brand text-white hover:bg-brand-400 font-semibold"
          >
            Save Step
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
