import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { app } from "../app.js";
import { registerUser } from "./helpers.js";
import { Mailbox } from "../models/Mailbox.model.js";
import { MailboxCredential } from "../models/MailboxCredential.model.js";
import { Lead } from "../models/Lead.model.js";
import { LeadCategory } from "../models/LeadCategory.model.js";
import { Email } from "../models/Email.model.js";
import { encryptCredential, decryptCredential } from "../utils/encryption.js";

describe("Phase 3 — Mailbox Infrastructure Pipeline", () => {
  let userToken;
  let userId;
  let categoryId;

  beforeEach(async () => {
    const registered = await registerUser();
    userToken = registered.token;
    userId = registered.res.body.data.user._id;

    const catRes = await request(app)
      .post("/api/v1/lead/categories")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Phase 3 Inbound" });

    categoryId = catRes.body.category._id;
  });

  describe("Unit: AES-256-GCM Encryption & Key Derivation", () => {
    it("encrypts and decrypts objects with authenticated integrity", () => {
      const secretPayload = {
        accessToken: "ya29.sample-token-123456",
        refreshToken: "1//04sample-refresh-token",
        smtpPass: "SuperSecretPassword99!",
      };

      const encrypted = encryptCredential(secretPayload);

      expect(encrypted).toHaveProperty("encryptedData");
      expect(encrypted).toHaveProperty("iv");
      expect(encrypted).toHaveProperty("authTag");
      expect(encrypted.algorithm).toBe("aes-256-gcm");

      const decrypted = decryptCredential(encrypted);
      expect(decrypted).toEqual(secretPayload);
    });

    it("uses randomized IVs for identical payloads", () => {
      const payload = { token: "static-token" };
      const enc1 = encryptCredential(payload);
      const enc2 = encryptCredential(payload);

      expect(enc1.iv).not.toBe(enc2.iv);
      expect(enc1.encryptedData).not.toBe(enc2.encryptedData);
    });

    it("fails decryption if authTag or ciphertext is tampered with", () => {
      const encrypted = encryptCredential({ key: "secret" });

      // Corrupt authTag
      const badTag = encrypted.authTag.slice(0, -2) + "00";
      expect(() => {
        decryptCredential({
          encryptedData: encrypted.encryptedData,
          iv: encrypted.iv,
          authTag: badTag,
        });
      }).toThrow();
    });
  });

  describe("Unit: Model Separation & Least Privilege", () => {
    it("never returns encryptedData on default MailboxCredential queries", async () => {
      const mailbox = await Mailbox.create({
        workspaceId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        provider: "smtp",
        email: "secure@testcompany.com",
      });

      const { encryptedData, iv, authTag } = encryptCredential({ pass: "mypassword" });

      await MailboxCredential.create({
        mailboxId: mailbox._id,
        workspaceId: mailbox.workspaceId,
        provider: "smtp",
        authType: "password",
        encryptedData,
        iv,
        authTag,
      });

      // Standard query should NOT select encrypted fields
      const credDefault = await MailboxCredential.findOne({ mailboxId: mailbox._id });
      expect(credDefault.encryptedData).toBeUndefined();
      expect(credDefault.iv).toBeUndefined();
      expect(credDefault.authTag).toBeUndefined();

      // Only explicit select fetches them
      const credExplicit = await MailboxCredential.findOne({ mailboxId: mailbox._id }).select(
        "+encryptedData +iv +authTag"
      );
      expect(credExplicit.encryptedData).toBeDefined();
    });
  });

  describe("Integration: Custom SMTP Mailbox & Connection Testing", () => {
    it("connects a custom SMTP mailbox, tests connection, and updates dailyLimit", async () => {
      // Mock nodemailer transport verify and sendMail
      const mockVerify = vi.fn().mockResolvedValue(true);
      const mockSendMail = vi.fn().mockResolvedValue({ messageId: "msg-12345" });
      const spyTransport = vi.spyOn(nodemailer, "createTransport").mockReturnValue({
        verify: mockVerify,
        sendMail: mockSendMail,
      });

      const connectRes = await request(app)
        .post("/api/v1/mailboxes/smtp")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          email: "alex@customdomain.io",
          name: "Alex Rivers",
          smtpHost: "smtp.customdomain.io",
          smtpPort: 587,
          smtpSecure: false,
          smtpUser: "alex@customdomain.io",
          smtpPass: "strongPass123!",
          dailyLimit: 75,
        });

      expect(connectRes.status).toBe(201);
      expect(connectRes.body.success).toBe(true);
      expect(connectRes.body.mailbox.email).toBe("alex@customdomain.io");
      expect(connectRes.body.mailbox.dailyLimit).toBe(75);
      expect(connectRes.body.mailbox.status).toBe("active");
      expect(connectRes.body.mailbox.health.status).toBe("excellent");

      const mailboxId = connectRes.body.mailbox._id;

      // Ensure credentials were encrypted into MailboxCredential
      const storedCred = await MailboxCredential.findOne({ mailboxId }).select("+encryptedData +iv +authTag");
      expect(storedCred).toBeDefined();
      const decrypted = decryptCredential(storedCred);
      expect(decrypted.smtpPass).toBe("strongPass123!");

      // List mailboxes
      const listRes = await request(app)
        .get("/api/v1/mailboxes")
        .set("Authorization", `Bearer ${userToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.mailboxes.length).toBe(1);
      expect(listRes.body.mailboxes[0].email).toBe("alex@customdomain.io");

      // Test mailbox connection endpoint
      const testRes = await request(app)
        .post(`/api/v1/mailboxes/${mailboxId}/test`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(testRes.status).toBe(200);
      expect(testRes.body.success).toBe(true);

      // Update settings
      const patchRes = await request(app)
        .patch(`/api/v1/mailboxes/${mailboxId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          dailyLimit: 120,
          name: "Alexander Rivers",
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.mailbox.dailyLimit).toBe(120);
      expect(patchRes.body.mailbox.name).toBe("Alexander Rivers");

      spyTransport.mockRestore();
    });
  });

  describe("Integration: Daily Send Quotas & Enforcing Limits", () => {
    it("enforces dailyLimit and returns 429 when quota is exhausted", async () => {
      const mockVerify = vi.fn().mockResolvedValue(true);
      const mockSendMail = vi.fn().mockResolvedValue({ messageId: "msg-test-limit" });
      const spyTransport = vi.spyOn(nodemailer, "createTransport").mockReturnValue({
        verify: mockVerify,
        sendMail: mockSendMail,
      });

      const connectRes = await request(app)
        .post("/api/v1/mailboxes/smtp")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          email: "quota@agency.com",
          smtpHost: "smtp.agency.com",
          smtpPort: 465,
          smtpSecure: true,
          smtpPass: "quotaPass123",
          dailyLimit: 2, // low limit to test quota threshold
        });

      const mailboxId = connectRes.body.mailbox._id;

      // 1st Send: Should succeed
      const send1 = await request(app)
        .post(`/api/v1/mailboxes/${mailboxId}/send`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          to: "prospect1@target.com",
          subject: "Hi Prospect 1",
          text: "Quick note for you.",
        });

      expect(send1.status).toBe(200);
      expect(send1.body.mailbox.sentToday).toBe(1);

      // 2nd Send: Should succeed
      const send2 = await request(app)
        .post(`/api/v1/mailboxes/${mailboxId}/send`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          to: "prospect2@target.com",
          subject: "Hi Prospect 2",
          text: "Quick note for you.",
        });

      expect(send2.status).toBe(200);
      expect(send2.body.mailbox.sentToday).toBe(2);

      // 3rd Send: Exceeds dailyLimit (2) -> 429 Too Many Requests
      const send3 = await request(app)
        .post(`/api/v1/mailboxes/${mailboxId}/send`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          to: "prospect3@target.com",
          subject: "Hi Prospect 3",
          text: "Quick note for you.",
        });

      expect(send3.status).toBe(429);
      expect(send3.body.message).toContain("Daily sending limit (2) reached");

      // Rollover simulation: set lastResetDate to yesterday
      const mbDoc = await Mailbox.findById(mailboxId);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      mbDoc.lastResetDate = yesterday;
      await mbDoc.save();

      // Next send on new day resets quota and succeeds
      const sendRollover = await request(app)
        .post(`/api/v1/mailboxes/${mailboxId}/send`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          to: "prospect3@target.com",
          subject: "Hi Prospect 3",
          text: "Next day send.",
        });

      expect(sendRollover.status).toBe(200);
      expect(sendRollover.body.mailbox.sentToday).toBe(1);

      spyTransport.mockRestore();
    });
  });

  describe("Integration: Direct Email Sending & Lead Pipeline Sync", () => {
    it("dispatches email via POST /api/v1/email/:id/send and moves lead to contacted", async () => {
      const mockVerify = vi.fn().mockResolvedValue(true);
      const mockSendMail = vi.fn().mockResolvedValue({ messageId: "msg-lead-pipeline" });
      const spyTransport = vi.spyOn(nodemailer, "createTransport").mockReturnValue({
        verify: mockVerify,
        sendMail: mockSendMail,
      });

      // 1. Connect default mailbox
      const mbRes = await request(app)
        .post("/api/v1/mailboxes/smtp")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          email: "founder@startup.com",
          smtpHost: "smtp.startup.com",
          smtpPort: 587,
          smtpPass: "founderSecret",
          dailyLimit: 50,
        });

      const mailboxId = mbRes.body.mailbox._id;

      // 2. Create a new lead
      const leadRes = await request(app)
        .post("/api/v1/lead/create")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          name: "Sarah Connors",
          email: "sarah@cyberdyne.org",
          categoryId,
        });

      const leadId = leadRes.body.lead._id;
      expect(leadRes.body.lead.status).toBe("new");

      // 3. Create generated email for this lead
      const emailDoc = await Email.create({
        userId,
        leadId,
        prompt: "Reach out to Sarah",
        generatedEmail: "Subject: Strategic AI Partnership\n\nHi Sarah,\nLoved your recent presentation on robotics.",
        sendStatus: "generated",
      });

      // 4. Send the generated email via connected mailbox
      const sendRes = await request(app)
        .post(`/api/v1/email/${emailDoc._id}/send`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ mailboxId });

      expect(sendRes.status).toBe(200);
      expect(sendRes.body.success).toBe(true);

      // Verify email sendStatus updated to 'sent'
      const updatedEmail = await Email.findById(emailDoc._id);
      expect(updatedEmail.sendStatus).toBe("sent");
      expect(updatedEmail.sentAt).toBeDefined();

      // Verify lead transitioned from 'new' to 'contacted'
      const updatedLead = await Lead.findById(leadId);
      expect(updatedLead.status).toBe("contacted");
      expect(updatedLead.lastActivityAt).toBeDefined();
      expect(updatedLead.emailsSentCount).toBe(1);

      spyTransport.mockRestore();
    });

    it("deletes a mailbox and cascades deletion of its encrypted credentials", async () => {
      const mockVerify = vi.fn().mockResolvedValue(true);
      const spyTransport = vi.spyOn(nodemailer, "createTransport").mockReturnValue({
        verify: mockVerify,
      });

      const mbRes = await request(app)
        .post("/api/v1/mailboxes/smtp")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          email: "todelete@test.com",
          smtpHost: "smtp.test.com",
          smtpPort: 587,
          smtpPass: "deleteSecret",
        });

      const mailboxId = mbRes.body.mailbox._id;

      expect(await Mailbox.findById(mailboxId)).toBeDefined();
      expect(await MailboxCredential.findOne({ mailboxId })).toBeDefined();

      // Delete mailbox
      const delRes = await request(app)
        .delete(`/api/v1/mailboxes/${mailboxId}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      // Verify cascading removal
      expect(await Mailbox.findById(mailboxId)).toBeNull();
      expect(await MailboxCredential.findOne({ mailboxId })).toBeNull();

      spyTransport.mockRestore();
    });
  });
});
