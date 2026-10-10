import React, { useState, useEffect } from "react";
import {
  Sparkles,
  User,
  Building2,
  Target,
  Send,
  MessageSquare,
  Layers,
  Copy,
  Check,
  ChevronRight,
  Loader2,
  ArrowRight,
  Flame,
  Clock,
  Briefcase,
  HelpCircle,
  Wand2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useLeads } from "../../hooks/useLeads";
import {
  useLeadAIContext,
  useGenerateContextualEmail,
  GeneratedContextualResult,
} from "../../hooks/useAIIntelligence";
import { useMailboxes, useSendGeneratedEmail } from "../../hooks/useMailboxes";
import { useToast } from "../../hooks/use-toast";

interface ContextualAIGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLeadId?: string;
  onSelectGeneratedEmail?: (email: { subject: string; body: string }) => void;
}

const TONE_OPTIONS = [
  { value: "professional", label: "Professional & Authoritative" },
  { value: "conversational", label: "Conversational & Natural" },
  { value: "executive_direct", label: "Executive & Bold (Under 90 words)" },
  { value: "consultative", label: "Consultative & Advisory" },
  { value: "friendly_warm", label: "Warm & Friendly" },
  { value: "urgent", label: "Urgent & Time-Sensitive" },
];

const SEQUENCE_STEP_TYPES = [
  { value: "cold_outreach", label: "Step 1 — Initial Cold Outreach" },
  { value: "follow_up", label: "Step 2 — Gentle Bump & Reference" },
  { value: "value_add", label: "Step 3 — Case Study / Metric Proof" },
  { value: "breakup", label: "Step 4 — Clean Break-up / File Closing" },
];

