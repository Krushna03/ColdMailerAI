import { QueryClient } from "@tanstack/react-query";

// Do not retry client errors (esp. 401/403) so React Query cooperates with the
// axios response interceptor that already redirects on auth failures.
const shouldRetry = (failureCount: number, error: any): boolean => {
  const status = error?.response?.status;
  if (status >= 400 && status < 500) return false;
  return failureCount < 2;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60_000,
      retry: shouldRetry,
    },
    mutations: {
      retry: false,
    },
  },
});
