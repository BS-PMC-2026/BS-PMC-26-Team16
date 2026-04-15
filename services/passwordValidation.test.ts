import { describe, expect, it } from "vitest";
import { getStrongPasswordErrors } from "./passwordValidation";

describe("password validation", () => {
  it("accepts a strong password that contains @", () => {
    expect(getStrongPasswordErrors("A@123456a")).toEqual([]);
  });

  it("returns all relevant errors for a weak password", () => {
    expect(getStrongPasswordErrors("weak")).toEqual([
      "Password must be at least 8 characters long.",
      "Password must include at least one uppercase letter.",
      "Password must include at least one number.",
      "Password must include at least one special character.",
    ]);
  });
});