export function ContextualAIGeneratorModal({
  open,
  onOpenChange,
  initialLeadId,
  onSelectGeneratedEmail,
}: ContextualAIGeneratorModalProps) {
  const { toast } = useToast();
  const [selectedLeadId, setSelectedLeadId] = useState<string>(initialLeadId || "");
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "result">("form");

  // Form State for 7 Pillars
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadRole, setLeadRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");
  const [campaignGoal, setCampaignGoal] = useState("Book a 15-minute product walkthrough");
  const [callToAction, setCallToAction] = useState("Are you free for 10 minutes next Tuesday?");
  const [tone, setTone] = useState("professional");
  const [senderName, setSenderName] = useState("Sales Specialist");
  const [senderCompany, setSenderCompany] = useState("ColdMailer AI");
  const [senderValueProp, setSenderValueProp] = useState("Increase email deliverability to 98% with automated warmup and mailbox rotation.");
  const [stepType, setStepType] = useState("cold_outreach");
  const [stepOrder, setStepOrder] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");

  const [generatedResult, setGeneratedResult] = useState<GeneratedContextualResult | null>(null);

  // Load Leads for selection
  const { data: leadsData } = useLeads({});
  const leads = leadsData?.pages?.flatMap((p: any) => p.leads) || [];

  // Fetch 7-pillar context from DB when lead is selected
  const { data: contextData, isFetching: isContextFetching } = useLeadAIContext(selectedLeadId, {
    stepOrder,
  });

  useEffect(() => {
    if (initialLeadId) {
      setSelectedLeadId(initialLeadId);
    }
  }, [initialLeadId]);

  // When context data loads, prefill the fields
  useEffect(() => {
    if (contextData) {
      if (contextData.lead) {
        setLeadName(contextData.lead.name || "");
        setLeadEmail(contextData.lead.email || "");
        setLeadRole(contextData.lead.jobTitle || contextData.lead.role || "");
      }
      if (contextData.company) {
        setCompanyName(contextData.company.name || "");
        setCompanyDomain(contextData.company.domain || "");
        setCompanyIndustry(contextData.company.industry || "");
      }
      if (contextData.senderProfile) {
        setSenderName(contextData.senderProfile.name || senderName);
        setSenderCompany(contextData.senderProfile.company || senderCompany);
        setSenderValueProp(contextData.senderProfile.valueProposition || senderValueProp);
      }
      if (contextData.campaignObjective) {
        setCampaignGoal(contextData.campaignObjective.goal || campaignGoal);
        setCallToAction(contextData.campaignObjective.callToAction || callToAction);
      }
      if (contextData.tone) {
        setTone(contextData.tone);
      }
    }
  }, [contextData]);

  const generateMutation = useGenerateContextualEmail();
  const { data: mailboxesData } = useMailboxes();
  const sendEmailMutation = useSendGeneratedEmail();
  const mailboxes = mailboxesData || [];
  const [selectedMailboxId, setSelectedMailboxId] = useState<string>("");

  const handleSendViaMailbox = async () => {
    if (!generatedResult?.emailId) {
      toast({
        title: "Draft Not Ready",
        description: "Please generate email before sending.",
        variant: "destructive",
      });
      return;
    }
    const targetMailboxId = selectedMailboxId || mailboxes[0]?._id;
    if (!targetMailboxId) {
      toast({
        title: "No Mailbox Selected",
        description: "Please connect and select an active mailbox in Mailboxes to send directly.",
        variant: "destructive",
      });
      return;
    }
    if (!leadEmail) {
      toast({
        title: "Missing Recipient Email",
        description: "Please specify the prospect's email address in Pillar 1.",
        variant: "destructive",
      });
      return;
    }

    try {
      await sendEmailMutation.mutateAsync({
        emailId: generatedResult.emailId,
        mailboxId: targetMailboxId,
        to: leadEmail,
        subject: generatedResult.subject,
        text: generatedResult.body,
        body: generatedResult.body,
        leadId: selectedLeadId || initialLeadId || undefined,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Dispatch Failed",
        description: err.response?.data?.message || err.message || "Failed to send email.",
        variant: "destructive",
      });
    }
  };

  const handleGenerate = async () => {
    if (!leadName || !companyName) {
      toast({
        title: "Missing Information",
        description: "Please specify at least the prospect's name and company.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload: any = {
        overrideObjective: {
          goal: campaignGoal,
          callToAction,
          valueProposition: senderValueProp,
        },
        overrideTone: tone,
        overrideSenderProfile: {
          name: senderName,
          company: senderCompany,
          valueProposition: senderValueProp,
        },
        stepOrder,
        customInstructions: specialInstructions,
      };

      if (selectedLeadId) {
        payload.leadId = selectedLeadId;
      } else {
        payload.customContext = {
          lead: {
            name: leadName,
            email: leadEmail,
            jobTitle: leadRole,
          },
          company: {
            name: companyName,
            domain: companyDomain,
            industry: companyIndustry,
          },
        };
      }

      const res = await generateMutation.mutateAsync(payload);
      setGeneratedResult(res);
      setActiveTab("result");
      toast({
        title: "Generated Successfully",
        description: "AI synthesized all 7 context pillars.",
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Generation Failed",
        description: err.message || "Failed to generate AI email.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string, type: "subject" | "body") => {
    navigator.clipboard.writeText(text);
    if (type === "subject") {
      setCopiedSubject(true);
      setTimeout(() => setCopiedSubject(false), 2000);
    } else {
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-surface-900 border border-white/10 text-white p-0 rounded-lg sm:rounded-xl shadow-xl">
        {/* Header */}
        <DialogHeader className="border-b border-white/10 px-6 py-4 bg-surface-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div>
                <DialogTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  7-Pillar AI Email Intelligence
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-400 mt-0.5">
                  Generates personalized cold outreach from Lead + Company + Objective + Tone + Sender + History + Sequence.
                </DialogDescription>
              </div>
            </div>

            {generatedResult && (
              <div className="flex items-center gap-1 bg-surface-950 p-1 rounded-md border border-white/10 text-xs">
                <button
                  onClick={() => setActiveTab("form")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    activeTab === "form" ? "bg-brand text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Context Input
                </button>
                <button
                  onClick={() => setActiveTab("result")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    activeTab === "result" ? "bg-brand text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Generated Copy
                </button>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 py-0 custom-scroll">
          {activeTab === "form" ? (
            <div className="space-y-6">
              {/* Pillar 1 & 2: Lead Data & Company */}
              <div className="rounded-lg border border-white/10 bg-surface-950 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">
                      Pillars 1 & 2: Lead & Company Information
                    </h3>
                  </div>

                  {leads.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Autofill from Lead:</span>
                      <Select
                        value={selectedLeadId}
                        onValueChange={(val) => setSelectedLeadId(val)}
                      >
                        <SelectTrigger className="h-8 w-48 bg-surface-900 border-white/15 text-xs text-white">
                          <SelectValue placeholder="Select prospect..." />
                        </SelectTrigger>
                        <SelectContent className="bg-surface-900 border-white/10 text-white max-h-56">
                          <SelectItem value="" className="text-xs">-- Manual Entry --</SelectItem>
                          {leads.map((l: any) => {
                            const companyName = (typeof l.company === "object" ? l.company?.name : l.company)?.toString().trim();
                            return (
                              <SelectItem key={l._id} value={l._id} className="text-xs">
                                {l.name}{companyName ? ` (${companyName})` : ""}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {isContextFetching && (
                  <div className="flex items-center gap-2 text-xs text-brand-400 py-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Hydrating context history & sequence data from database...</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Lead Name *</label>
                    <Input
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="h-9 bg-surface-900 border-white/10 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Lead Role / Title</label>
                    <Input
                      value={leadRole}
                      onChange={(e) => setLeadRole(e.target.value)}
                      placeholder="e.g. VP of Sales"
                      className="h-9 bg-surface-900 border-white/10 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Lead Email</label>
                    <Input
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      placeholder="e.g. jane@acmecorp.com"
                      className="h-9 bg-surface-900 border-white/10 text-white text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Company Name *</label>
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="h-9 bg-surface-900 border-white/10 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Company Domain</label>
                    <Input
                      value={companyDomain}
                      onChange={(e) => setCompanyDomain(e.target.value)}
                      placeholder="e.g. acmecorp.com"
                      className="h-9 bg-surface-900 border-white/10 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Industry</label>
                    <Input
                      value={companyIndustry}
                      onChange={(e) => setCompanyIndustry(e.target.value)}
                      placeholder="e.g. B2B SaaS"
                      className="h-9 bg-surface-900 border-white/10 text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Pillar 3 & 4: Campaign Objective & Tone */}
              <div className="rounded-lg border border-white/10 bg-surface-950 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">
                    Pillars 3 & 4: Campaign Objective & Tone
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Campaign Objective / Goal *
                    </label>
                    <Input
                      value={campaignGoal}
                      onChange={(e) => setCampaignGoal(e.target.value)}
                      placeholder="e.g. Schedule a 15-minute discovery call"
                      className="h-9 bg-surface-900 border-white/15 text-white text-xs rounded-md focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Call-to-Action (Single Ask)
                    </label>
                    <Input
                      value={callToAction}
                      onChange={(e) => setCallToAction(e.target.value)}
                      placeholder="e.g. Would you be open to a 10-minute chat this Thursday?"
                      className="h-9 bg-surface-900 border-white/15 text-white text-xs rounded-md focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Email Tone</label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="h-9 bg-surface-900 border-white/15 text-xs text-white rounded-md">
                      <SelectValue placeholder="Select tone..." />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-900 border-white/15 text-white">
                      {TONE_OPTIONS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pillar 5: Sender Profile */}
              <div className="rounded-lg border border-white/10 bg-surface-950 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">
                    Pillar 5: Sender Profile
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Sender Name</label>
                    <Input
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="h-9 bg-surface-900 border-white/15 text-white text-xs rounded-md focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Sender Company</label>
                    <Input
                      value={senderCompany}
                      onChange={(e) => setSenderCompany(e.target.value)}
                      className="h-9 bg-surface-900 border-white/15 text-white text-xs rounded-md focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Value Proposition / Pitch
                  </label>
                  <Input
                    value={senderValueProp}
                    onChange={(e) => setSenderValueProp(e.target.value)}
                    placeholder="What unique value do you deliver?"
                    className="h-9 bg-surface-900 border-white/15 text-white text-xs rounded-md focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/20"
                  />
                </div>
              </div>

              {/* Pillar 6 & 7: Conversation History & Sequence Cadence */}
              <div className="rounded-lg border border-white/10 bg-surface-950 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">
                    Pillars 6 & 7: Conversation History & Sequence Cadence
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Sequence Cadence Step</label>
                    <Select
                      value={stepType}
                      onValueChange={(val) => {
                        setStepType(val);
                        if (val === "cold_outreach") setStepOrder(1);
                        else if (val === "follow_up") setStepOrder(2);
                        else if (val === "value_add") setStepOrder(3);
                        else if (val === "breakup") setStepOrder(4);
                      }}
                    >
                      <SelectTrigger className="h-9 bg-surface-900 border-white/15 text-xs text-white rounded-md">
                        <SelectValue placeholder="Select sequence stage..." />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-900 border-white/15 text-white">
                        {SEQUENCE_STEP_TYPES.map((st) => (
                          <SelectItem key={st.value} value={st.value}>
                            {st.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Custom Instructions (Optional)
                    </label>
                    <Input
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="e.g. Reference their recent funding or product launch"
                      className="h-9 bg-surface-900 border-white/15 text-white text-xs rounded-md focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/20"
                    />
                  </div>
                </div>

                {/* Previous Conversation Pill */}
                {contextData?.previousConversation?.history &&
                  contextData.previousConversation.history.length > 0 && (
                    <div className="rounded-md bg-surface-900 p-3 border border-white/10 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 text-gray-300 font-medium">
                        <Clock className="h-3.5 w-3.5 text-brand" />
                        <span>Prior Touchpoints Detected ({contextData.previousConversation.history.length})</span>
                      </div>
                      <div className="space-y-1">
                        {contextData.previousConversation.history.slice(-2).map((msg, i) => (
                          <div key={i} className="text-gray-400 text-[11px] truncate">
                            <span className="text-gray-400 font-mono">[{msg.direction.toUpperCase()}]:</span>{" "}
                            "{msg.snippet}"
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          ) : (
            /* Results View */
            generatedResult && (
              <div className="space-y-4">
                {/* Insights Banner */}
                <div className="rounded-lg border border-brand/30 bg-brand/10 p-4 flex items-start gap-3 text-xs text-brand-300">
                  <Sparkles className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block mb-0.5">
                      AI 7-Pillar Synthesis:
                    </span>
                    <span className="text-gray-300">{generatedResult.personalizationInsights}</span>
                  </div>
                </div>

                {/* Subject Line & A/B Variants */}
                <div className="rounded-lg border border-white/10 bg-surface-950 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Subject Line (Primary)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(generatedResult.subject, "subject")}
                      className="h-7 text-xs text-gray-400 hover:text-white hover:bg-white/5"
                    >
                      {copiedSubject ? (
                        <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 mr-1" />
                      )}
                      {copiedSubject ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <div className="rounded-md bg-surface-900 border border-white/10 p-2.5 text-sm font-medium text-white">
                    {generatedResult.subject}
                  </div>

                  {generatedResult.alternativeSubjects &&
                    generatedResult.alternativeSubjects.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-medium text-gray-400">
                          A/B Alternative Subject Line Variants:
                        </span>
                        {generatedResult.alternativeSubjects.map((sub, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-md bg-surface-900 border border-white/5 px-3 py-1.5 text-xs text-gray-300"
                          >
                            <span>{sub}</span>
                            <button
                              onClick={() => copyToClipboard(sub, "subject")}
                              className="text-gray-400 hover:text-white text-[10px] ml-2 font-mono"
                            >
                              Copy
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                {/* Preheader Preview */}
                {generatedResult.preheader && (
                  <div className="rounded-lg border border-white/10 bg-surface-950 px-4 py-2.5 flex items-center justify-between text-xs">
                    <span className="text-gray-400">Inbox Preheader:</span>
                    <span className="text-gray-300 font-mono truncate max-w-[420px]">
                      {generatedResult.preheader}
                    </span>
                  </div>
                )}

                {/* Email Body */}
                <div className="rounded-lg border border-white/10 bg-surface-950 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Generated Email Body
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(generatedResult.body, "body")}
                      className="h-7 text-xs text-gray-400 hover:text-white hover:bg-white/5"
                    >
                      {copiedBody ? (
                        <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 mr-1" />
                      )}
                      {copiedBody ? "Copied" : "Copy Body"}
                    </Button>
                  </div>
                  <div className="rounded-md bg-surface-900 border border-white/10 p-4 text-sm text-white whitespace-pre-wrap leading-relaxed font-sans">
                    {generatedResult.body}
                  </div>
                </div>

                {/* Direct Mailbox Dispatch Strip */}
                <div className="rounded-lg border border-brand/30 bg-surface-950 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-md bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
                        <Send className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Direct Mailbox Dispatch</h4>
                        <p className="text-[11px] text-gray-400">
                          Send this AI outreach to <strong className="text-white">{leadEmail || "prospect"}</strong> via connected mailbox.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {mailboxes.length > 0 ? (
                        <Select
                          value={selectedMailboxId || mailboxes[0]?._id}
                          onValueChange={setSelectedMailboxId}
                        >
                          <SelectTrigger className="h-8 w-44 bg-surface-900 border-white/15 text-xs text-white rounded-md">
                            <SelectValue placeholder="Select mailbox..." />
                          </SelectTrigger>
                          <SelectContent className="bg-surface-900 border-white/15 text-white max-h-56">
                            {mailboxes.map((mb: any) => (
                              <SelectItem key={mb._id} value={mb._id} className="text-xs">
                                {mb.email} ({mb.provider.toUpperCase()})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-[11px] text-amber-400">No mailbox connected</span>
                      )}

                      <Button
                        type="button"
                        onClick={handleSendViaMailbox}
                        disabled={sendEmailMutation.isPending || mailboxes.length === 0 || !leadEmail}
                        className="h-8 bg-brand text-white hover:bg-brand-400 text-xs font-semibold px-3 shadow-none rounded-md gap-1.5"
                      >
                        {sendEmailMutation.isPending ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Dispatching...
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            Send via Mailbox
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Call To Action & Delay Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400 px-1">
                  <div className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-brand" />
                    <span>Single CTA: <strong className="text-white">{generatedResult.callToAction}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Suggested Next Cadence Delay: <strong className="text-white font-mono">{generatedResult.suggestedDelayDays} days</strong></span>
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-white/10 px-6 py-3.5 bg-surface-950/80 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs text-gray-400 hover:text-white h-9 px-3 border"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            {activeTab === "result" && onSelectGeneratedEmail && generatedResult && (
              <Button
                variant="outline"
                onClick={() => {
                  onSelectGeneratedEmail({
                    subject: generatedResult.subject,
                    body: generatedResult.body,
                  });
                  onOpenChange(false);
                }}
                className="h-9 border border-white/15 bg-surface-900 text-white hover:bg-white/5 text-xs rounded-md"
              >
                Use in Editor
              </Button>
            )}

            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="h-9 bg-brand hover:bg-brand-400 text-white text-xs font-semibold rounded-md px-4 shadow-none"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Synthesizing 7 Pillars...
                </>
              ) : (
                <>
                  {activeTab === "result" ? "Regenerate" : "Generate"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ContextualAIGeneratorModal;
