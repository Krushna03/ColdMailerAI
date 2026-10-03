import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { app } from "../app.js";
import { registerUser } from "./helpers.js";
import { InboundEmail } from "../models/InboundEmail.model.js";
import { Lead } from "../models/Lead.model.js";
import { Mailbox } from "../models/Mailbox.model.js";
import { Sequence } from "../models/Sequence.model.js";
import { SequenceStep } from "../models/SequenceStep.model.js";
import { SequenceEnrollment } from "../models/SequenceEnrollment.model.js";
import { SendJob } from "../models/SendJob.model.js";
import { EmailEvent } from "../models/EmailEvent.model.js";
import { Activity } from "../models/Activity.model.js";
import {
  processInboundEmailService,
  listInboundEmailsService,
  getInboundStatsService,
} from "../services/inboundEmail.service.js";
import {
  classifyEmailReplyService,
  heuristicReplyClassifier,
} from "../services/replyClassification.service.js";

describe("Phase 6 — Reply Detection Pipeline", () => {
  let userToken;
  let userId;
  let workspaceId;
  let categoryId;
  let mailboxId;
  let mailboxEmail = "outbound@company.io";
  let leadId;
  let leadEmail = "sam.altman@openai.com";
  let sequenceId;
  let enrollmentId;
  let outboundMessageId = "<msg-outbound-step1@company.io>";

  beforeEach(async () => {
    const registered = await registerUser();
    userToken = registered.token;
    userId = registered.res.body.data.user._id;
    workspaceId = registered.res.body.data.workspace?._id;

    // Create Category
    const catRes = await request(app)
      .post("/api/v1/lead/categories")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Phase 6 Reply Detection" });
    categoryId = catRes.body.category._id;

    // Mock Nodemailer for mailbox
    vi.spyOn(nodemailer, "createTransport").mockReturnValue({
      verify: vi.fn().mockResolvedValue(true),
      sendMail: vi.fn().mockResolvedValue({ messageId: outboundMessageId }),
    });

    // Create Mailbox
    const mbRes = await request(app)
      .post("/api/v1/mailboxes/smtp")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        email: mailboxEmail,
        name: "Reply Inbound Agent",
        smtpHost: "smtp.company.io",
        smtpPort: 587,
        smtpPass: "superSecret123",
        dailyLimit: 200,
      });
    mailboxId = mbRes.body.mailbox?._id;
    workspaceId = mbRes.body.mailbox?.workspaceId;

    // Create Lead
    const lead = await Lead.create({
      name: "Sam Altman",
      email: leadEmail,
      company: { name: "OpenAI", industry: "AI" },
      jobTitle: "CEO",
      status: "contacted",
      userId,
      workspaceId,
      categoryId,
      emailsSentCount: 1,
      lastContactedAt: new Date(),
    });
    leadId = lead._id;

    // Create Sequence
    const seq = await Sequence.create({
      name: "Founder Outreach Cadence",
      userId,
      workspaceId,
      status: "active",
      stepsCount: 3,
      settings: { mailboxId, stopOnReply: true },
    });
    sequenceId = seq._id;

    const step1 = await SequenceStep.create({
      sequenceId: seq._id,
      workspaceId,
      order: 1,
      type: "email",
      title: "Step 1: Introduction",
      delay: { value: 0, unit: "days" },
      template: { subject: "ColdMailer intro for OpenAI", body: "Hello Sam" },
    });

    const step2 = await SequenceStep.create({
      sequenceId: seq._id,
      workspaceId,
      order: 2,
      type: "email",
      title: "Step 2: Follow-up",
      delay: { value: 3, unit: "days" },
      template: { subject: "Follow up on ColdMailer", body: "Checking in" },
    });

    // Create Enrollment
    const enrollment = await SequenceEnrollment.create({
      sequenceId: seq._id,
      leadId,
      workspaceId,
      userId,
      mailboxId,
      status: "active",
      currentStepOrder: 2,
      currentStepId: step2._id,
      nextRunAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    });
    enrollmentId = enrollment._id;

    // Create Outbound SendJob for Step 1
    await SendJob.create({
      workspaceId,
      userId,
      sequenceId: seq._id,
      stepId: step1._id,
      stepOrder: 1,
      enrollmentId: enrollment._id,
      leadId,
      mailboxId,
      status: "sent",
      completedAt: new Date(),
      messagePayload: {
        to: leadEmail,
        subject: "ColdMailer intro for OpenAI",
        html: "<p>Hello Sam</p>",
        text: "Hello Sam",
      },
      providerResponse: {
        messageId: outboundMessageId,
        provider: "smtp",
        sentAt: new Date(),
      },
    });

    // Create Pending SendJob for Step 2
    await SendJob.create({
      workspaceId,
      userId,
      sequenceId: seq._id,
      stepId: step2._id,
      stepOrder: 2,
      enrollmentId: enrollment._id,
      leadId,
      mailboxId,
      status: "scheduled",
      scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      messagePayload: {
        to: leadEmail,
        subject: "Follow up on ColdMailer",
        html: "<p>Checking in</p>",
        text: "Checking in",
      },
    });
  });

  describe("Unit: Inbound Email Ingestion & Conversation Matching", () => {
    it("ingests an inbound reply and matches it to lead and conversation thread", async () => {
      const replyMessageId = "<reply-from-sam-101@mail.openai.com>";
      const result = await processInboundEmailService({
        from: { name: "Sam Altman", email: leadEmail },
        to: mailboxEmail,
        subject: "Re: ColdMailer intro for OpenAI",
        bodyText: "Sounds very interesting! Could you send over pricing and a quick deck?",
        messageId: replyMessageId,
        inReplyTo: outboundMessageId,
        references: [outboundMessageId],
        source: "webhook",
      });

      expect(result).toBeDefined();
      expect(result.inboundEmail).toBeDefined();
      expect(result.inboundEmail.leadId.toString()).toBe(leadId.toString());
      expect(result.inboundEmail.sequenceId.toString()).toBe(sequenceId.toString());
      expect(result.inboundEmail.enrollmentId.toString()).toBe(enrollmentId.toString());
      expect(result.inboundEmail.inReplyTo).toBe(outboundMessageId);
      expect(result.inboundEmail.isRead).toBe(false);

      // Verify idempotency
      const duplicateResult = await processInboundEmailService({
        from: { name: "Sam Altman", email: leadEmail },
        to: mailboxEmail,
        subject: "Re: ColdMailer intro for OpenAI",
        bodyText: "Duplicate text",
        messageId: replyMessageId,
        inReplyTo: outboundMessageId,
      });

      expect(duplicateResult.inboundEmail._id.toString()).toBe(result.inboundEmail._id.toString());
      const count = await InboundEmail.countDocuments({ messageId: replyMessageId });
      expect(count).toBe(1);
    });

    it("matches lead across workspace when inReplyTo header is stripped by email client", async () => {
      const result = await processInboundEmailService({
        from: { name: "Sam Altman", email: leadEmail },
        to: mailboxEmail,
        subject: "Quick question regarding your email",
        bodyText: "I saw your note. Does ColdMailer support custom SMTP rotations?",
        source: "webhook",
      });

      expect(result.lead._id.toString()).toBe(leadId.toString());
      expect(result.inboundEmail.sequenceId.toString()).toBe(sequenceId.toString());
      expect(result.inboundEmail.enrollmentId.toString()).toBe(enrollmentId.toString());
    });
  });

  describe("Lifecycle Flow: Automated Sequence Halting & Cancellation", () => {
    it("halts active sequence cadence and cancels pending queue jobs when lead replies", async () => {
      // Before reply: Enrollment active, Step 2 job scheduled
      const initialEnrollment = await SequenceEnrollment.findById(enrollmentId);
      expect(initialEnrollment.status).toBe("active");

      const pendingJobsBefore = await SendJob.find({
        enrollmentId,
        status: { $in: ["scheduled", "queued", "retry"] },
      });
      expect(pendingJobsBefore).toHaveLength(1);

      // Ingest reply
      await processInboundEmailService({
        from: { name: "Sam Altman", email: leadEmail },
        to: mailboxEmail,
        subject: "Re: ColdMailer intro for OpenAI",
        bodyText: "Let's discuss this further.",
        inReplyTo: outboundMessageId,
      });

      // 1. Enrollment status must be stopped with reason 'replied'
      const updatedEnrollment = await SequenceEnrollment.findById(enrollmentId);
      expect(updatedEnrollment.status).toBe("stopped");
      expect(updatedEnrollment.stopReason).toBe("replied");
      expect(updatedEnrollment.nextRunAt).toBeNull();

      // 2. Pending SendJobs for this cadence must be cancelled
      const pendingJobsAfter = await SendJob.find({
        enrollmentId,
        status: { $in: ["scheduled", "queued", "retry"] },
      });
      expect(pendingJobsAfter).toHaveLength(0);

      const cancelledJob = await SendJob.findOne({
        enrollmentId,
        status: "cancelled",
      });
      expect(cancelledJob).toBeDefined();

      // 3. Lead status must be 'replied'
      const updatedLead = await Lead.findById(leadId);
      expect(updatedLead.status).toBe("replied");
      expect(updatedLead.repliesCount).toBeGreaterThanOrEqual(1);
      expect(updatedLead.lastRepliedAt).toBeDefined();
    });
  });

  describe("AI & Heuristic Reply Classification", () => {
    it("classifies buying interest correctly", () => {
      const res = heuristicReplyClassifier(
        "Re: Cold outreach",
        "Hi! This sounds very interesting. Could you please send over your pricing and share a demo deck?"
      );
      expect(res.category).toBe("interested");
      expect(res.sentiment).toBe("positive");
      expect(res.confidence).toBeGreaterThan(0.7);
    });

    it("classifies meeting requests and calendar invites", async () => {
      const res = heuristicReplyClassifier(
        "Re: Quick chat",
        "Let's jump on a call next Tuesday at 2pm. Here is my link: https://calendly.com/sam/15min"
      );
      expect(res.category).toBe("meeting_request");
      expect(res.sentiment).toBe("positive");

      // Verify that meeting request sets lead status to 'meeting'
      const processRes = await processInboundEmailService({
        from: { name: "Sam Altman", email: leadEmail },
        to: mailboxEmail,
        subject: "Let's schedule a call",
        bodyText: "Let's hop on a call next Tuesday at 2pm. calendly.com/sam",
        inReplyTo: outboundMessageId,
      });

      expect(processRes.lead.status).toBe("meeting");
    });

    it("classifies out-of-office automated auto-responses", () => {
      const res = heuristicReplyClassifier(
        "Automatic reply: Out of the office",
        "Thank you for contacting me. I am out of the office on annual leave until October 25th with limited email access."
      );
      expect(res.category).toBe("out_of_office");
      expect(res.sentiment).toBe("neutral");
    });

    it("classifies unsubscribe requests and tags lead", async () => {
      const res = heuristicReplyClassifier(
        "Re: Outreach",
        "Please remove me from your email list and unsubscribe immediately. Do not contact again."
      );
      expect(res.category).toBe("unsubscribe");
      expect(res.sentiment).toBe("negative");

      const processRes = await processInboundEmailService({
        from: { name: "Sam Altman", email: leadEmail },
        to: mailboxEmail,
        subject: "Unsubscribe",
        bodyText: "Please remove me from your list and unsubscribe.",
        inReplyTo: outboundMessageId,
      });

      expect(processRes.lead.tags).toContain("unsubscribed");
    });

    it("classifies objections and wrong person referrals", () => {
      const objection = heuristicReplyClassifier(
        "Re: Pitch",
        "We already use another platform and have no budget this quarter. Check back in next year."
      );
      expect(objection.category).toBe("objection");

      const wrongPerson = heuristicReplyClassifier(
        "Re: Pitch",
        "I am not the right person for this. You should talk to Greg Brockman who leads engineering."
      );
      expect(wrongPerson.category).toBe("wrong_person");
    });
  });

  describe("Audit Trail: Activity Logging & EmailEvent Recording", () => {
    it("logs REPLY_RECEIVED activity and records EmailEvent", async () => {
      await processInboundEmailService({
        from: { name: "Sam Altman", email: leadEmail },
        to: mailboxEmail,
        subject: "Re: ColdMailer",
        bodyText: "Sounds good, let's discuss pricing.",
        inReplyTo: outboundMessageId,
      });

      // Activity logged
      const activity = await Activity.findOne({
        leadId,
        type: "REPLY_RECEIVED",
      });
      expect(activity).toBeDefined();
      expect(activity.title).toContain("Sam Altman");

      // EmailEvent logged
      const emailEvent = await EmailEvent.findOne({
        leadId,
        type: "replied",
      });
      expect(emailEvent).toBeDefined();
      expect(emailEvent.sequenceId.toString()).toBe(sequenceId.toString());
    });
  });

  describe("Integration: REST API Endpoints", () => {
    it("simulates inbound reply via POST /api/v1/inbound/simulate", async () => {
      const res = await request(app)
        .post("/api/v1/inbound/simulate")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          leadId,
          subject: "Re: Quick question",
          bodyText: "Hey! What are the pricing tiers for high volume sending?",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.inboundEmail).toBeDefined();
      expect(res.body.data.classification.category).toBe("interested");
    });

    it("lists inbound emails with pagination and filters via GET /api/v1/inbound", async () => {
      await processInboundEmailService({
        from: { name: "Sam Altman", email: leadEmail },
        to: mailboxEmail,
        subject: "Re: Follow up #1",
        bodyText: "Tell me more about ColdMailer features.",
      });

      const res = await request(app)
        .get("/api/v1/inbound")
        .set("Authorization", `Bearer ${userToken}`)
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data.inboundEmails.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it("fetches aggregate reply statistics via GET /api/v1/inbound/stats", async () => {
      await processInboundEmailService({
        from: { name: "Sam Altman", email: leadEmail },
        to: mailboxEmail,
        subject: "Re: Demo",
        bodyText: "Let's schedule a call next week.",
      });

      const res = await request(app)
        .get("/api/v1/inbound/stats")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBeGreaterThanOrEqual(1);
      expect(res.body.data.categories).toBeDefined();
    });

    it("marks an inbound email as read via PATCH /api/v1/inbound/:id/read", async () => {
      const { inboundEmail } = await processInboundEmailService({
        from: { name: "Sam Altman", email: leadEmail },
        to: mailboxEmail,
        subject: "Re: Meeting",
        bodyText: "Checking in.",
      });

      const res = await request(app)
        .patch(`/api/v1/inbound/${inboundEmail._id}/read`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ isRead: true });

      expect(res.status).toBe(200);
      expect(res.body.data.isRead).toBe(true);
    });
  });
});
