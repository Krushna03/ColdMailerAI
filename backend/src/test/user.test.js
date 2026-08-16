import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { registerUser } from "./helpers.js";

describe("user registration", () => {
  it("registers a new user with a lowercase email and returns a token", async () => {
    const { res } = await registerUser({ email: "  Reg@Example.COM  " });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe("reg@example.com");
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it("rejects a short password with 400", async () => {
    const res = await request(app)
      .post("/api/v1/user/register")
      .send({ username: "abc", email: "shortpw@example.com", password: "12" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects a duplicate email with 409", async () => {
    await registerUser({ email: "dup@example.com" });
    const res = await request(app)
      .post("/api/v1/user/register")
      .send({ username: "second", email: "DUP@EXAMPLE.COM", password: "password123" });
    expect(res.status).toBe(409);
  });
});

describe("user login", () => {
  it("logs in with correct credentials", async () => {
    await registerUser({ email: "login@example.com", password: "password123" });
    const res = await request(app)
      .post("/api/v1/user/login")
      .send({ email: "LOGIN@EXAMPLE.COM", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe("login@example.com");
  });

  it("rejects a wrong password with 401", async () => {
    await registerUser({ email: "wrongpw@example.com", password: "password123" });
    const res = await request(app)
      .post("/api/v1/user/login")
      .send({ email: "wrongpw@example.com", password: "wrongpassword" });
    expect(res.status).toBe(401);
  });

  it("returns 404 for an unknown email", async () => {
    const res = await request(app)
      .post("/api/v1/user/login")
      .send({ email: "nobody@example.com", password: "password123" });
    expect(res.status).toBe(404);
  });
});

describe("current user + logout", () => {
  it("returns the current user for a valid token", async () => {
    const { token } = await registerUser({ email: "me@example.com" });
    const res = await request(app)
      .get("/api/v1/user/getCurrentUser")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("me@example.com");
  });

  it("logs out a user with a valid token", async () => {
    const { token } = await registerUser({ email: "out@example.com" });
    const res = await request(app)
      .post("/api/v1/user/logout")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
