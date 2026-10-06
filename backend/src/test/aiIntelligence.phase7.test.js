import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Mock Gemini AI Content Generator to return realistic structured outputs
vi.mock("../services/ai.service.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    generateAIContent: vi.fn(async (prompt) => {
      // If prompt asks for reply classification:
      if (prompt.includes("enterprise sales AI analyzing an inbound email reply")) {
        const bodyMatch = prompt.match(/Body:\s*([\s\S]*?)\s*Analyze the reply/);
        const replyPart = bodyMatch ? bodyMatch[1] : prompt;
        if (/wrong person/i.test(replyPart)) {
          return {
            success: true,
            data: JSON.stringify({
              category: "wrong_person",
              sentiment: "neutral",
              confidence: 0.88,
              summary: "Prospect is not the right decision maker.",
              suggestedAction: "Ask for introduction to department head.",
            }),
          };
        } else if (/calendly|schedule a meeting|book a time/i.test(replyPart)) {
          return {
            success: true,
            data: JSON.stringify({
              category: "meeting_request",
              sentiment: "positive",
              confidence: 0.96,
              summary: "Prospect requested a calendar invite for demo.",
              suggestedAction: "Send calendar invite immediately.",
            }),
          };
        } else if (/interested|tell me more|send pricing|hop on a call/i.test(replyPart)) {
          return {
            success: true,
            data: JSON.stringify({
              category: "interested",
              sentiment: "positive",
              confidence: 0.95,
              summary: "Prospect is interested in exploring pricing and requested a demo.",
              suggestedAction: "Contact prospect within 15 minutes to book a meeting.",
            }),
          };
        }
      }

      // If prompt is for 7-pillar contextual email generation:
      if (prompt.includes("7 essential context pillars")) {
        return {
          success: true,
          data: JSON.stringify({
            subject: "Boosting Acme Corp's enterprise pipeline",
            alternativeSubjects: [
              "Quick thought on Acme Corp's email deliverability",
              "10-min intro regarding outbound pipeline",
            ],
            preheader: "How Acme Corp can scale pipeline effortlessly",
            body: "Hi Jane,\n\nNoticed Acme Corp's growth in the SaaS space. Following up on my previous note regarding your deliverability, our AI platform helps teams book 3x more discovery calls.\n\nWould you be open to a 10-minute chat next Tuesday?\n\nBest,\nAlex Hunter\nColdMailer AI",
            callToAction: "Would you be open to a 10-minute chat next Tuesday?",
            personalizationInsights: "Leveraged Jane's role, Acme Corp's SaaS domain, and previous step 1 touchpoint.",
            suggestedDelayDays: 3,
          }),
        };
      }

      return {
        success: true,
        data: "Standard generated email response.",
      };
    }),
  };
});

// Import App and Models
import { app } from "../app.js";
import User from "../models/User.model.js";
import { Workspace } from "../models/Workspace.model.js";
import { Lead } from "../models/Lead.model.js";
import { Mailbox } from "../models/Mailbox.model.js";
import { Sequence } from "../models/Sequence.model.js";
import { SequenceStep } from "../models/SequenceStep.model.js";
import { SequenceEnrollment } from "../models/SequenceEnrollment.model.js";
import { Notification } from "../models/Notification.model.js";
import { SendJob } from "../models/SendJob.model.js";
import { InboundEmail } from "../models/InboundEmail.model.js";
import { processInboundEmailService } from "../services/inboundEmail.service.js";
import { registerUser } from "./helpers.js";
import { ensureDefaultWorkspaceForUser } from "../services/workspace.service.js";
import {
  assembleLeadContextService,
  generateContextualEmailService,
  batchGenerateContextualEmailsService,
} from "../services/aiIntelligence.service.js";

let testUser;
let testToken;
let testWorkspace;
let testMailbox;
let testLead;
let testSequence;
let testEnrollment;

