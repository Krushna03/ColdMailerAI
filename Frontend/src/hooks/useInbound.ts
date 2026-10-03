import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../utils";
import { useToast } from "./use-toast";
import { InboundEmail, InboundStats } from "../types/inbound";

export interface ListInboundParams {
  category?: string;
  leadId?: string;
  sequenceId?: string;
  mailboxId?: string;
  isRead?: boolean | string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useInboundEmails(params?: ListInboundParams) {
  return useQuery<{
    inboundEmails: InboundEmail[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>({
    queryKey: ["inboundEmails", params],
    queryFn: async () => {
      const res = await api.get("/api/v1/inbound", { params });
      return res.data?.data || { inboundEmails: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } };
    },
    staleTime: 15_000,
    refetchInterval: 30_000, // Background poll every 30s for fresh replies
  });
}

export function useInboundEmail(id?: string) {
  return useQuery<InboundEmail>({
    queryKey: ["inboundEmail", id],
    queryFn: async () => {
      if (!id) throw new Error("Inbound ID is required");
      const res = await api.get(`/api/v1/inbound/${id}`);
      return res.data?.data;
    },
    enabled: Boolean(id),
  });
}

export function useInboundStats() {
  return useQuery<InboundStats>({
    queryKey: ["inboundStats"],
    queryFn: async () => {
      const res = await api.get("/api/v1/inbound/stats");
      return (
        res.data?.data || {
          total: 0,
          unreadCount: 0,
          categories: {
            interested: 0,
            meeting_request: 0,
            objection: 0,
            out_of_office: 0,
            wrong_person: 0,
            not_interested: 0,
            unsubscribe: 0,
            neutral: 0,
            unknown: 0,
          },
          interestedTotal: 0,
        }
      );
    },
    staleTime: 15_000,
  });
}

export function useMarkInboundRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isRead }: { id: string; isRead: boolean }) => {
      const res = await api.patch(`/api/v1/inbound/${id}/read`, { isRead });
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inboundEmails"] });
      queryClient.invalidateQueries({ queryKey: ["inboundStats"] });
    },
  });
}

export function useReclassifyReply() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/v1/inbound/${id}/classify`);
      return res.data?.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inboundEmails"] });
      queryClient.invalidateQueries({ queryKey: ["inboundStats"] });
      toast({
        title: "Classification Updated",
        description: `Classified as ${data.classification?.category?.toUpperCase()} with AI.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Classification Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    },
  });
}

export function useSimulateReply() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: {
      leadId?: string;
      fromEmail?: string;
      fromName?: string;
      subject: string;
      bodyText: string;
    }) => {
      const res = await api.post("/api/v1/inbound/simulate", payload);
      return res.data?.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inboundEmails"] });
      queryClient.invalidateQueries({ queryKey: ["inboundStats"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["sequences"] });
      toast({
        title: "Reply Ingested & Processed",
        description: `Lead reply classified as ${data.classification?.category?.toUpperCase()}.${
          data.sequenceStopped ? " Sequence cadence was automatically paused." : ""
        }`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Simulation Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    },
  });
}

export function useSyncInboundReplies() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (mailboxId?: string | void) => {
      const url = mailboxId ? `/api/v1/inbound/sync/${mailboxId}` : "/api/v1/inbound/sync";
      const res = await api.post(url);
      return res.data?.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["inboundEmails"] });
      queryClient.invalidateQueries({ queryKey: ["inboundStats"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });

      if (data?.reauthRequired?.length > 0 || data?.requiresReauth) {
        toast({
          title: "Mailbox Reconnection Required",
          description:
            "Your connected Gmail account needs to be reconnected in Mailbox Settings to grant email read permission.",
          variant: "destructive",
        });
      } else {
        const found = data?.newRepliesCount ?? data?.newRepliesFound ?? 0;
        toast({
          title: "Mailbox Sync Completed",
          description:
            found > 0
              ? `Found and processed ${found} new lead reply(ies)!`
              : "Checked connected mailboxes. No new replies found.",
        });
      }
    },
    onError: (err: any) => {
      toast({
        title: "Sync Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    },
  });
}

