import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchToken, isTokenExpired, ensureAuthenticated } from "./tokenValidation";

// Build a fake JWT whose payload carries the given `exp` (seconds since epoch).
const makeToken = (exp) => {
  const payload = btoa(JSON.stringify({ exp }));
  return `header.${payload}.signature`;
};

const nowSec = () => Math.floor(Date.now() / 1000);

describe("fetchToken", () => {
  beforeEach(() => localStorage.clear());

  it("returns the JSON-parsed token from localStorage", () => {
    localStorage.setItem("token", JSON.stringify("abc.def.ghi"));
    expect(fetchToken()).toBe("abc.def.ghi");
  });

  it("returns null when there is no token", () => {
    expect(fetchToken()).toBeNull();
  });
});

describe("isTokenExpired", () => {
  it("returns true when there is no token", () => {
    expect(isTokenExpired(null)).toBe(true);
    expect(isTokenExpired("")).toBe(true);
  });

  it("returns true for an expired token", () => {
    expect(isTokenExpired(makeToken(nowSec() - 100))).toBe(true);
  });

  it("returns false for a token that is still valid", () => {
    expect(isTokenExpired(makeToken(nowSec() + 3600))).toBe(false);
  });

  it("returns true for a malformed token", () => {
    expect(isTokenExpired("not-a-jwt")).toBe(true);
  });
});

describe("ensureAuthenticated", () => {
  it("returns true and does not log out for a valid token", () => {
    const logout = vi.fn();
    const ok = ensureAuthenticated(makeToken(nowSec() + 3600), logout);
    expect(ok).toBe(true);
    expect(logout).not.toHaveBeenCalled();
  });

  it("logs out with the missing message when token is absent", () => {
    const logout = vi.fn();
    const ok = ensureAuthenticated(null, logout);
    expect(ok).toBe(false);
    expect(logout).toHaveBeenCalledWith("No authentication token found.");
  });

  it("logs out with the expired message when token is expired", () => {
    const logout = vi.fn();
    const ok = ensureAuthenticated(makeToken(nowSec() - 10), logout);
    expect(ok).toBe(false);
    expect(logout).toHaveBeenCalledWith("Session expired. Please log in again.");
  });
});