beforeEach(async () => {
  const registered = await registerUser();
  testToken = registered.token;
  testUser = registered.res.body.data.user;

  testWorkspace = await ensureDefaultWorkspaceForUser(testUser);

  testMailbox = await Mailbox.create({
    workspaceId: testWorkspace._id,
    userId: testUser._id,
    provider: "smtp",
    email: "alex@coldmailer.ai",
    name: "Alex Hunter",
    status: "active",
    dailyLimit: 100,
  });

  await Notification.deleteMany({});
  await SendJob.deleteMany({});
  await InboundEmail.deleteMany({});
  await SequenceEnrollment.deleteMany({});
  await SequenceStep.deleteMany({});
  await Sequence.deleteMany({});
  await Lead.deleteMany({});

  // Seed Lead with rich Company Data
  testLead = await Lead.create({
    workspaceId: testWorkspace._id,
    userId: testUser._id,
    name: "Jane Doe",
    email: "jane.doe@acmecorp.com",
    jobTitle: "VP of Sales Development",
    company: {
      name: "Acme Corp",
      domain: "acmecorp.com",
      industry: "Enterprise Software",
      size: "250-500 employees",
      revenue: "$50M+",
    },
    status: "contacted",
    notes: "Met at SaaStr conference, interested in outbound scaling.",
  });

  // Seed Sequence
  testSequence = await Sequence.create({
    workspaceId: testWorkspace._id,
    userId: testUser._id,
    name: "Q4 Enterprise SaaS Campaign",
    description: "Multi-touch outbound for enterprise sales leaders",
    status: "active",
    settings: {
      stopOnReply: true,
      stopOnMeetingBooked: true,
      mailboxId: testMailbox._id,
    },
    enrollmentRules: {
      allowReenrollment: false,
      stopIfLeadStatus: ["replied", "interested", "meeting", "closed"],
    },
    stepsCount: 3,
  });

  const step1 = await SequenceStep.create({
    workspaceId: testWorkspace._id,
    sequenceId: testSequence._id,
    order: 1,
    type: "email",
    title: "Initial Value Proposition",
    delay: { value: 0, unit: "days" },
    template: {
      subject: "Accelerating Acme Corp's pipeline",
      body: "Hi Jane, quick note on your outbound deliverability.",
    },
  });

  const step2 = await SequenceStep.create({
    workspaceId: testWorkspace._id,
    sequenceId: testSequence._id,
    order: 2,
    type: "email",
    title: "Case Study & Social Proof",
    delay: { value: 3, unit: "days" },
    template: {
      subject: "Acme Corp + ColdMailer case study",
      body: "Sharing relevant metric.",
    },
  });

  // Seed Enrollment
  testEnrollment = await SequenceEnrollment.create({
    workspaceId: testWorkspace._id,
    userId: testUser._id,
    sequenceId: testSequence._id,
    leadId: testLead._id,
    mailboxId: testMailbox._id,
    status: "active",
    currentStepOrder: 2,
    currentStepId: step2._id,
    nextRunAt: new Date(Date.now() + 86400000),
  });

  // Seed prior outbound SendJob
  await SendJob.create({
    workspaceId: testWorkspace._id,
    userId: testUser._id,
    sequenceId: testSequence._id,
    stepId: step1._id,
    stepOrder: 1,
    enrollmentId: testEnrollment._id,
    leadId: testLead._id,
    mailboxId: testMailbox._id,
    status: "delivered",
    messagePayload: {
      to: testLead.email,
      subject: "Accelerating Acme Corp's pipeline",
      text: "Hi Jane, reaching out regarding outbound pipeline.",
      html: "<p>Hi Jane, reaching out regarding outbound pipeline.</p>",
    },
    providerResponse: {
      messageId: "<msg-initial-step1@acmecorp.com>",
    },
  });
});

