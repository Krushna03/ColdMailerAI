import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../app.js";

describe("contact form", () => {
  it("accepts a valid submission", async () => {
    const res = await request(app)
      .post("/api/v1/contact/new-contact")
      .send({ name: "Jane", email: "jane@example.com", message: "Hello there" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("rejects a submission with missing fields", async () => {
    const res = await request(app)
      .post("/api/v1/contact/new-contact")
      .send({ name: "Jane" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
