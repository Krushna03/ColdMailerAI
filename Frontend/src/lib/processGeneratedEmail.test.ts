import { describe, it, expect } from "vitest";
import { processGeneratedEmail, formatBulletPoints } from "./processGeneratedEmail";

describe("processGeneratedEmail", () => {
  it("returns email, content and an isValid flag", () => {
    const raw = "Subject: Hi\n\nHello there, please reply.\n---\nTry personalizing the greeting.";
    const result = processGeneratedEmail(raw);
    expect(result).toHaveProperty("email");
    expect(result).toHaveProperty("content");
    expect(typeof result.isValid).toBe("boolean");
    expect(result.email).toContain("Subject: Hi");
    expect(result.content).toContain("personalizing");
  });
});

describe("formatBulletPoints", () => {
  it("converts asterisk bullets to bullet points", () => {
    expect(formatBulletPoints("* item one\n* item two")).toBe("• item one\n• item two");
  });

  it("returns falsy content unchanged", () => {
    expect(formatBulletPoints("")).toBe("");
    expect(formatBulletPoints(null)).toBeNull();
  });
});
