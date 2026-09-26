import { describe, it, expect } from "vitest";
import {
  extractEmailAndContent,
  sanitizeEmailResponse,
  validateExtraction,
} from "./extractEmail";

describe("extractEmailAndContent", () => {
  it("returns a graceful default for invalid input", () => {
    const result = extractEmailAndContent(null);
    expect(result.email).toMatch(/something went wrong/i);
    expect(result.content).toBeTruthy();
  });

  it("splits on the --- separator into email and content", () => {
    const raw = "Subject: Hi\n\nHello there, please reply.\n---\nAdditional suggestions here";
    const { email, content } = extractEmailAndContent(raw);
    expect(email).toContain("Subject: Hi");
    expect(email).toContain("Hello there");
    expect(email).not.toContain("Additional suggestions");
    expect(content).toBe("Additional suggestions here");
  });

  it("returns everything as email when no markers/structure exist", () => {
    const { email, content } = extractEmailAndContent("just a single blob of text");
    expect(email).toContain("just a single blob");
    expect(content).toBe("");
  });
});

describe("sanitizeEmailResponse", () => {
  it("strips introductory phrases", () => {
    const raw = "Here is your generated email:\nSubject: Hello\n\nBody text";
    const sanitized = sanitizeEmailResponse(raw);
    expect(sanitized).not.toContain("Here is your generated email:");
    expect(sanitized).toContain("Subject: Hello");
  });

  it("returns falsy input unchanged", () => {
    expect(sanitizeEmailResponse("")).toBe("");
    expect(sanitizeEmailResponse(null)).toBeNull();
  });
});

describe("validateExtraction", () => {
  it("marks an email valid when it has subject, greeting and a call to action", () => {
    const result = validateExtraction({
      email: "Subject: Hi\nHello there\nPlease reply soon\nRegards",
      content: "Here is a suggestion / tip",
    });
    expect(result.isValid).toBe(true);
    expect(result.hasMissingElements.subjectLine).toBe(false);
  });

  it("flags missing elements", () => {
    const result = validateExtraction({ email: "random text", content: "" });
    expect(result.isValid).toBe(false);
    expect(result.hasMissingElements.greeting).toBe(true);
    expect(result.hasMissingElements.callToAction).toBe(true);
  });
});
