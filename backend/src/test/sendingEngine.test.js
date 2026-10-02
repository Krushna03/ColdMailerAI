import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { app } from "../app.js";
import { registerUser } from "./helpers.js";
import { SendJob } from "../models/SendJob.model.js";
import { EmailEvent } from "../models/EmailEvent.model.js";
import { Sequence } from "../models/Sequence.model.js";
import { SequenceStep } from "../models/SequenceStep.model.js";
import { SequenceEnrollment } from "../models/SequenceEnrollment.model.js";
import { Lead } from "../models/Lead.model.js";
import { Mailbox } from "../models/Mailbox.model.js";
import {
  createSendJob,
  claimNextSendJobs,
  processSendJob,
  recoverStaleSendJobs,
  cancelPendingSendJobsForEnrollment,
  drainSendJobQueue,
  retrySendJobService,
  listSendJobsService,
  getSendJobStatsService,
} from "../services/sendJob.service.js";

describe("Phase 5 — Sending Engine Pipeline", () => {
  let userToken;
  let userId;
  let workspaceId;
  let categoryId;
  let mailboxId;
  let leadId;
  let sequenceId;
  let stepId;
  let enrollmentId;

  beforeEach(async () => {
    const registered = await registerUser();
    userToken = registered.token;
    userId = registered.res.body.data.user._id;
    workspaceId = registered.res.body.data.workspace?._id;

    // Create Category
    const catRes = await request(app)
      .post("/api/v1/lead/categories")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Phase 5 Sending Engine" });
    categoryId = catRes.body.category._id;

    // Create Lead
    const leadRes = await request(app)
      .post("/api/v1/lead/create")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        name: "Satya Nadella",
        email: "satya@microsoft.com",
        company: { name: "Microsoft", industry: "Tech" },
        jobTitle: "CEO",
        categoryId,
      });
    leadId = leadRes.body.lead._id;

    // Connect SMTP mailbox with mocked nodemailer
    const mockSendMail = vi.fn().mockResolvedValue({ messageId: "<msg-engine-test@domain.io>" });
    vi.spyOn(nodemailer, "createTransport").mockReturnValue({
      verify: vi.fn().mockResolvedValue(true),
      sendMail: mockSendMail,
    });

    const mbRes = await request(app)
      .post("/api/v1/mailboxes/smtp")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        email: "engine@domain.io",
        name: "Sending Engine Agent",
        smtpHost: "smtp.domain.io",
        smtpPort: 587,
        smtpPass: "secretPass123",
        dailyLimit: 100,
      });
    mailboxId = mbRes.body.mailbox?._id;
    workspaceId = mbRes.body.mailbox?.workspaceId;

    // Create Sequence
    const seq = await Sequence.create({
      name: "High Volume Outbound",
      userId,
      workspaceId,
      status: "active",
      stepsCount: 2,
      settings: { mailboxId },
    });
    sequenceId = seq._id;

    const step1 = await SequenceStep.create({
      sequenceId: seq._id,
      workspaceId,
      order: 1,
      type: "email",
      title: "Step 1: Pitch",
      delay: { value: 0, unit: "days" },
      template: { subject: "Partnership with {{company}}", body: "Hello {{firstName}}" },
      stats: { sentCount: 0, deliveredCount: 0, failedCount: 0 },
    });
    stepId = step1._id;

    const enrollment = await SequenceEnrollment.create({
      sequenceId: seq._id,
      leadId,
      workspaceId,
      userId,
      mailboxId,
      status: "active",
      currentStepOrder: 1,
      currentStepId: step1._id,
      nextRunAt: new Date(),
    });
    enrollmentId = enrollment._id;
  });

  describe("Unit: SendJob Creation & Idempotency", () => {
    it("creates a send job with queued status and enforces idempotency", async () => {
      const job1 = await createSendJob({
        workspaceId,
        userId,
        sequenceId,
        stepId,
        stepOrder: 1,
        enrollmentId,
        leadId,
        mailboxId,
        messagePayload: {
          to: "satya@microsoft.com",
          subject: "Partnership with Microsoft",
          html: "<p>Hello Satya</p>",
          text: "Hello Satya",
        },
      });

      expect(job1).toBeDefined();
      expect(job1.status).toBe("queued");
      expect(job1.attempts).toBe(0);
      expect(job1.maxAttempts).toBe(3);
      expect(job1.idempotencyKey).toBe(`seq_${sequenceId}_enr_${enrollmentId}_step_1`);

      // Attempting to enqueue duplicate job for same sequence, enrollment, and stepOrder returns the existing job
      const job2 = await createSendJob({
        workspaceId,
        userId,
        sequenceId,
        stepId,
        stepOrder: 1,
        enrollmentId,
        leadId,
        mailboxId,
        messagePayload: {
          to: "satya@microsoft.com",
          subject: "Partnership with Microsoft",
          html: "<p>Hello Satya</p>",
          text: "Hello Satya",
        },
      });

      expect(job2._id.toString()).toBe(job1._id.toString());
      const totalJobs = await SendJob.countDocuments({ sequenceId });
      expect(totalJobs).toBe(1);
    });

    it("creates a scheduled job when scheduledFor is in the future", async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour ahead
      const job = await createSendJob({
        workspaceId,
        userId,
        sequenceId,
        stepId,
        stepOrder: 2,
        enrollmentId,
        leadId,
        mailboxId,
        scheduledFor: futureDate,
        messagePayload: {
          to: "satya@microsoft.com",
          subject: "Follow-up",
          html: "<p>Checking in</p>",
          text: "Checking in",
        },
      });

      expect(job.status).toBe("scheduled");
      expect(job.scheduledFor.getTime()).toBe(futureDate.getTime());
    });
  });

  describe("Unit: Atomic Queue Claiming & Distributed Locking", () => {
    it("atomically claims due jobs and locks them for worker execution", async () => {
      await createSendJob({
        workspaceId,
        userId,
        sequenceId,
        stepId,
        stepOrder: 1,
        enrollmentId,
        leadId,
        mailboxId,
        messagePayload: {
          to: "satya@microsoft.com",
          subject: "Pitch",
          html: "<p>Hi</p>",
          text: "Hi",
        },
      });

      const workerId = "worker-test-alpha";
      const claimed = await claimNextSendJobs(5, workerId);

      expect(claimed).toHaveLength(1);
      const claimedJob = claimed[0];
      expect(claimedJob.status).toBe("sending");
      expect(claimedJob.lockedBy).toBe(workerId);
      expect(claimedJob.lockedAt).toBeDefined();
      expect(claimedJob.attempts).toBe(1);

      // Verify another worker attempting to claim immediately gets 0 jobs
      const secondClaim = await claimNextSendJobs(5, "worker-test-beta");
      expect(secondClaim).toHaveLength(0);
    });
  });

  describe("Lifecycle Flow: Success Transitions & Audit Trail", () => {
    it("transitions sending -> sent -> delivered, logs EmailEvents, and advances enrollment", async () => {
      const job = await createSendJob({
        workspaceId,
        userId,
        sequenceId,
        stepId,
        stepOrder: 1,
        enrollmentId,
        leadId,
        mailboxId,
        messagePayload: {
          to: "satya@microsoft.com",
          subject: "Partnership with Microsoft",
          html: "<p>Hello Satya</p>",
          text: "Hello Satya",
        },
      });

      // Claim job
      const claimed = await claimNextSendJobs(1, "worker-test-1");
      expect(claimed).toHaveLength(1);

      // Process job
      const result = await processSendJob(claimed[0]);
      expect(result.success).toBe(true);
      expect(result.status).toBe("sent");
      expect(result.messageId).toBe("<msg-engine-test@domain.io>");

      // Verify Job Status in DB
      const updatedJob = await SendJob.findById(job._id);
      expect(updatedJob.status).toBe("sent");
      expect(updatedJob.lockedAt).toBeNull();
      expect(updatedJob.completedAt).toBeDefined();
      expect(updatedJob.providerResponse?.messageId).toBe("<msg-engine-test@domain.io>");

      // Verify EmailEvents audit trail
      const events = await EmailEvent.find({ sendJobId: job._id }).sort({ createdAt: 1 });
      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain("queued");
      expect(eventTypes).toContain("sending");
      expect(eventTypes).toContain("sent");
      expect(eventTypes).toContain("delivered");

      // Verify Step Stats updated
      const step = await SequenceStep.findById(stepId);
      expect(step.stats.sentCount).toBe(1);
      expect(step.stats.deliveredCount).toBe(1);

      // Verify Lead status updated to contacted
      const lead = await Lead.findById(leadId);
      expect(lead.status).toBe("contacted");
      expect(lead.emailsSentCount).toBe(1);

      // Verify Sequence Enrollment stepHistory and advancement
      const enrollment = await SequenceEnrollment.findById(enrollmentId);
      expect(enrollment.stepHistory).toHaveLength(1);
      expect(enrollment.stepHistory[0].type).toBe("email");
      expect(enrollment.stepHistory[0].status).toBe("success");
    });
  });

  describe("Lifecycle Flow: Retry & Dead-Letter Queue", () => {
    it("handles transient failure by transitioning to retry with exponential backoff", async () => {
      // Mock nodemailer failure (transient network timeout)
      vi.spyOn(nodemailer, "createTransport").mockReturnValue({
        verify: vi.fn().mockResolvedValue(true),
        sendMail: vi.fn().mockRejectedValue(new Error("ETIMEDOUT: Connection to SMTP host timed out")),
      });

      const job = await createSendJob({
        workspaceId,
        userId,
        sequenceId,
        stepId,
        stepOrder: 1,
        enrollmentId,
        leadId,
        mailboxId,
        maxAttempts: 3,
        messagePayload: {
          to: "satya@microsoft.com",
          subject: "Pitch",
          html: "<p>Hi</p>",
          text: "Hi",
        },
      });

      const claimed = await claimNextSendJobs(1, "worker-retry-test");
      const result = await processSendJob(claimed[0]);

      expect(result.success).toBe(false);
      expect(result.status).toBe("retry");

      const retriedJob = await SendJob.findById(job._id);
      expect(retriedJob.status).toBe("retry");
      expect(retriedJob.attempts).toBe(1);
      expect(retriedJob.nextAttemptAt).toBeDefined();
      expect(retriedJob.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
      expect(retriedJob.lastError).toContain("ETIMEDOUT");
      expect(retriedJob.errorHistory).toHaveLength(1);

      // Check retry EmailEvent
      const retryEvent = await EmailEvent.findOne({ sendJobId: job._id, type: "retry" });
      expect(retryEvent).toBeDefined();
    });

    it("moves to dead_letter state when max attempts are exceeded", async () => {
      // Mock failure
      vi.spyOn(nodemailer, "createTransport").mockReturnValue({
        verify: vi.fn().mockResolvedValue(true),
        sendMail: vi.fn().mockRejectedValue(new Error("Authentication rejected by remote host")),
      });

      const job = await createSendJob({
        workspaceId,
        userId,
        sequenceId,
        stepId,
        stepOrder: 1,
        enrollmentId,
        leadId,
        mailboxId,
        maxAttempts: 1, // Only 1 attempt allowed
        messagePayload: {
          to: "satya@microsoft.com",
          subject: "Pitch",
          html: "<p>Hi</p>",
          text: "Hi",
        },
      });

      const claimed = await claimNextSendJobs(1, "worker-dead-letter-test");
      const result = await processSendJob(claimed[0]);

      expect(result.success).toBe(false);
      expect(result.status).toBe("dead_letter");

      const dlJob = await SendJob.findById(job._id);
      expect(dlJob.status).toBe("dead_letter");
      expect(dlJob.failedAt).toBeDefined();

      const failEvent = await EmailEvent.findOne({ sendJobId: job._id, type: "failed" });
      expect(failEvent).toBeDefined();
    });
  });

  describe("Lifecycle Flow: Hard Bounces", () => {
    it("identifies bounces, marks job bounced, halts enrollment, and flags lead", async () => {
      // Mock bounce rejection (550 User unknown)
      vi.spyOn(nodemailer, "createTransport").mockReturnValue({
        verify: vi.fn().mockResolvedValue(true),
        sendMail: vi.fn().mockRejectedValue(new Error("550 5.1.1 User unknown: recipient address invalid")),
      });

      const job = await createSendJob({
        workspaceId,
        userId,
        sequenceId,
        stepId,
        stepOrder: 1,
        enrollmentId,
        leadId,
        mailboxId,
        messagePayload: {
          to: "invalid-user@microsoft.com",
          subject: "Pitch",
          html: "<p>Hi</p>",
          text: "Hi",
        },
      });

      const claimed = await claimNextSendJobs(1, "worker-bounce-test");
      const result = await processSendJob(claimed[0]);

      expect(result.success).toBe(false);
      expect(result.status).toBe("bounced");

      // Verify job is marked bounced
      const bouncedJob = await SendJob.findById(job._id);
      expect(bouncedJob.status).toBe("bounced");

      // Verify Lead is marked bounced
      const lead = await Lead.findById(leadId);
      expect(lead.status).toBe("bounced");

      // Verify Sequence Enrollment is stopped with stopReason "bounced"
      const enrollment = await SequenceEnrollment.findById(enrollmentId);
      expect(enrollment.status).toBe("stopped");
      expect(enrollment.stopReason).toBe("bounced");

      // Verify EmailEvent bounced recorded
      const bounceEvent = await EmailEvent.findOne({ sendJobId: job._id, type: "bounced" });
      expect(bounceEvent).toBeDefined();
    });
  });

  describe("Lifecycle Flow: Cancellation & Stale Job Recovery", () => {
    it("cancels pending send jobs when an enrollment is stopped", async () => {
      const job = await createSendJob({
        workspaceId,
        userId,
        sequenceId,
        stepId,
        stepOrder: 1,
        enrollmentId,
        leadId,
        mailboxId,
        messagePayload: {
          to: "satya@microsoft.com",
          subject: "Cancel me",
          html: "<p>Hi</p>",
          text: "Hi",
        },
      });

      expect(job.status).toBe("queued");

      const cancelledCount = await cancelPendingSendJobsForEnrollment(enrollmentId);
      expect(cancelledCount).toBe(1);

      const cancelledJob = await SendJob.findById(job._id);
      expect(cancelledJob.status).toBe("cancelled");

      const cancelEvent = await EmailEvent.findOne({ sendJobId: job._id, type: "cancelled" });
      expect(cancelEvent).toBeDefined();
    });

    it("recovers stale locked jobs from crashed workers", async () => {
      const job = await SendJob.create({
        workspaceId,
        userId,
        sequenceId,
        stepId,
        stepOrder: 1,
        enrollmentId,
        leadId,
        mailboxId,
        status: "sending",
        lockedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        lockedBy: "dead-worker-123",
        attempts: 1,
        maxAttempts: 3,
        errorHistory: [],
        scheduledFor: new Date(),
        messagePayload: {
          to: "satya@microsoft.com",
          subject: "Stale test",
          html: "<p>Hi</p>",
          text: "Hi",
        },
      });

      const recoveredCount = await recoverStaleSendJobs(5 * 60 * 1000);
      expect(recoveredCount).toBeGreaterThanOrEqual(1);

      const recoveredJob = await SendJob.findById(job._id);
      expect(recoveredJob.status).toBe("retry");
      expect(recoveredJob.lockedAt).toBeNull();
      expect(recoveredJob.lockedBy).toBeNull();
    });
  });

  describe("Integration: Sending Engine REST API Endpoints", () => {
    it("lists send jobs, fetches queue statistics, and triggers manual retry for dead-letter jobs", async () => {
      // 1. Create a dead-letter job
      const deadJob = await SendJob.create({
        workspaceId,
        userId,
        sequenceId,
        stepId,
        stepOrder: 1,
        enrollmentId,
        leadId,
        mailboxId,
        status: "dead_letter",
        attempts: 3,
        maxAttempts: 3,
        scheduledFor: new Date(),
        messagePayload: {
          to: "satya@microsoft.com",
          subject: "Failed message",
          html: "<p>Hi</p>",
          text: "Hi",
        },
        errorHistory: [{ attempt: 3, error: "Network failed", timestamp: new Date() }],
      });

      // 2. GET /api/v1/sequences/send-jobs
      const listRes = await request(app)
        .get(`/api/v1/sequences/send-jobs?sequenceId=${sequenceId}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.jobs.length).toBeGreaterThanOrEqual(1);

      // 3. GET /api/v1/sequences/send-jobs/stats
      const statsRes = await request(app)
        .get(`/api/v1/sequences/send-jobs/stats?sequenceId=${sequenceId}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.data.dead_letter).toBe(1);
      expect(statsRes.body.data.total).toBeGreaterThanOrEqual(1);

      // 4. POST /api/v1/sequences/send-jobs/:id/retry
      const retryRes = await request(app)
        .post(`/api/v1/sequences/send-jobs/${deadJob._id}/retry`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(retryRes.status).toBe(200);
      expect(retryRes.body.data.status).toBe("queued");

      const refreshedJob = await SendJob.findById(deadJob._id);
      expect(refreshedJob.status).toBe("queued");
      expect(refreshedJob.attempts).toBe(0);

      // 5. GET /api/v1/sequences/email-events
      const eventsRes = await request(app)
        .get(`/api/v1/sequences/email-events?sequenceId=${sequenceId}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(eventsRes.status).toBe(200);
      expect(Array.isArray(eventsRes.body.data.events)).toBe(true);
    });
  });
});
