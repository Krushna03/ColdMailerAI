import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Protected from "./Protected";

const makeToken = (exp) => `header.${btoa(JSON.stringify({ exp }))}.sig`;
const nowSec = () => Math.floor(Date.now() / 1000);

const renderGuarded = () =>
  render(
    <MemoryRouter initialEntries={["/secret"]}>
      <Routes>
        <Route
          path="/secret"
          element={
            <Protected>
              <div>Secret content</div>
            </Protected>
          }
        />
        <Route path="/sign-in" element={<div>Sign in page</div>} />
      </Routes>
    </MemoryRouter>
  );

describe("Protected", () => {
  beforeEach(() => localStorage.clear());

  it("renders children when a valid token is present", () => {
    localStorage.setItem("token", JSON.stringify(makeToken(nowSec() + 3600)));
    renderGuarded();
    expect(screen.getByText("Secret content")).toBeInTheDocument();
  });

  it("redirects to sign-in when there is no token", () => {
    renderGuarded();
    expect(screen.getByText("Sign in page")).toBeInTheDocument();
    expect(screen.queryByText("Secret content")).not.toBeInTheDocument();
  });

  it("redirects and clears storage when the token is expired", () => {
    localStorage.setItem("token", JSON.stringify(makeToken(nowSec() - 60)));
    renderGuarded();
    expect(screen.getByText("Sign in page")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
  });
});
