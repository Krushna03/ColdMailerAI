import { useQuery } from "@tanstack/react-query";
import { api } from "../utils";
import { queryKeys } from "./queryKeys";

export function useCommunityTemplates() {
  return useQuery({
    queryKey: queryKeys.communityTemplates,
    queryFn: async () => {
      const response = await api.get("/api/v1/community/templates");
      return response.data.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}
