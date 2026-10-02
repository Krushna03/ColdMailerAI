import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../utils";
import { queryKeys } from "./queryKeys";
import { useToast } from "./use-toast";
import { Sequence, SequenceStep, SequenceEnrollment, SendJob, SendJobStats, EmailEvent } from "../types/sequence";

interface ListSequencesParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useSequences(params?: ListSequencesParams) {
  return useQuery<{
    sequences: Sequence[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>({
    queryKey: [...queryKeys.sequences, params],
    queryFn: async () => {
      const res = await api.get("/api/v1/sequences", { params });
      return res.data?.data || { sequences: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } };
    },
    staleTime: 15_000,
  });
}

export function useSequence(id?: string) {
  return useQuery<Sequence | null>({
    queryKey: queryKeys.sequence(id),
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get(`/api/v1/sequences/${id}`);
      return res.data?.data || null;
    },
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

function extractErrorMessage(err: any, fallback: string = "An error occurred"): string {
  const data = err?.response?.data;
  if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    const unique = Array.from(new Set(data.errors.filter(Boolean))) as string[];
    if (unique.length === 1) return unique[0];
    if (unique.length <= 4) {
      return unique.map((msg) => `• ${msg}`).join("\n");
    }
    return unique.slice(0, 3).map((msg) => `• ${msg}`).join("\n") + `\n• ...and ${unique.length - 3} more errors`;
  }
  if (data?.message) {
    return data.message;
  }
  return err?.message || fallback;
}

export function useCreateSequence() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: Partial<Sequence>) => {
      const res = await api.post("/api/v1/sequences", payload);
      return res.data?.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sequences });
      toast({
        title: "Sequence Created",
        description: `"${data.name}" has been created successfully.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error Creating Sequence",
        description: extractErrorMessage(err, "Failed to create sequence"),
        variant: "destructive",
      });
    },
  });
}

export function useUpdateSequence() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Sequence> }) => {
      const res = await api.put(`/api/v1/sequences/${id}`, updates);
      return res.data?.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sequences });
      queryClient.invalidateQueries({ queryKey: queryKeys.sequence(data._id) });
      toast({
        title: "Sequence Updated",
        description: `Changes to "${data.name}" saved successfully.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Update Failed",
        description: extractErrorMessage(err, "Failed to update sequence"),
        variant: "destructive",
      });
    },
  });
}

