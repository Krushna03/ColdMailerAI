import { describe, it, expect, beforeEach } from "vitest";
import {
  getToken,
  setToken,
  removeToken,
  getUserData,
  setUserData,
  removeUserData,
  clearAuthData,
} from "./localStorage";

describe("localStorage token helpers", () => {
  beforeEach(() => localStorage.clear());

  it("sets and reads a token (JSON round-trip)", () => {
    setToken("abc.def.ghi");
    expect(getToken()).toBe("abc.def.ghi");
    expect(localStorage.getItem("token")).toBe(JSON.stringify("abc.def.ghi"));
  });

  it("returns null when no token is stored", () => {
    expect(getToken()).toBeNull();
  });

  it("returns null when the stored token is malformed JSON", () => {
    localStorage.setItem("token", "{not-json");
    expect(getToken()).toBeNull();
  });

  it("removes the token", () => {
    setToken("t");
    removeToken();
    expect(getToken()).toBeNull();
  });
});

describe("localStorage user-data helpers", () => {
  beforeEach(() => localStorage.clear());

  it("sets and reads user data", () => {
    const user = { _id: "1", username: "krushna" };
    setUserData(user);
    expect(getUserData()).toEqual(user);
  });

  it("clearAuthData removes both token and user data", () => {
    setToken("t");
    setUserData({ _id: "1" });
    clearAuthData();
    expect(getToken()).toBeNull();
    expect(getUserData()).toBeNull();
  });

  it("removeUserData only removes user data", () => {
    setToken("t");
    setUserData({ _id: "1" });
    removeUserData();
    expect(getUserData()).toBeNull();
    expect(getToken()).toBe("t");
  });
});
