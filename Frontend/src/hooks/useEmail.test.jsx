import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useEmail,
  useGenerateEmail,
  useUpdateEmailIteration,
  useDeleteEmail,
} from "./useEmail";
import { api } from "../utils";

vi.mock("../utils", async (importActual) => {
  const actual = await importActual();
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

const createWrapper = (queryDefaults = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, ...queryDefaults },
      mutations: { retry: false },
    },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

beforeEach(() => vi.clearAllMocks());

describe("useEmail", () => {
  it("fetches an email by id", async () => {
    api.get.mockResolvedValue({
      data: { success: true, email: { _id: "1", prompt: "p", chatEmails: [] } },
    });

    const { result } = renderHook(() => useEmail("1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.get).toHaveBeenCalledWith("/api/v1/email/1");
    expect(result.current.data._id).toBe("1");
  });

  it("stays idle (no fetch) when id is missing", () => {
    const { result } = renderHook(() => useEmail(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
    expect(api.get).not.toHaveBeenCalled();
  });

  it("uses initialData without fetching (fresh within staleTime)", () => {
    const seed = { _id: "9", prompt: "seeded", chatEmails: [] };
    const { result } = renderHook(() => useEmail("9", { initialData: seed }), {
      wrapper: createWrapper({ staleTime: Infinity }),
    });
    expect(result.current.data).toEqual(seed);
    expect(api.get).not.toHaveBeenCalled();
  });
});

describe("useGenerateEmail", () => {
  it("posts the prompt and returns the generated email", async () => {
    api.post.mockResolvedValue({
      data: { success: true, fullEmail: "Generated", emailId: "42", usage: { used: 1 } },
    });

    const { result } = renderHook(() => useGenerateEmail(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ prompt: "hi", userId: "u1" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.post).toHaveBeenCalledWith(
      "/api/v1/email/generate-email",
      expect.any(FormData),
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    expect(result.current.data.emailId).toBe("42");
  });

  it("errors when the API reports failure", async () => {
    api.post.mockResolvedValue({ data: { success: false, error: "Limit reached" } });

    const { result } = renderHook(() => useGenerateEmail(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ prompt: "hi", userId: "u1" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toBe("Limit reached");
  });
});

describe("useUpdateEmailIteration", () => {
  it("patches an iteration for the given email", async () => {
    api.patch.mockResolvedValue({ data: { success: true, updatedEmail: "NEW BODY" } });

    const { result } = renderHook(() => useUpdateEmailIteration(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ emailId: "1", modification: "make it shorter" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.patch).toHaveBeenCalledWith(
      "/api/v1/email/update-email-history",
      expect.any(FormData),
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
  });
});

describe("useDeleteEmail", () => {
  it("deletes an email by id", async () => {
    api.delete.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useDeleteEmail(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate("1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.delete).toHaveBeenCalledWith("/api/v1/email/delete-email", {
      data: { emailId: "1" },
    });
  });
});
