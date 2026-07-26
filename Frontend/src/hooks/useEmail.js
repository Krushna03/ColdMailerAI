import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../utils";
import { queryKeys } from "./queryKeys";

// GET /api/v1/email/:id — single email detail.
export function useEmail(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.email(id),
    queryFn: async () => {
      const res = await api.get(`/api/v1/email/${id}`);
      return res.data.email;
    },
    enabled: !!id,
    ...options,
  });
}

// GET /api/v1/email/get-user-email-history — paginated sidebar history.
export function useEmailHistory(userId) {
  return useInfiniteQuery({
    queryKey: queryKeys.emailHistory(userId),
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
    enabled: !!userId,
    staleTime: 60_000,
  });
}

// POST /api/v1/email/generate-email — create a new email.
export function useGenerateEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ prompt, userId }) => {
      const res = await api.post(`/api/v1/email/generate-email`, {
        prompt,
        userId,
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
    onError: (error) => {
      if (error?.response?.status === 403) {
        queryClient.invalidateQueries({ queryKey: queryKeys.planUsage });
      }
    },
  });
}

// PATCH /api/v1/email/update-email-history — add an iteration to an email.
export function useUpdateEmailIteration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ emailId, modification }) => {
      const res = await api.patch(`/api/v1/email/update-email-history`, {
        modification,
        emailId,
      });
      if (!res.data.success && !res.data.updatedEmail) {
        throw new Error(res.data.error || "Failed to update email");
      }
      return res.data;
    },
    onSuccess: (data, variables) => {
      // Keep cache warm for the detail view; 
      // invalidate so a refetch can reconcile from GET /api/v1/email/:id when needed.
      queryClient.setQueryData(queryKeys.email(variables.emailId), (prev) => {
        if (!prev) return prev;
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
      });
      queryClient.invalidateQueries({ queryKey: ["emailHistory"] });
    },
  });
}

// DELETE /api/v1/email/delete-email — remove an email from history.
export function useDeleteEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emailId) => {
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
