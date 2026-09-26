import { describe, it, expect, vi, afterEach } from "vitest";
import { parseEmail, createGmailComposeUrl, openGmailCompose } from "./emailHelpers";

describe("parseEmail", () => {
  it("extracts the subject and body from a Subject-prefixed email", () => {
    const { subject, body } = parseEmail("Subject: Quick hello\n\nHi there,\nThis is the body.");
    expect(subject).toBe("Quick hello");
    expect(body).toContain("Hi there,");
    expect(body).toContain("This is the body.");
  });

  it("returns empty fields for empty or invalid input", () => {
    expect(parseEmail("")).toEqual({ subject: "", body: "" });
    expect(parseEmail(undefined)).toEqual({ subject: "", body: "" });
    expect(parseEmail(42)).toEqual({ subject: "", body: "" });
  });

  it("treats content with no subject line as body only", () => {
    const { subject, body } = parseEmail("Just some plain text without a subject");
    expect(subject).toBe("");
    expect(body).toContain("plain text");
  });
});

describe("createGmailComposeUrl", () => {
  it("builds a compose URL with encoded params", () => {
    const url = createGmailComposeUrl({ to: "a@b.com", subject: "Hi & bye", body: "line one" });
    expect(url).toContain("https://mail.google.com/mail/?view=cm&fs=1");
    expect(url).toContain("to=a%40b.com");
    expect(url).toContain("su=Hi+%26+bye");
    expect(url).toContain("body=line+one");
  });
});

describe("openGmailCompose", () => {
  afterEach(() => vi.restoreAllMocks());

  it("opens the compose window directly when a user email is known", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation((() => null) as any);
    openGmailCompose({ to: "x@y.com", subject: "S", body: "B", userEmail: "me@x.com" });
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0][0]).toContain("mail.google.com");
  });

  it("routes through the Google login URL when no user email is present", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation((() => null) as any);
    openGmailCompose({ to: "x@y.com", subject: "S", body: "B" });
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0][0]).toContain("accounts.google.com/ServiceLogin");
  });
});
