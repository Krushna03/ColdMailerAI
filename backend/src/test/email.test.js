import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the AI boundary so no real Gemini calls are made (this also avoids
// importing the gemini config, which instantiates the SDK at import time).
vi.mock("../services/ai.service.js", () => ({
  generateAIContent: vi.fn(),
  generateAIContentWithRole: vi.fn(),
}));

import request from "supertest";
import { app } from "../app.js";
import { registerUser } from "./helpers.js";
import { generateAIContent } from "../services/ai.service.js";

const AI_EMAIL = "Subject: Hi\n\nHello there, please reply.";

describe("email generation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires authentication (401 without a token)", async () => {
    const res = await request(app)
      .post("/api/v1/email/generate-email")
      .send({ prompt: "write a cold email" });
    expect(res.status).toBe(401);
  });

  it("rejects an empty prompt with 400", async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post("/api/v1/email/generate-email")
      .set("Authorization", `Bearer ${token}`)
      .send({ prompt: "" });
    expect(res.status).toBe(400);
  });

  it("generates an email for an authenticated user", async () => {
    generateAIContent.mockResolvedValue({ success: true, data: AI_EMAIL });
    const { token } = await registerUser({ email: "gen@example.com" });

    const res = await request(app)
      .post("/api/v1/email/generate-email")
      .set("Authorization", `Bearer ${token}`)
      .send({ prompt: "write a cold email to a recruiter" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fullEmail).toContain("Subject: Hi");
    expect(res.body.emailId).toBeTruthy();
    expect(res.body.usage).toBeTruthy();
    expect(generateAIContent).toHaveBeenCalledTimes(1);
  });

  it("surfaces an AI failure via the error handler", async () => {
    generateAIContent.mockResolvedValue({
      success: false,
      statusCode: 503,
      error: "The AI generation service is temporarily busy.",
    });
    const { token } = await registerUser({ email: "fail@example.com" });

    const res = await request(app)
      .post("/api/v1/email/generate-email")
      .set("Authorization", `Bearer ${token}`)
      .send({ prompt: "write a cold email" });

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
  });
});

describe("email history", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an empty history for a new user", async () => {
    const { token } = await registerUser({ email: "empty@example.com" });
    const res = await request(app)
      .get("/api/v1/email/get-user-email-history?limit=15&page=0")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.emails).toEqual([]);
  });

  it("lists a generated email in history", async () => {
    generateAIContent.mockResolvedValue({ success: true, data: AI_EMAIL });
    const { token } = await registerUser({ email: "hist@example.com" });
    await request(app)
      .post("/api/v1/email/generate-email")
      .set("Authorization", `Bearer ${token}`)
      .send({ prompt: "first email" });

    const res = await request(app)
      .get("/api/v1/email/get-user-email-history?limit=15&page=0")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.emails).toHaveLength(1);
    expect(res.body.emails[0].prompt).toBe("first email");
    expect(res.body.emails[0].generatedEmail).toBeUndefined();
    expect(res.body.emails[0].chatEmails).toBeUndefined();
    expect(res.body.emails[0]._id).toBeDefined();
  });

  it("deletes a generated email", async () => {
    generateAIContent.mockResolvedValue({ success: true, data: AI_EMAIL });
    const { token } = await registerUser({ email: "del@example.com" });
    const gen = await request(app)
      .post("/api/v1/email/generate-email")
      .set("Authorization", `Bearer ${token}`)
      .send({ prompt: "email to delete" });

    const res = await request(app)
      .delete("/api/v1/email/delete-email")
      .set("Authorization", `Bearer ${token}`)
      .send({ emailId: gen.body.emailId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 when deleting a non-existent email", async () => {
    const { token } = await registerUser({ email: "del404@example.com" });
    const res = await request(app)
      .delete("/api/v1/email/delete-email")
      .set("Authorization", `Bearer ${token}`)
      .send({ emailId: "64b7f0f0f0f0f0f0f0f0f0f0" });
    expect(res.status).toBe(404);
  });
});

describe("usage summary", () => {
  it("returns a usage summary for the current user", async () => {
    const { token } = await registerUser({ email: "usage@example.com" });
    const res = await request(app)
      .get("/api/v1/email/usage")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeTruthy();
  });
});
