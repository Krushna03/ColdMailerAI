import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { app } from "../app.js";
import { registerUser } from "./helpers.js";
import { Lead } from "../models/Lead.model.js";
import { LeadCategory } from "../models/LeadCategory.model.js";
import { ImportJob } from "../models/ImportJob.model.js";
import {
  validateSyntax,
  isDisposableDomain,
  verifyEmailAddress,
} from "../services/emailVerification.service.js";

describe("Phase 2 — Email Verification & Deliverability Pipeline", () => {
  let userToken;
  let categoryId;

  beforeEach(async () => {
    const { token } = await registerUser();
    userToken = token;

    const catRes = await request(app)
      .post("/api/v1/lead/categories")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Phase2 Testing" });

    categoryId = catRes.body.category._id;
  });

  describe("Unit: Email Verification Service", () => {
    it("validates RFC 5322 syntax correctly", () => {
      expect(validateSyntax("test@example.com")).toBe(true);
      expect(validateSyntax("john.doe+tag@company.co.uk")).toBe(true);
      expect(validateSyntax("plainaddress")).toBe(false);
      expect(validateSyntax("@missingusername.com")).toBe(false);
      expect(validateSyntax("username@.com")).toBe(false);
      expect(validateSyntax("user@domain..com")).toBe(false);
      expect(validateSyntax("")).toBe(false);
      expect(validateSyntax(null)).toBe(false);
    });

    it("identifies disposable email domains", () => {
      expect(isDisposableDomain("mailinator.com")).toBe(true);
      expect(isDisposableDomain("tempmail.com")).toBe(true);
      expect(isDisposableDomain("10minutemail.com")).toBe(true);
      expect(isDisposableDomain("guerrillamail.com")).toBe(true);
      expect(isDisposableDomain("GMAIL.COM")).toBe(false);
      expect(isDisposableDomain("company.org")).toBe(false);
    });

    it("verifies disposable address with score 0 and disposable status", async () => {
      const result = await verifyEmailAddress("spammer@mailinator.com");
      expect(result.status).toBe("disposable");
      expect(result.score).toBe(0);
      expect(result.reason).toContain("Disposable");
    });

    it("verifies malformed syntax with score 0 and invalid status", async () => {
      const result = await verifyEmailAddress("not-an-email");
      expect(result.status).toBe("invalid");
      expect(result.score).toBe(0);
      expect(result.reason).toContain("Syntax");
    });

    it("flags non-existent domain as invalid with no MX records", async () => {
      const result = await verifyEmailAddress("nobody@domain-that-definitely-does-not-exist-xyz-987.org");
      expect(result.status).toBe("invalid");
      expect(result.score).toBe(0);
      expect(result.reason).toContain("MX");
    });
  });

  describe("Integration: Single Lead On-Demand Verification", () => {
    it("verifies a lead email on-demand via POST /:leadId/verify-email", async () => {
      const createRes = await request(app)
        .post("/api/v1/lead/create")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          name: "Test User",
          email: "test@mailinator.com",
          categoryId,
        });

      expect(createRes.status).toBe(201);
      const leadId = createRes.body.lead._id;

      // Initial verification status should be 'unknown'
      expect(createRes.body.lead.emailVerification.status).toBe("unknown");

      // Trigger on-demand verification
      const verifyRes = await request(app)
        .post(`/api/v1/lead/${leadId}/verify-email`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.verification.status).toBe("disposable");
      expect(verifyRes.body.verification.score).toBe(0);

      // Verify persistence in DB
      const dbLead = await Lead.findById(leadId);
      expect(dbLead.emailVerification.status).toBe("disposable");
      expect(dbLead.emailVerification.checkedAt).toBeDefined();
    });

    it("returns 404 when verifying non-existent lead", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/v1/lead/${fakeId}/verify-email`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe("Integration: Asynchronous Lead Import Job Pipeline", () => {
    it("creates an ImportJob and processes leads in background", async () => {
      const leadsToImport = [
        {
          name: "Alice Valid",
          email: "alice@gmail.com",
          company: "Acme",
        },
        {
          name: "Bob Disposable",
          email: "bob@tempmail.com",
          company: "TempCo",
        },
        {
          name: "Charlie Invalid",
          email: "charlie-no-domain",
          company: "Broken",
        },
      ];

      const createJobRes = await request(app)
        .post("/api/v1/lead/import-job")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          leads: leadsToImport,
          categoryId,
          verifyEmails: true,
        });

      expect(createJobRes.status).toBe(201);
      expect(createJobRes.body.success).toBe(true);
      const jobId = createJobRes.body.job._id;
      expect(jobId).toBeDefined();
      expect(createJobRes.body.job.totalRows).toBe(3);

      // Allow background worker pool to finish (setImmediate + async checks)
      let jobStatus;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 200));
        const statusRes = await request(app)
          .get(`/api/v1/lead/import-jobs/${jobId}`)
          .set("Authorization", `Bearer ${userToken}`);

        jobStatus = statusRes.body.job;
        if (jobStatus.status === "completed" || jobStatus.status === "completed_with_errors") {
          break;
        }
      }

      expect(["completed", "completed_with_errors"]).toContain(jobStatus.status);
      expect(jobStatus.processedRows).toBe(3);
      expect(jobStatus.disposableCount).toBeGreaterThanOrEqual(1);

      // Verify leads exist in DB
      const insertedLeads = await Lead.find({ categoryId });
      expect(insertedLeads.length).toBeGreaterThanOrEqual(2);

      const disposableLead = insertedLeads.find((l) => l.email === "bob@tempmail.com");
      expect(disposableLead).toBeDefined();
      expect(disposableLead.emailVerification.status).toBe("disposable");
    });

    it("prevents inserting category-level duplicates during import job", async () => {
      // First, create an existing lead
      await request(app)
        .post("/api/v1/lead/create")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          name: "Original User",
          email: "duplicate@example.com",
          categoryId,
        });

      // Attempt to import the same email
      const createJobRes = await request(app)
        .post("/api/v1/lead/import-job")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          leads: [
            {
              name: "Duplicate User",
              email: "duplicate@example.com",
            },
            {
              name: "Brand New User",
              email: "newuser@example.com",
            },
          ],
          categoryId,
          verifyEmails: false,
        });

      const jobId = createJobRes.body.job._id;

      let jobStatus;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 150));
        const statusRes = await request(app)
          .get(`/api/v1/lead/import-jobs/${jobId}`)
          .set("Authorization", `Bearer ${userToken}`);

        jobStatus = statusRes.body.job;
        if (jobStatus.status === "completed" || jobStatus.status === "completed_with_errors") {
          break;
        }
      }

      expect(jobStatus.status).toBe("completed");
      expect(jobStatus.duplicateCount).toBe(1);
      expect(jobStatus.insertedCount).toBe(1);
    });

    it("lists import jobs with listImportJobs", async () => {
      const listRes = await request(app)
        .get("/api/v1/lead/import-jobs")
        .set("Authorization", `Bearer ${userToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(Array.isArray(listRes.body.jobs)).toBe(true);
    });

    it("filters leads by verification status in GET /get-user-leads", async () => {
      // Create one valid and one disposable lead directly in DB
      await Lead.create({
        name: "Verified Lead",
        email: "verified@example.com",
        categoryId,
        userId: new mongoose.Types.ObjectId(), // Will be overwritten or query by workspace
        emailVerification: {
          status: "valid",
          score: 95,
          checkedAt: new Date(),
        },
      });

      // Create via API so auth user owns it
      const createLeadRes = await request(app)
        .post("/api/v1/lead/create")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          name: "API Created Lead",
          email: "api@tempmail.com",
          categoryId,
        });

      const leadId = createLeadRes.body.lead._id;
      // Mark as disposable
      await request(app)
        .post(`/api/v1/lead/${leadId}/verify-email`)
        .set("Authorization", `Bearer ${userToken}`);

      // Query with verificationStatus=disposable
      const filterRes = await request(app)
        .get("/api/v1/lead/get-user-leads?verificationStatus=disposable")
        .set("Authorization", `Bearer ${userToken}`);

      expect(filterRes.status).toBe(200);
      expect(filterRes.body.leads.length).toBe(1);
      expect(filterRes.body.leads[0].emailVerification.status).toBe("disposable");

      // Query with verificationStatus=valid
      const validFilterRes = await request(app)
        .get("/api/v1/lead/get-user-leads?verificationStatus=valid")
        .set("Authorization", `Bearer ${userToken}`);

      expect(validFilterRes.status).toBe(200);
      expect(validFilterRes.body.leads.length).toBe(0);
    });
  });
});
