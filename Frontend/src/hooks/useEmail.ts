import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  InfiniteData,
} from "@tanstack/react-query";
import { api } from "../utils";
import { queryKeys } from "./queryKeys";
import { EmailRecord, EmailHistoryItem, PlanUsageSummary } from "../types/email";

export interface EmailHistoryPage {
  emails: EmailHistoryItem[];
  hasMore: boolean;
  page: number;
}

export interface GenerateEmailResult {
  success: boolean;
  fullEmail: string;
  emailId: string;
  usage?: PlanUsageSummary;
  error?: string;
}

export interface UpdateEmailIterationResult {
  success: boolean;
  updatedEmail: string;
  error?: string;
}

// GET /api/v1/email/:id — single email detail.
export function useEmail(id?: string, options: Record<string, any> = {}) {
  return useQuery<EmailRecord>({
    queryKey: queryKeys.email(id || ""),
    queryFn: async () => {
      const res = await api.get(`/api/v1/email/${id}`);
      return res.data.email;
    },
    enabled: Boolean(id),
    ...options,
  });
}

// GET /api/v1/email/get-user-email-history — paginated sidebar history.
export function useEmailHistory(userId?: string) {
  return useInfiniteQuery<
    EmailHistoryPage,
    Error,
    InfiniteData<EmailHistoryPage, number>,
    any,
    number
  >({
    queryKey: queryKeys.emailHistory(userId || ""),
    queryFn: async ({ pageParam = 0 }) => {
      const res = await api.get(`/api/v1/email/get-user-email-history`, {
        params: { userID: userId, limit: 15, page: pageParam },
      });
      return {
        emails: res.data.emails ?? [],
        hasMore: res.data.hasMore ?? false,
        page: pageParam,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

// POST /api/v1/email/generate-email — create a new email.
export function useGenerateEmail() {
  const queryClient = useQueryClient();

  return useMutation<
    GenerateEmailResult,
    any,
    { prompt: string; userId?: string; images?: any[] }
  >({
    mutationKey: ["generateEmail"],
    mutationFn: async ({ prompt, userId, images = [] }) => {
      const formData = new FormData();
      formData.append("prompt", prompt);
      if (userId) formData.append("userId", userId);

      if (images) {
        const imageArray = Array.isArray(images) ? images : [images];
        imageArray.forEach((img) => {
          formData.append("image", img);
        });
      }

      const res = await api.post(`/api/v1/email/generate-email`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      if (!res.data.success) {
        throw new Error(res.data.error || "Failed to generate email");
      }
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.usage) {
        queryClient.setQueryData(queryKeys.planUsage, data.usage);
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.planUsage });
      }
      queryClient.invalidateQueries({ queryKey: ["emailHistory"] });
    },
    onError: (error: any) => {
      if (error?.response?.status === 403) {
        queryClient.invalidateQueries({ queryKey: queryKeys.planUsage });
      }
    },
  });
}

// PATCH /api/v1/email/update-email-history — add an iteration to an email.
export function useUpdateEmailIteration() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateEmailIterationResult,
    any,
    { emailId: string; modification: string; images?: any[] }
  >({
    mutationKey: ["updateEmail"],
    mutationFn: async ({ emailId, modification, images = [] }) => {
      const formData = new FormData();
      formData.append("modification", modification);
      formData.append("emailId", emailId);

      if (images) {
        const imageArray = Array.isArray(images) ? images : [images];
        imageArray.forEach((img) => {
          formData.append("image", img);
        });
      }

      const res = await api.patch(
        `/api/v1/email/update-email-history`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      if (!res.data.success && !res.data.updatedEmail) {
        throw new Error(res.data.error || "Failed to update email");
      }
      return res.data;
    },
    onSuccess: (data, variables) => {
      // Keep cache warm for the detail view;
      // invalidate so a refetch can reconcile from GET /api/v1/email/:id when needed.
      queryClient.setQueryData<EmailRecord>(
        queryKeys.email(variables.emailId),
        (prev) => {
          if (!prev) return prev as any;
          return {
            ...prev,
            chatEmails: [
              ...(prev.chatEmails || []),
              {
                prompt: variables.modification,
                generatedEmail: data.updatedEmail,
                createdAt: new Date().toISOString(),
              },
            ],
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: ["emailHistory"] });
    },
  });
}

// DELETE /api/v1/email/delete-email — remove an email from history.
export function useDeleteEmail() {
  const queryClient = useQueryClient();

  return useMutation<any, any, string>({
    mutationFn: async (emailId: string) => {
      const res = await api.delete(`/api/v1/email/delete-email`, {
        data: { emailId },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailHistory"] });
    },
  });
}
