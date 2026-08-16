import { useEffect } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../utils";
import { queryKeys } from "./queryKeys";

const BATCH_TIMEOUT_MS = 10 * 60 * 1000;

const invalidateLeadCaches = (queryClient, leadId) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.leadsAll });
  if (leadId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.lead(leadId) });
  }
};

// GET /api/v1/lead/get-user-leads — paginated leads list.
export function useLeads({ status, overdueOnly, categoryId, search } = {}) {
  return useInfiniteQuery({
    queryKey: [
      ...queryKeys.leadsAll,
      {
        status: status || null,
        overdueOnly: !!overdueOnly,
        categoryId: categoryId || null,
        search: search || null,
      },
    ],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await api.get(`/api/v1/lead/get-user-leads`, {
        params: {
          limit: 20,
          page: pageParam,
          ...(status ? { status } : {}),
          ...(overdueOnly ? { overdueOnly: true } : {}),
          ...(categoryId ? { categoryId } : {}),
          ...(search ? { search } : {}),
        },
      });
      return {
        leads: res.data.leads ?? [],
        total: res.data.total ?? 0,
        hasMore: res.data.hasMore ?? false,
        page: pageParam,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    staleTime: 60_000,
  });
}

// GET /api/v1/lead/categories
export function useLeadCategories() {
  return useQuery({
    queryKey: queryKeys.leadCategories,
    queryFn: async () => {
      const res = await api.get(`/api/v1/lead/categories`);
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to load categories");
      }
      return res.data.categories ?? [];
    },
    staleTime: 60_000,
  });
}

// POST /api/v1/lead/categories
export function useCreateLeadCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, description }) => {
      const res = await api.post(`/api/v1/lead/categories`, {
        name,
        description,
      });
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to create category");
      }
      return res.data.category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leadCategories });
    },
  });
}

// DELETE /api/v1/lead/categories/:categoryId
export function useDeleteLeadCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId) => {
      const res = await api.delete(`/api/v1/lead/categories/${categoryId}`);
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to delete category");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leadCategories });
      queryClient.invalidateQueries({ queryKey: queryKeys.leadsAll });
    },
  });
}

// GET /api/v1/lead/:leadId
export function useLead(leadId) {
  return useQuery({
    queryKey: queryKeys.lead(leadId),
    queryFn: async () => {
      const res = await api.get(`/api/v1/lead/${leadId}`);
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to load lead");
      }
      return res.data;
    },
    enabled: Boolean(leadId),
    staleTime: 30_000,
  });
}

// POST /api/v1/lead/create — create a single lead.
export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadData) => {
      const res = await api.post(`/api/v1/lead/create`, leadData);
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to create lead");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leadsAll });
    },
  });
}

// POST /api/v1/lead/bulk-create — create many leads at once.
export function useBulkCreateLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leads) => {
      const res = await api.post(`/api/v1/lead/bulk-create`, { leads });
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to import leads");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leadsAll });
    },
  });
}

// PATCH /api/v1/lead/:leadId
export function useUpdateLead(leadId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates) => {
      const id = updates?.leadId || leadId;
      if (!id) throw new Error("Lead ID is required");
      const { leadId: _ignored, ...payload } = updates;
      const res = await api.patch(`/api/v1/lead/${id}`, payload);
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to update lead");
      }
      return res.data;
    },
    onSuccess: (_data, variables) => {
      invalidateLeadCaches(queryClient, variables?.leadId || leadId);
    },
  });
}

// POST /api/v1/lead/:leadId/follow-ups
export function useAddFollowUp(leadId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dueAt, note }) => {
      const res = await api.post(`/api/v1/lead/${leadId}/follow-ups`, {
        dueAt,
        note,
      });
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to schedule follow-up");
      }
      return res.data;
    },
    onSuccess: () => {
      invalidateLeadCaches(queryClient, leadId);
    },
  });
}

