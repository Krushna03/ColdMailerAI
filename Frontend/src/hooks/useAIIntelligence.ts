import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { api } from "../utils/api";

export interface AIContextData {
  lead: {
    name: string;
    email: string;
    jobTitle?: string;
    role?: string;
    location?: string;
    linkedinUrl?: string;
    timezone?: string;
    notes?: string;
    tags?: string[];
    customFields?: Record<string, any>;
    categoryName?: string;
  };
  company: {
    name: string;
    domain?: string;
    industry?: string;
    size?: string;
    revenue?: string;
    description?: string;
    techStack?: string;
    targetAudience?: string;
  };
  campaignObjective: {
    goal: string;
    callToAction?: string;
    valueProposition?: string;
    offer?: string;
  };
  tone: string;
  senderProfile: {
    name: string;
    title: string;
    company: string;
    valueProposition?: string;
    meetingLink?: string;
    bio?: string;
  };
  previousConversation?: {
    threadSummary?: string;
    lastInteractionType?: string;
    lastContactedAt?: string;
    history?: Array<{
      direction: "outbound" | "inbound";
      subject: string;
      snippet: string;
      date?: string;
      category?: string;
    }>;
  };
  sequenceContext?: {
    sequenceName: string;
    sequenceDescription?: string;
    currentStepOrder: number;
    totalSteps: number;
    stepType?: string;
    stepTitle?: string;
    daysSinceLastStep?: number;
    overallStrategy?: string;
  };
}

export interface GeneratedContextualResult {
  emailId?: string;
  subject: string;
  alternativeSubjects: string[];
  body: string;
  preheader: string;
  callToAction: string;
  personalizationInsights: string;
  suggestedDelayDays: number;
  contextSnapshot: AIContextData;
  usage?: any;
}

export function useLeadAIContext(
  leadId?: string | null,
  options?: { sequenceId?: string; stepOrder?: number; mailboxId?: string }
) {
  return useQuery({
    queryKey: queryKeys.aiContext(leadId || undefined),
    queryFn: async (): Promise<AIContextData> => {
      if (!leadId) throw new Error("No leadId provided");
      const { data } = await api.get(`/api/v1/email/ai-context/${leadId}`, {
        params: {
          sequenceId: options?.sequenceId,
          stepOrder: options?.stepOrder,
          mailboxId: options?.mailboxId,
        },
      });
      return data.data;
    },
    enabled: Boolean(leadId),
  });
}

export function useGenerateContextualEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      leadId?: string;
      customContext?: Partial<AIContextData>;
      overrideObjective?: any;
      overrideTone?: string;
      overrideSenderProfile?: any;
      sequenceId?: string;
      stepOrder?: number;
      customInstructions?: string;
    }): Promise<GeneratedContextualResult> => {
      const { data } = await api.post("/api/v1/email/ai-contextual-generate", payload);
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["emailHistory"] });
      queryClient.invalidateQueries({ queryKey: ["planUsage"] });
    },
  });
}

export function useBatchGenerateContextualEmails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      leadIds: string[];
      objective?: any;
      tone?: string;
      senderProfile?: any;
      sequenceId?: string;
      stepOrder?: number;
    }) => {
      const { data } = await api.post("/api/v1/email/ai-batch-contextual-generate", payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["emailHistory"] });
      queryClient.invalidateQueries({ queryKey: ["planUsage"] });
    },
  });
}
