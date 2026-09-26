import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../utils";
import { queryKeys } from "./queryKeys";
import { useToast } from "./use-toast";
import {
  Mailbox,
  ConnectSmtpPayload,
  UpdateMailboxPayload,
} from "../types/mailbox";

/**
 * Fetch all mailboxes for the current workspace.
 */
export function useMailboxes() {
  return useQuery<Mailbox[]>({
    queryKey: queryKeys.mailboxes,
    queryFn: async () => {
      const res = await api.get("/api/v1/mailboxes");
      return res.data?.mailboxes || [];
    },
    staleTime: 30_000,
  });
}

/**
 * Fetch a single mailbox by ID.
 */
export function useMailbox(id?: string) {
  return useQuery<Mailbox | null>({
    queryKey: queryKeys.mailbox(id),
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get(`/api/v1/mailboxes/${id}`);
      return res.data?.mailbox || null;
    },
    enabled: Boolean(id),
  });
}

/**
 * Connect a custom SMTP/IMAP mailbox.
 */
export function useConnectSmtpMailbox() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: ConnectSmtpPayload) => {
      const res = await api.post("/api/v1/mailboxes/smtp", payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mailboxes });
      toast({
        title: "Mailbox Connected",
        description: data.message || "Custom SMTP mailbox connected successfully.",
      });
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message || err.message || "Failed to connect SMTP mailbox";
      toast({
        title: "Connection Failed",
        description: msg,
        variant: "destructive",
      });
    },
  });
}

/**
 * Complete Google OAuth connection.
 */
export function useConnectGoogleMailbox() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      code,
      redirectUri,
      dailyLimit,
    }: {
      code: string;
      redirectUri?: string;
      dailyLimit?: number;
    }) => {
      const res = await api.post("/api/v1/mailboxes/oauth/google/callback", {
        code,
        redirectUri,
        dailyLimit,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mailboxes });
      toast({
        title: "Gmail Connected",
        description: data.message || "Gmail mailbox connected successfully.",
      });
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message || err.message || "Failed to connect Gmail mailbox";
      toast({
        title: "OAuth Failed",
        description: msg,
        variant: "destructive",
      });
    },
  });
}

/**
 * Complete Microsoft Outlook OAuth connection.
 */
export function useConnectMicrosoftMailbox() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      code,
      redirectUri,
      dailyLimit,
    }: {
      code: string;
      redirectUri?: string;
      dailyLimit?: number;
    }) => {
      const res = await api.post("/api/v1/mailboxes/oauth/microsoft/callback", {
        code,
        redirectUri,
        dailyLimit,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mailboxes });
      toast({
        title: "Outlook Connected",
        description:
          data.message || "Microsoft Outlook mailbox connected successfully.",
      });
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message || err.message || "Failed to connect Outlook mailbox";
      toast({
        title: "OAuth Failed",
        description: msg,
        variant: "destructive",
      });
    },
  });
}

/**
 * Update mailbox settings (daily limit, sender name, pause/active).
 */
export function useUpdateMailboxSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      mailboxId,
      ...payload
    }: UpdateMailboxPayload) => {
      const res = await api.patch(`/api/v1/mailboxes/${mailboxId}`, payload);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mailboxes });
      queryClient.invalidateQueries({ queryKey: queryKeys.mailbox(variables.mailboxId) });
      toast({
        title: "Settings Saved",
        description: "Mailbox settings updated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Update Failed",
        description: err.response?.data?.message || "Could not update mailbox settings.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Run health diagnostics & verify mailbox connection.
 */
export function useTestMailboxConnection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (mailboxId: string) => {
      const res = await api.post(`/api/v1/mailboxes/${mailboxId}/test`);
      return res.data;
    },
    onSuccess: (_data, mailboxId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mailboxes });
      queryClient.invalidateQueries({ queryKey: queryKeys.mailbox(mailboxId) });
      toast({
        title: "Connection Active",
        description: "Mailbox connection verified and health is 100% excellent.",
      });
    },
    onError: (err: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mailboxes });
      toast({
        title: "Connection Issue",
        description: err.response?.data?.message || "Mailbox connection test failed.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Disconnect / delete a mailbox.
 */
export function useDeleteMailbox() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (mailboxId: string) => {
      const res = await api.delete(`/api/v1/mailboxes/${mailboxId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mailboxes });
      toast({
        title: "Mailbox Disconnected",
        description: "Mailbox removed and credentials deleted.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Action Failed",
        description: err.response?.data?.message || "Could not disconnect mailbox.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Send an email directly through a connected mailbox.
 */
export function useSendGeneratedEmail() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      emailId,
      ...payload
    }: {
      emailId: string;
      mailboxId: string;
      to: string;
      subject: string;
      html?: string;
      text?: string;
      body?: string;
      leadId?: string | null;
    }) => {
      const res = await api.post(`/api/v1/email/${emailId}/send`, payload);
      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mailboxes });
      queryClient.invalidateQueries({ queryKey: queryKeys.email(variables.emailId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leadsAll });
      toast({
        title: "Email Sent Successfully",
        description:
          data.message || "Your cold email has been dispatched via connected mailbox.",
      });
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message || err.message || "Failed to dispatch email.";
      toast({
        title: "Dispatch Failed",
        description: msg,
        variant: "destructive",
      });
    },
  });
}
