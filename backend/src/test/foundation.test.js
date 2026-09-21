import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { registerUser } from "./helpers.js";
import { Lead } from "../models/Lead.model.js";
import { Workspace } from "../models/Workspace.model.js";

describe("Phase 0: Production Foundation", () => {
  describe("Observability & Request IDs", () => {
    it("returns X-Request-Id header on all requests", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.headers["x-request-id"]).toBeDefined();
      expect(typeof res.headers["x-request-id"]).toBe("string");
      expect(res.body.status).toBe("ok");
      expect(res.body.uptimeSeconds).toBeDefined();
    });

    it("returns system metrics at /api/v1/system/metrics", async () => {
      const res = await request(app).get("/api/v1/system/metrics");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.memory).toBeDefined();
      expect(res.body.data.jobs).toBeDefined();
    });

    it("propagates client supplied X-Request-Id", async () => {
      const customId = "trace-custom-uuid-1234";
      const res = await request(app)
        .get("/health")
        .set("X-Request-Id", customId);
      expect(res.headers["x-request-id"]).toBe(customId);
    });
  });

  describe("Workspace Architecture & Multi-Tenancy", () => {
    it("auto-provisions a default workspace for a registered user", async () => {
      const { token } = await registerUser();

      const res = await request(app)
        .get("/api/v1/workspaces")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.workspaces.length).toBeGreaterThanOrEqual(1);

      const defaultWorkspace = res.body.workspaces[0];
      expect(defaultWorkspace.isDefault).toBe(true);
      expect(defaultWorkspace.name).toContain("Workspace");
      expect(defaultWorkspace.members[0].role).toBe("owner");
    });

    it("allows creating and switching to a secondary workspace", async () => {
      const { token } = await registerUser();

      // Create new workspace
      const createRes = await request(app)
        .post("/api/v1/workspaces")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Acme Sales Team" });

      expect(createRes.status).toBe(201);
      expect(createRes.body.workspace.name).toBe("Acme Sales Team");
      const newWsId = createRes.body.workspace._id;

      // Switch active workspace
      const switchRes = await request(app)
        .patch(`/api/v1/workspaces/${newWsId}/switch`)
        .set("Authorization", `Bearer ${token}`);

      expect(switchRes.status).toBe(200);
      expect(switchRes.body.success).toBe(true);
      expect(switchRes.body.activeWorkspaceId).toBe(newWsId);
    });

    it("attaches workspaceId, createdBy, and assignedTo when creating leads", async () => {
      const { token } = await registerUser();

      // Get user's default workspace
      const wsRes = await request(app)
        .get("/api/v1/workspaces")
        .set("Authorization", `Bearer ${token}`);
      const workspaceId = wsRes.body.workspaces[0]._id;

      // Get category ID
      const catRes = await request(app)
        .get("/api/v1/lead/categories")
        .set("Authorization", `Bearer ${token}`);
      const categoryId = catRes.body.categories[0]._id;

      // Create lead
      const leadRes = await request(app)
        .post("/api/v1/lead/create")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Workspace-Id", workspaceId)
        .send({
          name: "Sarah Connor",
          company: "Cyberdyne",
          email: "sarah@cyberdyne.com",
          role: "Director of Security",
          categoryId
        });

      expect(leadRes.status).toBe(201);
      expect(leadRes.body.success).toBe(true);

      const dbLead = await Lead.findById(leadRes.body.lead._id);
      expect(dbLead).toBeDefined();
      expect(String(dbLead.workspaceId)).toBe(String(workspaceId));
      expect(dbLead.createdBy).toBeDefined();
      expect(dbLead.assignedTo).toBeDefined();
    });
  });

  describe("Enterprise Idempotency", () => {
    it("replays cached response when an identical Idempotency-Key is provided", async () => {
      const { token } = await registerUser();
      const idempotencyKey = `idem-key-${Date.now()}`;

      const catRes = await request(app)
        .get("/api/v1/lead/categories")
        .set("Authorization", `Bearer ${token}`);
      const categoryId = catRes.body.categories[0]._id;

      const leadPayload = {
        name: "John Wick",
        company: "Continental",
        email: "wick@continental.com",
        categoryId
      };

      // 1. Initial request
      const firstRes = await request(app)
        .post("/api/v1/lead/create")
        .set("Authorization", `Bearer ${token}`)
        .set("Idempotency-Key", idempotencyKey)
        .send(leadPayload);

      expect(firstRes.status).toBe(201);
      expect(firstRes.body.success).toBe(true);
      const createdLeadId = firstRes.body.lead._id;

      // 2. Immediate identical retry with same Idempotency-Key
      const secondRes = await request(app)
        .post("/api/v1/lead/create")
        .set("Authorization", `Bearer ${token}`)
        .set("Idempotency-Key", idempotencyKey)
        .send(leadPayload);

      expect(secondRes.status).toBe(201);
      expect(secondRes.headers["idempotent-replayed"]).toBe("true");
      expect(secondRes.headers["x-cache"]).toBe("IDEMPOTENT-HIT");
      expect(secondRes.body.lead._id).toBe(createdLeadId);

      // Verify only 1 lead document was actually created in MongoDB
      const count = await Lead.countDocuments({ email: "wick@continental.com" });
      expect(count).toBe(1);
    });
  });
});
