import { describe, it, expect } from "vitest";
import { getErrorMessage } from "./errorHelpers";

describe("getErrorMessage", () => {
  it("prefers response.data.message", () => {
    const error = { response: { data: { message: "Bad request", error: "ignored" } } };
    expect(getErrorMessage(error)).toBe("Bad request");
  });

  it("falls back to response.data.error", () => {
    const error = { response: { data: { error: "Validation failed" } } };
    expect(getErrorMessage(error)).toBe("Validation failed");
  });

  it("falls back to the Error message", () => {
    expect(getErrorMessage(new Error("network down"))).toBe("network down");
  });

  it("uses the provided fallback when nothing else matches", () => {
    expect(getErrorMessage({}, "Custom fallback")).toBe("Custom fallback");
  });

  it("uses the default fallback when none is provided", () => {
    expect(getErrorMessage({})).toBe("Something went wrong");
  });
});
