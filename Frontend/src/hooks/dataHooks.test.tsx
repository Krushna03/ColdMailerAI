import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePlanUsage } from "./usePlanUsage";
import { useUserCount } from "./useUser";
import { api } from "../utils";

vi.mock("../utils", async (importActual) => {
  const actual: any = await importActual();
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

const makeToken = (exp: number) => `header.${btoa(JSON.stringify({ exp }))}.sig`;
const validToken = () => makeToken(Math.floor(Date.now() / 1000) + 3600);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("usePlanUsage", () => {
  it("fetches plan usage when a valid token is present", async () => {
    localStorage.setItem("token", JSON.stringify(validToken()));
    (api.get as any).mockResolvedValue({ data: { success: true, data: { used: 3, limit: 10 } } });

    const { result } = renderHook(() => usePlanUsage(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.planUsage).toEqual({ used: 3, limit: 10 }));
    expect(api.get).toHaveBeenCalledWith("/api/v1/email/usage");
  });

  it("does not fetch when there is no token", () => {
    const { result } = renderHook(() => usePlanUsage(), { wrapper: createWrapper() });
    expect(result.current.planUsage).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });
});

describe("useUserCount", () => {
  it("returns the total user count", async () => {
    (api.get as any).mockResolvedValue({ data: { data: { totalUsers: 300 } } });

    const { result } = renderHook(() => useUserCount(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.get).toHaveBeenCalledWith("/api/v1/user/get-user-count");
    expect(result.current.data).toBe(300);
  });
});