// PATCH /api/v1/lead/:leadId/follow-ups/:followUpId
export function useUpdateFollowUp(leadId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ followUpId, ...updates }) => {
      const res = await api.patch(
        `/api/v1/lead/${leadId}/follow-ups/${followUpId}`,
        updates
      );
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to update follow-up");
      }
      return res.data;
    },
    onSuccess: () => {
      invalidateLeadCaches(queryClient, leadId);
    },
  });
}

// DELETE /api/v1/lead/:leadId/follow-ups/:followUpId
export function useDeleteFollowUp(leadId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (followUpId) => {
      const res = await api.delete(
        `/api/v1/lead/${leadId}/follow-ups/${followUpId}`
      );
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to delete follow-up");
      }
      return res.data;
    },
    onSuccess: () => {
      invalidateLeadCaches(queryClient, leadId);
    },
  });
}

// DELETE /api/v1/lead/delete-lead — remove a lead.
export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId) => {
      const res = await api.delete(`/api/v1/lead/delete-lead`, {
        data: { leadId },
      });
      return res.data;
    },
    onSuccess: (_data, leadId) => {
      invalidateLeadCaches(queryClient, leadId);
    },
  });
}

// DELETE /api/v1/lead/bulk-delete — remove many leads.
export function useBulkDeleteLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadIds) => {
      const res = await api.delete(`/api/v1/lead/bulk-delete`, {
        data: { leadIds },
      });
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to delete leads");
      }
      return res.data;
    },
    onSuccess: () => {
      invalidateLeadCaches(queryClient);
    },
  });
}

// PATCH /api/v1/email/:id/mark-sent
export function useMarkEmailSent(leadId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emailId) => {
      const res = await api.patch(`/api/v1/email/${emailId}/mark-sent`);
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to mark email as sent");
      }
      return res.data;
    },
    onSuccess: () => {
      invalidateLeadCaches(queryClient, leadId);
      queryClient.invalidateQueries({ queryKey: ["emailHistory"] });
    },
  });
}

// PATCH /api/v1/email/:id/unmark-sent
export function useUnmarkEmailSent(leadId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emailId) => {
      const res = await api.patch(`/api/v1/email/${emailId}/unmark-sent`);
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to unmark email");
      }
      return res.data;
    },
    onSuccess: () => {
      invalidateLeadCaches(queryClient, leadId);
      queryClient.invalidateQueries({ queryKey: ["emailHistory"] });
    },
  });
}

// POST /api/v1/email/batch-jobs — start a batch email generation job.
export function useGenerateBatchEmails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadIds, instructions, purpose, tone }) => {
      const res = await api.post(
        `/api/v1/email/batch-jobs`,
        { leadIds, instructions, purpose, tone }
      );
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to start batch generation");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batchJobs"] });
    },
  });
}

// GET /api/v1/email/batch-jobs/:jobId — track status of a batch generation job.
const TERMINAL_STATUSES = ["completed", "completed_with_errors", "failed", "cancelled"];

export function useBatchJobStatus(jobId) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["batchJob", jobId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/email/batch-jobs/${jobId}`);
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to fetch batch job status");
      }
      return res.data.job;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const job = query.state.data;
      if (!job) return 1000;
      if (TERMINAL_STATUSES.includes(job.status)) {
        return false;
      }
      return 1000;
    },
  });

  const status = query.data?.status;
  const leadIds = query.data?.leadIds;

  useEffect(() => {
    if (TERMINAL_STATUSES.includes(status)) {
      queryClient.invalidateQueries({ queryKey: ["emailHistory"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.leadsAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.planUsage });
      queryClient.invalidateQueries({ queryKey: ["batchJobs"] });
      leadIds?.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.lead(id) });
      });
    }
  }, [status, leadIds, queryClient]);

  return query;
}

export function useBatchJobs() {
  return useQuery({
    queryKey: ["batchJobs"],
    queryFn: async () => {
      const res = await api.get(`/api/v1/email/batch-jobs`);
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to fetch batch jobs");
      }
      return res.data.jobs ?? [];
    },
    staleTime: 30_000,
  });
}

