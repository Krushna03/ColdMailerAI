import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { api } from "../utils/api";
import { NotificationItem, NotificationListResponse } from "../types/notification";

export function useNotifications(params?: {
  unreadOnly?: boolean;
  type?: string;
  priority?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.notifications(params),
    queryFn: async (): Promise<NotificationListResponse> => {
      const { data } = await api.get("/api/v1/notifications", {
        params: {
          unread: params?.unreadOnly ? "true" : undefined,
          type: params?.type,
          priority: params?.priority,
          page: params?.page || 1,
          limit: params?.limit || 20,
        },
      });
      return data.data;
    },
    refetchInterval: 15000, // Poll every 15s for instant hot lead alerts
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: queryKeys.unreadNotificationCount,
    queryFn: async (): Promise<number> => {
      const { data } = await api.get("/api/v1/notifications/unread-count");
      return data.data?.unreadCount || 0;
    },
    refetchInterval: 15000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<NotificationItem> => {
      const { data } = await api.patch(`/api/v1/notifications/${id}/read`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotificationCount });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.patch("/api/v1/notifications/read-all");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotificationCount });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/api/v1/notifications/${id}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotificationCount });
    },
  });
}
