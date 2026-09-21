import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/ai.service.js", () => ({
  generateAIContent: vi.fn(),
  generateAIContentWithRole: vi.fn()
}));

import request from "supertest";
import mongoose from "mongoose";
import { app } from "../app.js";
import { registerUser } from "./helpers.js";

const getDefaultCategoryId = async (token) => {
  const res = await request(app)
    .get("/api/v1/lead/categories")
    .set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  return res.body.categories[0]._id;
};

describe("Phase 1: Enterprise Lead Data, Multi-Tags & Dynamic Segments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a lead with flexible enterprise fields and customFields", async () => {
    const { token } = await registerUser({ email: "enterprise_lead@example.com" });
    const categoryId = await getDefaultCategoryId(token);

    const payload = {
      name: "Satya Nadella",
      email: "satya@microsoft.com",
      phone: "+1-425-882-8080",
      company: {
        name: "Microsoft",
        domain: "microsoft.com",
        industry: "Enterprise Software",
        size: "10000+",
        revenue: "$200B"
      },
      jobTitle: "Chairman and CEO",
      linkedinUrl: "https://linkedin.com/in/satyanadella",
      location: "Redmond, WA",
      timezone: "America/Los_Angeles",
      customFields: {
        companyTech: "Azure & OpenAI",
        employeeCount: 220000,
        fundingStage: "Public"
      },
      tags: ["Enterprise", "SaaS", "Decision Maker", "Cloud"],
      source: "manual",
      notes: "Met at cloud summit",
      categoryId
    };

    const res = await request(app)
      .post("/api/v1/lead/create")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(201);
    const lead = res.body.lead;
    expect(lead.name).toBe("Satya Nadella");
    expect(lead.email).toBe("satya@microsoft.com");
    expect(lead.phone).toBe("+1-425-882-8080");
    expect(lead.company.name).toBe("Microsoft");
    expect(lead.company.domain).toBe("microsoft.com");
    expect(lead.company.industry).toBe("Enterprise Software");
    expect(lead.company.size).toBe("10000+");
    expect(lead.jobTitle).toBe("Chairman and CEO");
    expect(lead.role).toBe("Chairman and CEO"); // Auto-mirrored
    expect(lead.linkedinUrl).toBe("https://linkedin.com/in/satyanadella");
    expect(lead.location).toBe("Redmond, WA");
    expect(lead.timezone).toBe("America/Los_Angeles");
    expect(lead.customFields.companyTech).toBe("Azure & OpenAI");
    expect(lead.customFields.employeeCount).toBe(220000);
    expect(lead.tags).toEqual(
      expect.arrayContaining(["Enterprise", "SaaS", "Decision Maker", "Cloud"])
    );
  });

  it("guarantees backward compatibility: accepts string company and flat role", async () => {
    const { token } = await registerUser({ email: "legacy_lead@example.com" });
    const categoryId = await getDefaultCategoryId(token);

    const legacyPayload = {
      name: "Sarah Connor",
      company: "Cyberdyne Systems",
      role: "Security Officer",
      email: "sarah@cyberdyne.com",
      notes: "Looking into AI risk",
      categoryId
    };

    const res = await request(app)
      .post("/api/v1/lead/create")
      .set("Authorization", `Bearer ${token}`)
      .send(legacyPayload);

    expect(res.status).toBe(201);
    const lead = res.body.lead;
    expect(lead.name).toBe("Sarah Connor");
    expect(lead.company.name).toBe("Cyberdyne Systems");
    expect(lead.role).toBe("Security Officer");
    expect(lead.jobTitle).toBe("Security Officer"); // Auto-mirrored
    expect(lead.tags).toEqual([]);
    expect(lead.customFields).toEqual({});
  });

  it("updates enterprise fields and merges customFields cleanly", async () => {
    const { token } = await registerUser({ email: "update_enterprise@example.com" });
    const categoryId = await getDefaultCategoryId(token);

    const created = await request(app)
      .post("/api/v1/lead/create")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Marc Benioff",
        company: { name: "Salesforce", industry: "CRM" },
        jobTitle: "CEO",
        email: "marc@salesforce.com",
        categoryId,
        customFields: { stage: "Growth" },
        tags: ["SaaS"]
      });

    const leadId = created.body.lead._id;

    const updateRes = await request(app)
      .patch(`/api/v1/lead/${leadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        company: { size: "50000+", domain: "salesforce.com" },
        customFields: { cloudVendor: "AWS" },
        tags: ["SaaS", "Enterprise", "Fortune 500"],
        phone: "+14155551234"
      });

    expect(updateRes.status).toBe(200);
    const updated = updateRes.body.lead;
    expect(updated.company.name).toBe("Salesforce");
    expect(updated.company.industry).toBe("CRM");
    expect(updated.company.domain).toBe("salesforce.com");
    expect(updated.company.size).toBe("50000+");
    expect(updated.customFields.stage).toBe("Growth");
    expect(updated.customFields.cloudVendor).toBe("AWS");
    expect(updated.tags).toEqual(
      expect.arrayContaining(["SaaS", "Enterprise", "Fortune 500"])
    );
    expect(updated.phone).toBe("+14155551234");
  });

  it("updates legacy leads with raw primitive string company in MongoDB without validation error", async () => {
    const { token, res: regRes } = await registerUser({ email: "legacy_mongo_raw@example.com" });
    const userId = regRes.body.data.user._id;
    const categoryId = await getDefaultCategoryId(token);

    // Directly insert raw document into MongoDB collection with string company (pre-Phase 1 data)
    const rawResult = await mongoose.connection.collection("leads").insertOne({
      name: "Alex Morgan",
      company: "BrightEdge Media",
      role: "Marketing VP",
      email: "alex.morgan@brightedge.com",
      userId: new mongoose.Types.ObjectId(userId),
      categoryId: new mongoose.Types.ObjectId(categoryId),
      status: "new",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const leadId = rawResult.insertedId.toString();

    // Now update via API
    const updateRes = await request(app)
      .patch(`/api/v1/lead/${leadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        company: {
          name: "BrightEdge Media",
          domain: "brightedge.com",
          industry: "Media",
          size: "50-200",
          revenue: "$10M"
        },
        jobTitle: "VP Marketing",
        notes: "Updated legacy lead"
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.lead.name).toBe("Alex Morgan");
    expect(updateRes.body.lead.company.name).toBe("BrightEdge Media");
    expect(updateRes.body.lead.company.domain).toBe("brightedge.com");
    expect(updateRes.body.lead.jobTitle).toBe("VP Marketing");
  });

  it("manages tags: retrieves distinct tags and bulk tags leads", async () => {
    const { token } = await registerUser({ email: "tag_manager@example.com" });
    const categoryId = await getDefaultCategoryId(token);

    const l1 = await request(app)
      .post("/api/v1/lead/create")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Lead One",
        categoryId,
        tags: ["Fintech", "India", "Series A"]
      });

    const l2 = await request(app)
      .post("/api/v1/lead/create")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Lead Two",
        categoryId,
        tags: ["Healthtech", "India", "Seed"]
      });

    // List distinct tags
    const tagsRes = await request(app)
      .get("/api/v1/lead/tags")
      .set("Authorization", `Bearer ${token}`);

    expect(tagsRes.status).toBe(200);
    expect(tagsRes.body.tags).toEqual(
      expect.arrayContaining(["Fintech", "Healthtech", "India", "Seed", "Series A"])
    );

    // Bulk tag: add "Priority"
    const bulkTagRes = await request(app)
      .post("/api/v1/lead/bulk-tag")
      .set("Authorization", `Bearer ${token}`)
      .send({
        leadIds: [l1.body.lead._id, l2.body.lead._id],
        tags: ["Priority"],
        action: "add"
      });

    expect(bulkTagRes.status).toBe(200);
    expect(bulkTagRes.body.modifiedCount).toBe(2);

    // Filter leads by tag
    const filterRes = await request(app)
      .get("/api/v1/lead/get-user-leads?tags=Fintech")
      .set("Authorization", `Bearer ${token}`);

    expect(filterRes.status).toBe(200);
    expect(filterRes.body.leads.length).toBe(1);
    expect(filterRes.body.leads[0].name).toBe("Lead One");

    // Bulk tag: remove "Priority"
    const removeTagRes = await request(app)
      .post("/api/v1/lead/bulk-tag")
      .set("Authorization", `Bearer ${token}`)
      .send({
        leadIds: [l1.body.lead._id],
        tags: ["Priority"],
        action: "remove"
      });

    expect(removeTagRes.status).toBe(200);
    expect(removeTagRes.body.modifiedCount).toBe(1);
  });

  it("handles dynamic saved segments with live query evaluation", async () => {
    const { token } = await registerUser({ email: "segments_test@example.com" });
    const categoryId = await getDefaultCategoryId(token);

    // Create 3 leads with different attributes
    await request(app)
      .post("/api/v1/lead/create")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Alex Karp",
        jobTitle: "CEO",
        company: { name: "Palantir", industry: "SaaS" },
        status: "new",
        tags: ["Enterprise", "AI"],
        categoryId
      });

    await request(app)
      .post("/api/v1/lead/create")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Brian Chesky",
        jobTitle: "Founder & CEO",
        company: { name: "Airbnb", industry: "Hospitality" },
        status: "contacted",
        tags: ["Travel"],
        categoryId
      });

    await request(app)
      .post("/api/v1/lead/create")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Stewart Butterfield",
        jobTitle: "Founder & CEO",
        company: { name: "Slack", industry: "SaaS" },
        status: "new",
        tags: ["Collaboration"],
        categoryId
      });

    // 1. Preview a segment query before saving
    const previewRes = await request(app)
      .post("/api/v1/segments/preview")
      .set("Authorization", `Bearer ${token}`)
      .send({
        filters: {
          jobTitle: ["CEO"],
          industry: ["SaaS"],
          status: ["new"]
        }
      });

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.totalMatching).toBe(2);
    expect(previewRes.body.sampleLeads.length).toBe(2);

    // 2. Save the segment: "All CEOs in SaaS companies who are new"
    const createSegRes = await request(app)
      .post("/api/v1/segments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "SaaS CEOs (New)",
        description: "All CEOs in SaaS companies with new status",
        color: "purple",
        filters: {
          jobTitle: ["CEO"],
          industry: ["SaaS"],
          status: ["new"]
        }
      });

    expect(createSegRes.status).toBe(201);
    const segment = createSegRes.body.segment;
    expect(segment.name).toBe("SaaS CEOs (New)");
    expect(segment.leadCount).toBe(2);
    // CRITICAL: Ensure leads are NOT stored statically in the segment document
    expect(segment.leads).toBeUndefined();
    expect(segment.leadIds).toBeUndefined();

    // 3. List all segments: live leadCount should be returned
    const listRes = await request(app)
      .get("/api/v1/segments")
      .set("Authorization", `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.segments.length).toBe(1);
    expect(listRes.body.segments[0].leadCount).toBe(2);

    // 4. Fetch dynamic leads for segment via segment endpoint
    const leadsSegRes = await request(app)
      .get(`/api/v1/segments/${segment._id}/leads`)
      .set("Authorization", `Bearer ${token}`);

    expect(leadsSegRes.status).toBe(200);
    expect(leadsSegRes.body.total).toBe(2);
    const names = leadsSegRes.body.leads.map((l) => l.name);
    expect(names).toContain("Alex Karp");
    expect(names).toContain("Stewart Butterfield");
    expect(names).not.toContain("Brian Chesky");

    // 5. Query leads via getUserLeads using segmentId parameter
    const queryBySegRes = await request(app)
      .get(`/api/v1/lead/get-user-leads?segmentId=${segment._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(queryBySegRes.status).toBe(200);
    expect(queryBySegRes.body.total).toBe(2);

    // 6. Demonstrate dynamic evaluation: Add another matching lead
    await request(app)
      .post("/api/v1/lead/create")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Dylan Field",
        jobTitle: "CEO",
        company: { name: "Figma", industry: "SaaS" },
        status: "new",
        categoryId
      });

    // Re-check segment list: count dynamically increases to 3 without updating the segment!
    const recheckedList = await request(app)
      .get("/api/v1/segments")
      .set("Authorization", `Bearer ${token}`);

    expect(recheckedList.status).toBe(200);
    expect(recheckedList.body.segments[0].leadCount).toBe(3);

    // 7. Update segment
    const updateSegRes = await request(app)
      .patch(`/api/v1/segments/${segment._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "High Priority SaaS CEOs",
        color: "emerald"
      });

    expect(updateSegRes.status).toBe(200);
    expect(updateSegRes.body.segment.name).toBe("High Priority SaaS CEOs");
    expect(updateSegRes.body.segment.color).toBe("emerald");

    // 8. Delete segment
    const delSegRes = await request(app)
      .delete(`/api/v1/segments/${segment._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(delSegRes.status).toBe(200);

    const postDelList = await request(app)
      .get("/api/v1/segments")
      .set("Authorization", `Bearer ${token}`);

    expect(postDelList.body.segments.length).toBe(0);
  });
});
