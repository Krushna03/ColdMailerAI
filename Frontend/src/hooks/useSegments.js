import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../utils";
import { queryKeys } from "./queryKeys";

// GET /api/v1/segments — list all saved segments with live lead count
export function useSegments() {
  return useQuery({
    queryKey: queryKeys.segments,
    queryFn: async () => {
      const res = await api.get("/api/v1/segments");
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to load segments");
      }
      return res.data.segments ?? [];
    },
    staleTime: 30_000,
  });
}

// GET /api/v1/segments/:segmentId
export function useSegment(segmentId) {
  return useQuery({
    queryKey: queryKeys.segment(segmentId),
    queryFn: async () => {
      const res = await api.get(`/api/v1/segments/${segmentId}`);
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to load segment");
      }
      return res.data.segment;
    },
    enabled: Boolean(segmentId),
  });
}

// POST /api/v1/segments — create dynamic segment
export function useCreateSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await api.post("/api/v1/segments", data);
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to create segment");
      }
      return res.data.segment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.segments });
    },
  });
}

// PATCH /api/v1/segments/:segmentId — update segment
export function useUpdateSegment(segmentId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates) => {
      const res = await api.patch(`/api/v1/segments/${segmentId}`, updates);
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to update segment");
      }
      return res.data.segment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.segments });
      queryClient.invalidateQueries({ queryKey: queryKeys.segment(segmentId) });
    },
  });
}

// DELETE /api/v1/segments/:segmentId — delete segment
export function useDeleteSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (segmentId) => {
      const res = await api.delete(`/api/v1/segments/${segmentId}`);
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to delete segment");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.segments });
    },
  });
}

// POST /api/v1/segments/preview — preview count and sample leads
export function usePreviewSegment() {
  return useMutation({
    mutationFn: async ({ filters, limit = 5 }) => {
      const res = await api.post("/api/v1/segments/preview", { filters, limit });
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to preview segment");
      }
      return res.data;
    },
  });
}

// GET /api/v1/lead/tags — distinct tags
export function useWorkspaceTags() {
  return useQuery({
    queryKey: queryKeys.leadTags,
    queryFn: async () => {
      const res = await api.get("/api/v1/lead/tags");
      return res.data.tags ?? [];
    },
    staleTime: 60_000,
  });
}
