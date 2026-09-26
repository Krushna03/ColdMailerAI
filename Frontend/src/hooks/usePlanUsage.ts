import { useQuery } from "@tanstack/react-query";
import { api, getToken } from "../utils";
import { isTokenExpired } from "../helpers/tokenValidation";
import { queryKeys } from "./queryKeys";

export function usePlanUsage() {
  const token = getToken();
  const enabled = !!token && !isTokenExpired(token);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.planUsage,
    queryFn: async () => {
      const response = await api.get(`/api/v1/email/usage`);
      return response.data.success ? response.data.data : null;
    },
    enabled,
  });

  return { planUsage: data ?? null, usageLoading: enabled && isLoading };
}
