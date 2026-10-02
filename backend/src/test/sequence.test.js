import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { app } from "../app.js";
import { registerUser } from "./helpers.js";
import { Sequence } from "../models/Sequence.model.js";
import { SequenceStep } from "../models/SequenceStep.model.js";
import { SequenceEnrollment } from "../models/SequenceEnrollment.model.js";
import { Lead } from "../models/Lead.model.js";
import { Mailbox } from "../models/Mailbox.model.js";
import { interpolateTemplate, processDueEnrollmentsService } from "../services/sequenceExecution.service.js";

describe("Phase 4 — Sequence Engine Pipeline", () => {
  let userToken;
  let userId;
  let workspaceId;
  let categoryId;
  let mailboxId;

  beforeEach(async () => {
    const registered = await registerUser();
    userToken = registered.token;
    userId = registered.res.body.data.user._id;
    workspaceId = registered.res.body.data.workspace?._id;

    // Create Category
    const catRes = await request(app)
      .post("/api/v1/lead/categories")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Phase 4 Sequences" });

    categoryId = catRes.body.category._id;

    // Connect a mock SMTP mailbox
    const mockSendMail = vi.fn().mockResolvedValue({ messageId: "<seq-test-123@domain.io>" });
    vi.spyOn(nodemailer, "createTransport").mockReturnValue({
      verify: vi.fn().mockResolvedValue(true),
      sendMail: mockSendMail,
    });

    const mbRes = await request(app)
      .post("/api/v1/mailboxes/smtp")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        email: "outreach@domain.io",
        name: "Sales Agent",
        smtpHost: "smtp.domain.io",
        smtpPort: 587,
        smtpPass: "secretPass123",
        dailyLimit: 200,
      });

    mailboxId = mbRes.body.mailbox?._id;
    workspaceId = mbRes.body.mailbox?.workspaceId;
  });

  describe("Unit: Templating & Dynamic Interpolation", () => {
    it("interpolates lead fields, company, job title, and fallback defaults cleanly", () => {
      const lead = {
        name: "Satya Nadella",
        email: "satya@microsoft.com",
        company: { name: "Microsoft", industry: "SaaS" },
        jobTitle: "CEO",
        customFields: {
          fundingStage: "Public",
        },
      };

      const template =
        "Hi {{firstName}}, hope things are well at {{company}}! As {{jobTitle}}, are you seeing {{customFields.fundingStage}} opportunities?";

      const rendered = interpolateTemplate(template, lead);
      expect(rendered).toBe(
        "Hi Satya, hope things are well at Microsoft! As CEO, are you seeing Public opportunities?"
      );
    });

    it("uses default fallback value when field is missing or empty", () => {
      const lead = {
        name: "",
        email: "anonymous@domain.com",
        company: "",
      };

      const template = "Hello {{firstName|there}}, we'd love to partner with {{company|your company}}!";
      const rendered = interpolateTemplate(template, lead);
      expect(rendered).toBe("Hello there, we'd love to partner with your company!");
    });
  });

  describe("Integration: Sequence CRUD & Workflow Step Pipeline", () => {
    it("creates a sequence with rich settings, enrollment rules, and multi-step pipeline", async () => {
      const payload = {
        name: "SaaS Outreach Cadence",
        description: "Automated 4-step sequence for SaaS founders",
        status: "active",
        settings: {
          stopOnReply: true,
          stopOnClick: false,
          stopOnMeetingBooked: true,
          sendOnDays: [1, 2, 3, 4, 5],
          sendWindow: {
            enabled: true,
            start: "09:00",
            end: "17:00",
            timezone: "UTC",
          },
          mailboxId,
          trackOpens: true,
          trackClicks: true,
        },
        enrollmentRules: {
          allowReenrollment: false,
          stopIfLeadStatus: ["replied", "meeting", "closed", "archived"],
        },
        steps: [
          {
            order: 1,
            type: "email",
            title: "Day 0 - Initial Value Prop",
            delay: { value: 0, unit: "days" },
            template: {
              subject: "Quick question regarding {{company}}",
              body: "Hi {{firstName|there}},\n\nNoticed what you are building at {{company}}. Would love to share some insights.",
            },
          },
          {
            order: 2,
            type: "wait",
            title: "Wait 3 days",
            delay: { value: 3, unit: "days" },
          },
          {
            order: 3,
            type: "condition",
            title: "If no reply",
            conditions: {
              field: "replyReceived",
              operator: "is_false",
              actionOnFalse: "stop",
            },
          },
          {
            order: 4,
            type: "email",
            title: "Email #2 - Case Study Follow-up",
            delay: { value: 4, unit: "days" },
            template: {
              subject: "Following up on my last note for {{company}}",
              body: "Hey {{firstName}},\n\nWanted to follow up with our latest SaaS benchmark report.",
            },
          },
          {
            order: 5,
            type: "email",
            title: "Email #3 - Breakup Email",
            delay: { value: 5, unit: "days" },
            template: {
              subject: "Permission to close file?",
              body: "Hi {{firstName}},\n\nI assume this isn't a priority right now. All the best!",
            },
          },
        ],
      };

      const res = await request(app)
        .post("/api/v1/sequences")
        .set("Authorization", `Bearer ${userToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("SaaS Outreach Cadence");
      expect(res.body.data.stepsCount).toBe(5);
      expect(res.body.data.steps).toHaveLength(5);
      expect(res.body.data.steps[0].type).toBe("email");
      expect(res.body.data.steps[1].type).toBe("wait");
      expect(res.body.data.steps[2].type).toBe("condition");
    });

    it("lists sequences with status filter and pagination", async () => {
      // Create a draft sequence
      await request(app)
        .post("/api/v1/sequences")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          name: "Investor Pipeline",
          status: "draft",
          steps: [
            {
              order: 1,
              type: "email",
              template: { subject: "Intro", body: "Hello" },
            },
          ],
        });

      const listRes = await request(app)
        .get("/api/v1/sequences")
        .set("Authorization", `Bearer ${userToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.sequences.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Integration: Lead Enrollment & Execution Engine", () => {
    it("enrolls leads, executes Step 1 email, advances order, and stops on reply automatically", async () => {
      // 1. Create a lead
      const leadRes = await request(app)
        .post("/api/v1/lead/create")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          name: "Elon Musk",
          email: "elon@x.com",
          company: { name: "X Corp", industry: "Social & AI" },
          jobTitle: "Founder & CTO",
          categoryId,
        });

      const leadId = leadRes.body.lead._id;

      // 2. Create Sequence
      const seqRes = await request(app)
        .post("/api/v1/sequences")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          name: "Founder Sequence",
          status: "active",
          settings: {
            stopOnReply: true,
            mailboxId,
          },
          steps: [
            {
              order: 1,
              type: "email",
              title: "Step 1: Introduction",
              delay: { value: 0, unit: "days" },
              template: {
                subject: "Question about {{company}}",
                body: "Hello {{firstName}},\n\nExcited about your work at {{company}}!",
              },
            },
            {
              order: 2,
              type: "email",
              title: "Step 2: Follow-up",
              delay: { value: 3, unit: "days" },
              template: {
                subject: "Checking back in for {{company}}",
                body: "Any thoughts on my previous email, {{firstName}}?",
              },
            },
          ],
        });

      const sequenceId = seqRes.body.data._id;

      // 3. Enroll Lead
      const enrollRes = await request(app)
        .post(`/api/v1/sequences/${sequenceId}/enroll`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ leadIds: [leadId] });

      expect(enrollRes.status).toBe(200);
      expect(enrollRes.body.data.enrolledCount).toBe(1);

      // Verify enrollment record created with status active and nextRunAt now
      const enrollmentsRes = await request(app)
        .get(`/api/v1/sequences/${sequenceId}/enrollments`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(enrollmentsRes.status).toBe(200);
      expect(enrollmentsRes.body.data.enrollments).toHaveLength(1);
      const enrollment = enrollmentsRes.body.data.enrollments[0];
      expect(enrollment.status).toBe("active");
      expect(enrollment.currentStepOrder).toBe(1);

      // 4. Trigger Sequence Execution Engine Cycle
      const processRes = await request(app)
        .post("/api/v1/sequences/process-now")
        .set("Authorization", `Bearer ${userToken}`);

      expect(processRes.status).toBe(200);
      expect(processRes.body.data.processedCount).toBeGreaterThanOrEqual(1);

      // Check enrollment status after execution: Step 1 executed, now waiting for Step 2
      const updatedEnrollment = await SequenceEnrollment.findById(enrollment._id);
      expect(updatedEnrollment.currentStepOrder).toBe(2);
      expect(updatedEnrollment.stepHistory).toHaveLength(1);
      expect(updatedEnrollment.stepHistory[0].type).toBe("email");
      expect(updatedEnrollment.stepHistory[0].status).toBe("success");
      expect(updatedEnrollment.stepHistory[0].subject).toContain("Question about X Corp");

      // Check lead was moved to "contacted"
      const updatedLead = await Lead.findById(leadId);
      expect(updatedLead.status).toBe("contacted");

      // 5. TEST AUTO-STOP ON REPLY:
      // Lead responds -> status changes to "replied"
      const statusUpdateRes = await request(app)
        .patch(`/api/v1/lead/${leadId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ status: "replied" });

      expect(statusUpdateRes.status).toBe(200);

      // Enrollment must be immediately marked as stopped with reason "replied"
      const stoppedEnrollment = await SequenceEnrollment.findById(enrollment._id);
      expect(stoppedEnrollment.status).toBe("stopped");
      expect(stoppedEnrollment.stopReason).toBe("replied");
      expect(stoppedEnrollment.nextRunAt).toBeNull();
    });

    it("allows pausing and resuming an active enrollment", async () => {
      const lead = await Lead.create({
        name: "Tim Cook",
        email: "tim@apple.com",
        company: { name: "Apple" },
        userId,
        workspaceId,
        categoryId,
      });

      const seq = await Sequence.create({
        name: "Enterprise Cadence",
        userId,
        workspaceId: lead.workspaceId,
        status: "active",
        stepsCount: 1,
      });

      const step = await SequenceStep.create({
        sequenceId: seq._id,
        workspaceId: lead.workspaceId,
        order: 1,
        type: "email",
        delay: { value: 0, unit: "days" },
        template: { subject: "Test", body: "Test" },
      });

      const enrollment = await SequenceEnrollment.create({
        sequenceId: seq._id,
        leadId: lead._id,
        workspaceId: lead.workspaceId,
        userId,
        status: "active",
        currentStepOrder: 1,
        currentStepId: step._id,
        leadSnapshot: { name: lead.name, email: lead.email, company: "Apple" },
      });

      // Pause
      const pauseRes = await request(app)
        .patch(`/api/v1/sequences/${seq._id}/enrollments/${enrollment._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ status: "paused" });

      expect(pauseRes.status).toBe(200);
      expect(pauseRes.body.data.status).toBe("paused");

      // Resume
      const resumeRes = await request(app)
        .patch(`/api/v1/sequences/${seq._id}/enrollments/${enrollment._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ status: "active" });

      expect(resumeRes.status).toBe(200);
      expect(resumeRes.body.data.status).toBe("active");
    });
  });
});
