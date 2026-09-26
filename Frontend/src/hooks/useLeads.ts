import { useEffect } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  InfiniteData,
  QueryClient,
} from "@tanstack/react-query";
import { api } from "../utils";
import { queryKeys } from "./queryKeys";
import {
  Lead,
  LeadCategory,
  LeadFilterParams,
  ImportJobSummary,
  BatchJobSummary,
  FollowUp,
} from "../types/lead";

const invalidateLeadCaches = (queryClient: QueryClient, leadId?: string) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.leadsAll });
  if (leadId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.lead(leadId) });
  }
};

export interface LeadsPage {
  leads: Lead[];
  total: number;
  hasMore: boolean;
  page: number;
}

// GET /api/v1/lead/get-user-leads — paginated leads list.
export function useLeads({
  status,
  verificationStatus,
  overdueOnly,
  categoryId,
  search,
  tags,
  segmentId,
}: LeadFilterParams = {}) {
  return useInfiniteQuery<LeadsPage, Error, InfiniteData<LeadsPage, number>, any[], number>({
    queryKey: [
      ...queryKeys.leadsAll,
      {
        status: status || null,
        verificationStatus: verificationStatus || null,
        overdueOnly: !!overdueOnly,
        categoryId: categoryId || null,
        search: search || null,
        tags: tags || null,
        segmentId: segmentId || null,
      },
    ],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await api.get(`/api/v1/lead/get-user-leads`, {
        params: {
          limit: 20,
          page: pageParam,
          ...(status ? { status } : {}),
          ...(verificationStatus ? { verificationStatus } : {}),
          ...(overdueOnly ? { overdueOnly: true } : {}),
          ...(categoryId ? { categoryId } : {}),
          ...(search ? { search } : {}),
          ...(tags ? { tags } : {}),
          ...(segmentId ? { segmentId } : {}),
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
  return useQuery<LeadCategory[]>({
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

  return useMutation<LeadCategory, Error, { name: string; description?: string }>({
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

  return useMutation<any, Error, string>({
    mutationFn: async (categoryId: string) => {
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

export interface LeadDetailResponse {
  success: boolean;
  lead: Lead;
  followUps?: FollowUp[];
  activities?: any[];
  emails?: any[];
  [key: string]: any;
}

// GET /api/v1/lead/:leadId
export function useLead(leadId?: string) {
  return useQuery<LeadDetailResponse>({
    queryKey: queryKeys.lead(leadId || ""),
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

  return useMutation<any, Error, Partial<Lead>>({
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

  return useMutation<any, Error, Partial<Lead>[]>({
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
export function useUpdateLead(leadId?: string) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { leadId?: string; [key: string]: any }>({
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
export function useAddFollowUp(leadId: string) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { dueAt: string | Date; note?: string }>({
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
export function useUpdateFollowUp(leadId: string) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { followUpId: string; dueAt?: string | Date; note?: string; status?: string }>({
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
export function useDeleteFollowUp(leadId: string) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, string>({
    mutationFn: async (followUpId: string) => {
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

  return useMutation<any, Error, string>({
    mutationFn: async (leadId: string) => {
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

  return useMutation<any, Error, string[]>({
    mutationFn: async (leadIds: string[]) => {
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
export function useMarkEmailSent(leadId?: string) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, string>({
    mutationFn: async (emailId: string) => {
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
export function useUnmarkEmailSent(leadId?: string) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, string>({
    mutationFn: async (emailId: string) => {
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

  return useMutation<
    any,
    Error,
    { leadIds: string[]; instructions?: string; purpose?: string; tone?: string }
  >({
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

export function useBatchJobStatus(jobId?: string) {
  const queryClient = useQueryClient();
  const query = useQuery<BatchJobSummary | null>({
    queryKey: ["batchJob", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const res = await api.get(`/api/v1/email/batch-jobs/${jobId}`);
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to fetch batch job status");
      }
      return res.data.job;
    },
    enabled: Boolean(jobId),
    refetchInterval: (queryState) => {
      const job = queryState.state.data;
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
    if (status && TERMINAL_STATUSES.includes(status)) {
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

export interface BatchJobsPage {
  jobs: BatchJobSummary[];
  hasMore: boolean;
  page: number;
}

export function useBatchJobs() {
  return useInfiniteQuery<BatchJobsPage, Error, InfiniteData<BatchJobsPage, number>, string[], number>({
    queryKey: ["batchJobs"],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await api.get(`/api/v1/email/batch-jobs`, {
        params: { limit: 15, page: pageParam },
      });
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to fetch batch jobs");
      }
      return {
        jobs: res.data.jobs ?? [],
        hasMore: res.data.hasMore ?? false,
        page: pageParam,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    staleTime: 30_000,
  });
}

// DELETE /api/v1/email/batch-jobs/:jobId
export function useDeleteBatchJob() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, string>({
    mutationFn: async (jobId: string) => {
      const res = await api.delete(`/api/v1/email/batch-jobs/${jobId}`);
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to delete batch job");
      }
      return res.data;
    },
    onSuccess: (_data, jobId) => {
      queryClient.invalidateQueries({ queryKey: ["batchJobs"] });
      queryClient.invalidateQueries({ queryKey: ["batchJob", jobId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.leadsAll });
    },
  });
}

// POST /api/v1/lead/import-job — create async lead import with email verification
export function useCreateImportJob() {
  const queryClient = useQueryClient();
  return useMutation<
    any,
    Error,
    { leads: any[]; categoryId?: string | null; verifyEmails?: boolean }
  >({
    mutationFn: async ({ leads, categoryId, verifyEmails = true }) => {
      const res = await api.post("/api/v1/lead/import-job", {
        leads,
        categoryId,
        verifyEmails,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leadsAll });
    },
  });
}

// GET /api/v1/lead/import-jobs/:jobId — poll import job progress
export function useImportJobStatus(
  jobId?: string | null,
  { enabled = true, refetchInterval = 1500 } = {}
) {
  const queryClient = useQueryClient();
  return useQuery<ImportJobSummary | null>({
    queryKey: ["importJob", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const res = await api.get(`/api/v1/lead/import-jobs/${jobId}`);
      return res.data?.job || null;
    },
    enabled: Boolean(jobId) && enabled,
    refetchInterval: (queryState) => {
      const data = queryState?.state?.data;
      if (!data) return refetchInterval;
      if (
        ["completed", "completed_with_errors", "failed", "cancelled"].includes(
          data.status
        )
      ) {
        queryClient.invalidateQueries({ queryKey: queryKeys.leadsAll });
        return false;
      }
      return refetchInterval;
    },
  });
}

// POST /api/v1/lead/:leadId/verify-email — on-demand lead verification
export function useVerifyLeadEmail() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: async (leadId: string) => {
      const res = await api.post(`/api/v1/lead/${leadId}/verify-email`);
      return res.data;
    },
    onSuccess: (_data, leadId) => {
      invalidateLeadCaches(queryClient, leadId);
    },
  });
}