export function useUpdateSequenceStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(`/api/v1/sequences/${id}/status`, { status });
      return res.data?.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sequences });
      queryClient.invalidateQueries({ queryKey: queryKeys.sequence(vars.id) });
      toast({
        title: "Status Changed",
        description: `Sequence is now ${vars.status}.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Action Failed",
        description: extractErrorMessage(err, "Failed to update sequence status"),
        variant: "destructive",
      });
    },
  });
}

export function useDeleteSequence() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/v1/sequences/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sequences });
      toast({
        title: "Sequence Deleted",
        description: "The sequence and all associated steps have been removed.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Delete Failed",
        description: extractErrorMessage(err, "Failed to delete sequence"),
        variant: "destructive",
      });
    },
  });
}

export function useSaveSequenceSteps() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, steps }: { id: string; steps: SequenceStep[] }) => {
      const res = await api.put(`/api/v1/sequences/${id}/steps`, { steps });
      return res.data?.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sequence(vars.id) });
      toast({
        title: "Steps Saved",
        description: "Sequence workflow pipeline updated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Save Steps",
        description: extractErrorMessage(err, "Failed to save sequence steps"),
        variant: "destructive",
      });
    },
  });
}

export function useEnrollLeadsInSequence() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      sequenceId,
      leadIds,
      segmentId,
      mailboxId,
    }: {
      sequenceId: string;
      leadIds?: string[];
      segmentId?: string;
      mailboxId?: string | null;
    }) => {
      const res = await api.post(`/api/v1/sequences/${sequenceId}/enroll`, {
        leadIds,
        segmentId,
        mailboxId,
      });
      return res.data?.data;
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sequence(vars.sequenceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sequenceEnrollments(vars.sequenceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sequences });
      queryClient.invalidateQueries({ queryKey: queryKeys.leadsAll });
      toast({
        title: "Enrollment Complete",
        description: `Enrolled ${data.enrolledCount} lead(s). ${data.skippedCount ? `(${data.skippedCount} skipped)` : ""}`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Enrollment Failed",
        description: extractErrorMessage(err, "Failed to enroll leads"),
        variant: "destructive",
      });
    },
  });
}

export function useSequenceEnrollments(sequenceId?: string, params?: { status?: string; page?: number; limit?: number }) {
  return useQuery<{
    enrollments: SequenceEnrollment[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>({
    queryKey: [...queryKeys.sequenceEnrollments(sequenceId), params],
    queryFn: async () => {
      if (!sequenceId) return { enrollments: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } };
      const res = await api.get(`/api/v1/sequences/${sequenceId}/enrollments`, { params });
      return res.data?.data || { enrollments: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } };
    },
    enabled: Boolean(sequenceId),
    refetchInterval: 10_000, // Live poll progress
  });
}

export function useUpdateEnrollmentStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      sequenceId,
      enrollmentId,
      status,
      reason,
    }: {
      sequenceId: string;
      enrollmentId: string;
      status: string;
      reason?: string;
    }) => {
      const res = await api.patch(`/api/v1/sequences/${sequenceId}/enrollments/${enrollmentId}`, {
        status,
        reason,
      });
      return res.data?.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sequence(vars.sequenceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sequenceEnrollments(vars.sequenceId) });
      toast({
        title: "Enrollment Updated",
        description: `Lead status changed to ${vars.status}.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Update Enrollment",
        description: extractErrorMessage(err, "Failed to update enrollment status"),
        variant: "destructive",
      });
    },
  });
}

export function useTriggerSequenceRun() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/v1/sequences/process-now");
      return res.data?.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sequences });
      queryClient.invalidateQueries({ queryKey: ["sendJobs"] });
      queryClient.invalidateQueries({ queryKey: ["sendJobStats"] });
      toast({
        title: "Sequence Runner Executed",
        description: `Processed ${data.processedCount || 0} due step(s).`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Run Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    },
  });
}

export function useSendJobs(params?: {
  sequenceId?: string;
  enrollmentId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery<{
    jobs: SendJob[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>({
    queryKey: queryKeys.sendJobs(params),
    queryFn: async () => {
      const res = await api.get("/api/v1/sequences/send-jobs", { params });
      return res.data?.data || { jobs: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } };
    },
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

export function useSendJobStats(sequenceId?: string) {
  return useQuery<SendJobStats>({
    queryKey: queryKeys.sendJobStats(sequenceId),
    queryFn: async () => {
      const res = await api.get("/api/v1/sequences/send-jobs/stats", {
        params: sequenceId ? { sequenceId } : {},
      });
      return res.data?.data || {
        total: 0,
        queued: 0,
        scheduled: 0,
        sending: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        retry: 0,
        dead_letter: 0,
        bounced: 0,
        cancelled: 0,
      };
    },
    refetchInterval: 6_000,
  });
}

export function useRetrySendJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const res = await api.post(`/api/v1/sequences/send-jobs/${jobId}/retry`);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sendJobs"] });
      queryClient.invalidateQueries({ queryKey: ["sendJobStats"] });
      toast({
        title: "Job Re-queued",
        description: "The job has been reset to queued for immediate worker pickup.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Retry Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    },
  });
}

export function useEmailEvents(params?: {
  sequenceId?: string;
  leadId?: string;
  type?: string;
  limit?: number;
}) {
  return useQuery<EmailEvent[]>({
    queryKey: queryKeys.emailEvents(params),
    queryFn: async () => {
      const res = await api.get("/api/v1/sequences/email-events", { params });
      return res.data?.data?.events || [];
    },
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

