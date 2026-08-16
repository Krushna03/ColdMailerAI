import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/ai.service.js", () => ({
  generateAIContent: vi.fn(),
  generateAIContentWithRole: vi.fn(),
}));

import request from "supertest";
import { app } from "../app.js";
import { registerUser } from "./helpers.js";
import { generateAIContent } from "../services/ai.service.js";
import { Email } from "../models/Email.model.js";
import { FollowUp } from "../models/FollowUp.model.js";

const getDefaultCategoryId = async (token) => {
  const res = await request(app)
    .get("/api/v1/lead/categories")
    .set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.categories.length).toBeGreaterThanOrEqual(3);
  return res.body.categories[0]._id;
};

const createLead = async (token, overrides = {}) => {
  const categoryId =
    overrides.categoryId || (await getDefaultCategoryId(token));

  const res = await request(app)
    .post("/api/v1/lead/create")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Jane Smith",
      company: "Acme",
      role: "Head of Growth",
      email: "jane@acme.com",
      notes: "Met at meetup",
      categoryId,
      ...overrides,
      categoryId: overrides.categoryId || categoryId,
    });
  return res;
};

describe("lead workspace", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists default categories and creates a custom one", async () => {
    const { token } = await registerUser({ email: "leadcat@example.com" });
    const list = await request(app)
      .get("/api/v1/lead/categories")
      .set("Authorization", `Bearer ${token}`);

    expect(list.status).toBe(200);
    expect(list.body.categories.some((c) => c.slug === "job-outreach")).toBe(true);
    expect(list.body.categories.some((c) => c.slug === "client-sales")).toBe(true);
    expect(
      list.body.categories.some((c) => c.slug === "agency-partnerships")
    ).toBe(true);

    const created = await request(app)
      .post("/api/v1/lead/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Investor Outreach", description: "Raise capital" });

    expect(created.status).toBe(201);
    expect(created.body.category.isDefault).toBe(false);
    expect(created.body.category.name).toBe("Investor Outreach");
  });

  it("creates a lead with default pipeline fields", async () => {
    const { token } = await registerUser({ email: "leadcreate@example.com" });
    const res = await createLead(token);

    expect(res.status).toBe(201);
    expect(res.body.lead.name).toBe("Jane Smith");
    expect(res.body.lead.status).toBe("new");
    expect(res.body.lead.categoryId).toBeTruthy();
    expect(res.body.lead.emailsGeneratedCount).toBe(0);
    expect(res.body.lead.emailsSentCount).toBe(0);
  });

  it("returns lead detail with emails and stats", async () => {
    const { token, res: userRes } = await registerUser({
      email: "leaddetail@example.com",
    });
    const userId = userRes.body.data.user._id;
    const created = await createLead(token);
    const leadId = created.body.lead._id;

    await Email.create({
      prompt: "batch",
      generatedEmail: "Hello Jane",
      userId,
      leadId,
      sendStatus: "generated",
    });

    const res = await request(app)
      .get(`/api/v1/lead/${leadId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.lead._id).toBe(leadId);
    expect(res.body.emails).toHaveLength(1);
    expect(res.body.stats.emailsGenerated).toBeGreaterThanOrEqual(1);
  });

  it("updates lead profile and valid status transition", async () => {
    const { token } = await registerUser({ email: "leadupdate@example.com" });
    const created = await createLead(token);
    const leadId = created.body.lead._id;

    const res = await request(app)
      .patch(`/api/v1/lead/${leadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "contacted", notes: "Said yes to a call" });

    expect(res.status).toBe(200);
    expect(res.body.lead.status).toBe("contacted");
    expect(res.body.lead.notes).toBe("Said yes to a call");
  });

  it("enforces explicit status transition rules and rejects invalid jumps", async () => {
    const { token } = await registerUser({ email: "leadinvalidstatus@example.com" });
    const created = await createLead(token);
    const leadId = created.body.lead._id;

    const res = await request(app)
      .patch(`/api/v1/lead/${leadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "closed" });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Cannot transition lead status from 'new' to 'closed'");
  });

  it("filters leads by category", async () => {
    const { token } = await registerUser({ email: "leadfilter@example.com" });
    const categories = await request(app)
      .get("/api/v1/lead/categories")
      .set("Authorization", `Bearer ${token}`);
    const jobId = categories.body.categories.find((c) => c.slug === "job-outreach")._id;
    const salesId = categories.body.categories.find((c) => c.slug === "client-sales")._id;

    await createLead(token, { name: "Job Lead", categoryId: jobId });
    await createLead(token, { name: "Sales Lead", categoryId: salesId });

    const filtered = await request(app)
      .get("/api/v1/lead/get-user-leads")
      .query({ categoryId: jobId })
      .set("Authorization", `Bearer ${token}`);

    expect(filtered.status).toBe(200);
    expect(filtered.body.leads.every((l) => String(l.categoryId?._id || l.categoryId) === String(jobId))).toBe(true);
    expect(filtered.body.leads.some((l) => l.name === "Job Lead")).toBe(true);
  });

  it("schedules and completes a follow-up", async () => {
    const { token } = await registerUser({ email: "leadfollowup@example.com" });
    const created = await createLead(token);
    const leadId = created.body.lead._id;
    const dueAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    const addRes = await request(app)
      .post(`/api/v1/lead/${leadId}/follow-ups`)
      .set("Authorization", `Bearer ${token}`)
      .send({ dueAt, note: "Send case study" });

    expect(addRes.status).toBe(201);
    expect(addRes.body.lead.followUps).toHaveLength(1);
    expect(addRes.body.lead.nextFollowUpAt).toBeTruthy();

    const followUpId = addRes.body.lead.followUps[0]._id;

    // Verify document exists in standalone FollowUp collection
    const dbFollowUp = await FollowUp.findById(followUpId);
    expect(dbFollowUp).toBeTruthy();
    expect(dbFollowUp.note).toBe("Send case study");
    expect(dbFollowUp.status).toBe("pending");

    const doneRes = await request(app)
      .patch(`/api/v1/lead/${leadId}/follow-ups/${followUpId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "done" });

    expect(doneRes.status).toBe(200);
    expect(doneRes.body.lead.followUps[0].status).toBe("done");
    expect(doneRes.body.lead.nextFollowUpAt).toBeNull();

    // Verify status update persisted to standalone FollowUp collection
    const updatedDbFollowUp = await FollowUp.findById(followUpId);
    expect(updatedDbFollowUp.status).toBe("done");
  });

  it("marks an email as sent and moves new leads to contacted", async () => {
    generateAIContent.mockResolvedValue({
      success: true,
      data: "Subject: Hello\n\nBody",
    });

    const { token } = await registerUser({ email: "leadsent@example.com" });
    const created = await createLead(token);
    const leadId = created.body.lead._id;

    const batch = await request(app)
      .post("/api/v1/email/generate-batch")
      .set("Authorization", `Bearer ${token}`)
      .send({ leadIds: [leadId], instructions: "Keep it short", tone: "professional" });

    expect(batch.status).toBe(200);
    expect(batch.body.successCount).toBe(1);

    const emailId = batch.body.results[0].emailId;

    const markRes = await request(app)
      .patch(`/api/v1/email/${emailId}/mark-sent`)
      .set("Authorization", `Bearer ${token}`);

    expect(markRes.status).toBe(200);
    expect(markRes.body.email.sendStatus).toBe("sent");
    expect(markRes.body.email.sentAt).toBeTruthy();

    const detail = await request(app)
      .get(`/api/v1/lead/${leadId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(detail.body.lead.status).toBe("contacted");
    expect(detail.body.lead.emailsSentCount).toBe(1);
    expect(detail.body.lead.emailsGeneratedCount).toBe(1);

    const unmark = await request(app)
      .patch(`/api/v1/email/${emailId}/unmark-sent`)
      .set("Authorization", `Bearer ${token}`);

    expect(unmark.status).toBe(200);
    expect(unmark.body.email.sendStatus).toBe("generated");
  });

  it("runs an asynchronous batch generation job and returns progress status", async () => {
    generateAIContent.mockResolvedValue({
      success: true,
      data: "Subject: Async Hello\n\nBody",
    });

    const { token } = await registerUser({ email: "leadasync@example.com" });
    const created = await createLead(token);
    const leadId = created.body.lead._id;

    const jobRes = await request(app)
      .post("/api/v1/email/batch-jobs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        leadIds: [leadId],
        instructions: "Generate asynchronous outreach",
        tone: "friendly",
      });

    expect(jobRes.status).toBe(201);
    expect(jobRes.body.success).toBe(true);
    expect(jobRes.body.jobId).toBeTruthy();

    const jobId = jobRes.body.jobId;

    let jobStatus = "pending";
    let attempts = 0;
    while (jobStatus !== "completed" && attempts < 10) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const statusRes = await request(app)
        .get(`/api/v1/email/batch-jobs/${jobId}`)
        .set("Authorization", `Bearer ${token}`);
      
      expect(statusRes.status).toBe(200);
      expect(statusRes.body.success).toBe(true);
      jobStatus = statusRes.body.job.status;
      attempts++;
    }

    expect(jobStatus).toBe("completed");

    const finalRes = await request(app)
      .get(`/api/v1/email/batch-jobs/${jobId}`)
      .set("Authorization", `Bearer ${token}`);
    
    expect(finalRes.body.job.processedLeads).toBe(1);
    expect(finalRes.body.job.successCount).toBe(1);
    expect(finalRes.body.job.results[0].success).toBe(true);
    expect(finalRes.body.job.results[0].generatedEmail).toContain("Async Hello");
  });


  it("filters overdue follow-ups on the list", async () => {
    const { token } = await registerUser({ email: "leadoverdue@example.com" });
    const created = await createLead(token, { name: "Overdue Person" });
    const leadId = created.body.lead._id;
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    await request(app)
      .post(`/api/v1/lead/${leadId}/follow-ups`)
      .set("Authorization", `Bearer ${token}`)
      .send({ dueAt: past, note: "Was due yesterday" });

    const list = await request(app)
      .get("/api/v1/lead/get-user-leads")
      .query({ overdueOnly: "true" })
      .set("Authorization", `Bearer ${token}`);

    expect(list.status).toBe(200);
    expect(list.body.leads.some((l) => l._id === leadId)).toBe(true);
  });

  it("bulk deletes selected leads", async () => {
    const { token } = await registerUser({ email: "leadbulkdel@example.com" });
    const first = await createLead(token, {
      name: "Bulk One",
      email: "bulk1@acme.com",
    });
    const second = await createLead(token, {
      name: "Bulk Two",
      email: "bulk2@acme.com",
    });
    const keep = await createLead(token, {
      name: "Keep Me",
      email: "keep@acme.com",
    });

    const deleted = await request(app)
      .delete("/api/v1/lead/bulk-delete")
      .set("Authorization", `Bearer ${token}`)
      .send({
        leadIds: [first.body.lead._id, second.body.lead._id],
      });

    expect(deleted.status).toBe(200);
    expect(deleted.body.deletedCount).toBe(2);

    const list = await request(app)
      .get("/api/v1/lead/get-user-leads")
      .set("Authorization", `Bearer ${token}`);

    expect(list.status).toBe(200);
    const ids = list.body.leads.map((l) => l._id);
    expect(ids).toContain(keep.body.lead._id);
    expect(ids).not.toContain(first.body.lead._id);
    expect(ids).not.toContain(second.body.lead._id);
  });

  it("lists all batch generation jobs for a user", async () => {
    generateAIContent.mockResolvedValue({
      success: true,
      data: "Subject: List Hello\n\nBody",
    });

    const { token } = await registerUser({ email: "leadlistjobs@example.com" });
    const created = await createLead(token);
    const leadId = created.body.lead._id;

    // Create a batch job
    await request(app)
      .post("/api/v1/email/batch-jobs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        leadIds: [leadId],
        instructions: "List outreach test",
        tone: "formal",
      });

    // Query list
    const listRes = await request(app)
      .get("/api/v1/email/batch-jobs")
      .set("Authorization", `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.jobs).toHaveLength(1);
    expect(listRes.body.jobs[0].tone).toBe("formal");
    expect(listRes.body.jobs[0].totalLeads).toBe(1);
  });
});
