import { describe, it, expect } from "vitest";
import { getUserInitial, capitalizeFirstLetter, toTitleCase } from "./stringHelpers";

describe("getUserInitial", () => {
  it("returns the uppercased first letter", () => {
    expect(getUserInitial("krushna")).toBe("K");
  });

  it("returns empty string for missing or non-string input", () => {
    expect(getUserInitial("")).toBe("");
    expect(getUserInitial(undefined)).toBe("");
    expect(getUserInitial(null)).toBe("");
    expect(getUserInitial(123)).toBe("");
  });
});

describe("capitalizeFirstLetter", () => {
  it("capitalizes only the first character", () => {
    expect(capitalizeFirstLetter("hello world")).toBe("Hello world");
  });

  it("returns empty string for invalid input", () => {
    expect(capitalizeFirstLetter("")).toBe("");
    expect(capitalizeFirstLetter(null)).toBe("");
  });
});

describe("toTitleCase", () => {
  it("capitalizes the first letter of each word", () => {
    expect(toTitleCase("hello there world")).toBe("Hello There World");
  });

  it("lowercases the remaining letters of each word", () => {
    expect(toTitleCase("HELLO WORLD")).toBe("Hello World");
  });

  it("returns empty string for invalid input", () => {
    expect(toTitleCase(undefined)).toBe("");
  });
});