describe("PHASE 7 — AI Intelligence Test Suite", () => {
  describe("1. AI Email Generation (7-Pillar Context Engine)", () => {
    it("assembles all 7 context pillars accurately from database records", async () => {
      const context = await assembleLeadContextService({
        leadId: testLead._id,
        workspaceId: testWorkspace._id,
        userId: testUser._id,
        sequenceId: testSequence._id,
        stepOrder: 2,
      });

      // 1. Lead Data
      expect(context.lead.name).toBe("Jane Doe");
      expect(context.lead.email).toBe("jane.doe@acmecorp.com");
      expect(context.lead.jobTitle).toBe("VP of Sales Development");
      expect(context.lead.notes).toContain("SaaStr");

      // 2. Company Information
      expect(context.company.name).toBe("Acme Corp");
      expect(context.company.industry).toBe("Enterprise Software");

      // 3. Campaign Objective
      expect(context.campaignObjective.goal).toContain("Q4 Enterprise SaaS Campaign");

      // 4. Tone
      expect(context.tone).toBe("professional");

      // 5. Sender Profile
      expect(context.senderProfile.name).toBe("Alex Hunter");
      expect(context.senderProfile.company).toBe("ColdMailer AI");

      // 6. Previous Conversation
      expect(context.previousConversation?.history?.length).toBe(1);
      expect(context.previousConversation?.history?.[0].subject).toBe("Accelerating Acme Corp's pipeline");
      expect(context.previousConversation?.history?.[0].direction).toBe("outbound");

      // 7. Sequence Context
      expect(context.sequenceContext?.sequenceName).toBe("Q4 Enterprise SaaS Campaign");
      expect(context.sequenceContext?.currentStepOrder).toBe(2);
      expect(context.sequenceContext?.totalSteps).toBe(2);
    });

    it("generates contextual email with subject variants, preheader, body, and personalization insights", async () => {
      const result = await generateContextualEmailService({
        leadId: testLead._id,
        workspaceId: testWorkspace._id,
        userId: testUser._id,
        sequenceId: testSequence._id,
        stepOrder: 2,
      });

      expect(result.subject).toBe("Boosting Acme Corp's enterprise pipeline");
      expect(result.alternativeSubjects.length).toBeGreaterThanOrEqual(2);
      expect(result.preheader).toContain("Acme Corp");
      expect(result.body).toContain("Jane");
      expect(result.callToAction).toContain("10-minute");
      expect(result.personalizationInsights).toBeDefined();
      expect(result.emailId).toBeDefined();

      // Lead emailsGeneratedCount incremented
      const updatedLead = await Lead.findById(testLead._id);
      expect(updatedLead?.emailsGeneratedCount).toBeGreaterThan(0);
    });

    it("fetches assembled 7-pillar context via GET /api/v1/email/ai-context/:leadId", async () => {
      const res = await request(app)
        .get(`/api/v1/email/ai-context/${testLead._id}`)
        .set("Authorization", `Bearer ${testToken}`)
        .query({ sequenceId: String(testSequence._id), stepOrder: 2 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lead.name).toBe("Jane Doe");
      expect(res.body.data.company.name).toBe("Acme Corp");
      expect(res.body.data.senderProfile.name).toBe("Alex Hunter");
      expect(res.body.data.previousConversation.history.length).toBe(1);
    });

    it("generates contextual email via POST /api/v1/email/ai-contextual-generate", async () => {
      const res = await request(app)
        .post("/api/v1/email/ai-contextual-generate")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          leadId: testLead._id,
          sequenceId: testSequence._id,
          stepOrder: 2,
          overrideTone: "persuasive",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subject).toBeDefined();
      expect(res.body.data.body).toContain("Acme Corp");
      expect(res.body.data.alternativeSubjects).toHaveLength(2);
    });

    it("batch generates contextual emails with individual company & history per lead", async () => {
      const lead2 = await Lead.create({
        workspaceId: testWorkspace._id,
        userId: testUser._id,
        name: "Bob Smith",
        email: "bob@beta.io",
        company: { name: "Beta Systems", industry: "Fintech" },
        status: "new",
      });

      const res = await request(app)
        .post("/api/v1/email/ai-batch-contextual-generate")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          leadIds: [testLead._id, lead2._id],
          tone: "consultative",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.successCount).toBe(2);
      expect(res.body.data.results).toHaveLength(2);
    });
  });

  describe("2. AI Reply Classification & Automated Actions (Interested -> Stop Sequence -> Notify Salesperson)", () => {
    it("classifies an incoming reply as 'interested', halts cadence, sets lead status to 'interested', and notifies salesperson", async () => {
      // Confirm sequence is currently active
      const enrollmentBefore = await SequenceEnrollment.findById(testEnrollment._id);
      expect(enrollmentBefore?.status).toBe("active");

      // Inbound reply showing interest
      const processResult = await processInboundEmailService({
        workspaceId: testWorkspace._id,
        userId: testUser._id,
        from: { name: "Jane Doe", email: "jane.doe@acmecorp.com" },
        to: "alex@coldmailer.ai",
        subject: "Re: Accelerating Acme Corp's pipeline",
        bodyText: "Hi Alex, we are definitely interested in ColdMailer! Tell me more and send over pricing details and an overview deck.",
        inReplyTo: "<msg-initial-step1@acmecorp.com>",
        source: "webhook",
      });

      // 1. Classification check
      expect(processResult.classification.category).toBe("interested");
      expect(processResult.classification.sentiment).toBe("positive");

      // 2. Lead status and tags updated
      const updatedLead = await Lead.findById(testLead._id);
      expect(updatedLead?.status).toBe("replied");
      expect(updatedLead?.tags).toContain("interested");
      expect(updatedLead?.repliesCount).toBe(1);

      // 3. Sequence halted automatically
      expect(processResult.sequenceStopped).toBe(true);
      const enrollmentAfter = await SequenceEnrollment.findById(testEnrollment._id);
      expect(enrollmentAfter?.status).toBe("stopped");
      expect(enrollmentAfter?.stopReason).toBe("replied");

      // 4. Salesperson notified automatically
      const notifications = await Notification.find({
        workspaceId: testWorkspace._id,
        userId: testUser._id,
      });

      expect(notifications.length).toBe(1);
      const notif = notifications[0];
      expect(notif.type).toBe("lead_interested");
      expect(notif.priority).toBe("urgent");
      expect(notif.title).toContain("Hot Lead Interested");
      expect(notif.title).toContain("Jane Doe");
      expect(notif.title).toContain("Acme Corp");
      expect(notif.message).toContain("positive interest");
      expect(notif.isRead).toBe(false);
    });

    it("classifies meeting requests, halts sequence, updates status to meeting, and triggers urgent notification", async () => {
      const processResult = await processInboundEmailService({
        workspaceId: testWorkspace._id,
        userId: testUser._id,
        from: { name: "Jane Doe", email: "jane.doe@acmecorp.com" },
        to: "alex@coldmailer.ai",
        subject: "Re: Demo booking",
        bodyText: "Sounds great, here is my link: calendly.com/janedoe/30min to schedule a meeting!",
        inReplyTo: "<msg-initial-step1@acmecorp.com>",
      });

      expect(processResult.classification.category).toBe("meeting_request");

      const lead = await Lead.findById(testLead._id);
      expect(lead?.status).toBe("meeting");

      const notifs = await Notification.find({ type: "meeting_request" });
      expect(notifs.length).toBe(1);
      expect(notifs[0].priority).toBe("urgent");
      expect(notifs[0].title).toContain("Meeting Request");
    });

    it("notifies salesperson on objection and wrong person classification", async () => {
      await processInboundEmailService({
        workspaceId: testWorkspace._id,
        userId: testUser._id,
        from: { name: "Jane Doe", email: "jane.doe@acmecorp.com" },
        to: "alex@coldmailer.ai",
        subject: "Re: Outreach",
        bodyText: "I am the wrong person for this. You should reach out to Mark in Engineering.",
        inReplyTo: "<msg-initial-step1@acmecorp.com>",
      });

      const notifs = await Notification.find({ type: "wrong_person" });
      expect(notifs.length).toBe(1);
      expect(notifs[0].title).toContain("Wrong Person");
    });
  });

  describe("3. In-App Salesperson Notifications API", () => {
    it("lists notifications with unread count and filters", async () => {
      // Seed notifications
      await Notification.create([
        {
          workspaceId: testWorkspace._id,
          userId: testUser._id,
          leadId: testLead._id,
          type: "lead_interested",
          title: "Hot Lead: Jane Doe",
          message: "Jane is interested",
          priority: "urgent",
          isRead: false,
        },
        {
          workspaceId: testWorkspace._id,
          userId: testUser._id,
          leadId: testLead._id,
          type: "meeting_request",
          title: "Meeting requested",
          message: "Call booked",
          priority: "urgent",
          isRead: true,
        },
      ]);

      // List all
      const listRes = await request(app)
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${testToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.total).toBe(2);
      expect(listRes.body.data.unreadCount).toBe(1);

      // Unread count endpoint
      const countRes = await request(app)
        .get("/api/v1/notifications/unread-count")
        .set("Authorization", `Bearer ${testToken}`);

      expect(countRes.status).toBe(200);
      expect(countRes.body.data.unreadCount).toBe(1);
    });

    it("marks single and all notifications as read", async () => {
      const notif1 = await Notification.create({
        workspaceId: testWorkspace._id,
        userId: testUser._id,
        leadId: testLead._id,
        type: "lead_interested",
        title: "Hot Lead 1",
        message: "Interested",
        priority: "urgent",
        isRead: false,
      });

      const notif2 = await Notification.create({
        workspaceId: testWorkspace._id,
        userId: testUser._id,
        leadId: testLead._id,
        type: "lead_interested",
        title: "Hot Lead 2",
        message: "Interested",
        priority: "urgent",
        isRead: false,
      });

      // Mark single read
      const singleRes = await request(app)
        .patch(`/api/v1/notifications/${notif1._id}/read`)
        .set("Authorization", `Bearer ${testToken}`);

      expect(singleRes.status).toBe(200);
      expect(singleRes.body.data.isRead).toBe(true);

      // Mark all read
      const allRes = await request(app)
        .patch("/api/v1/notifications/read-all")
        .set("Authorization", `Bearer ${testToken}`);

      expect(allRes.status).toBe(200);

      const checkUnread = await Notification.countDocuments({
        workspaceId: testWorkspace._id,
        isRead: false,
      });
      expect(checkUnread).toBe(0);
    });
  });
});
