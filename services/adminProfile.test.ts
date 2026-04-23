import { describe, expect, it } from "vitest";
import {
  initialAdminProfileState,
  validateAdminProfileUpdate,
} from "./adminProfile";

describe("admin profile validation", () => {
  it("exports a stable empty initial state", () => {
    expect(initialAdminProfileState).toEqual({
      errors: {},
      message: "",
      success: false,
    });
  });

  it("normalizes names and allows saving without changing the password", () => {
    const result = validateAdminProfileUpdate({
      firstName: "  Ada  ",
      lastName: "  Lovelace ",
      email: " Ada@Example.com ",
      currentEmail: "ada@example.com",
      password: "",
      confirmPassword: "",
    });

    expect(result).toEqual({
      success: true,
      data: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        emailChanged: false,
        password: null,
      },
    });
  });

  it("returns field errors for missing or too-short names", () => {
    const result = validateAdminProfileUpdate({
      firstName: " ",
      lastName: "L",
      email: "ada@example.com",
      currentEmail: "ada@example.com",
      password: "",
      confirmPassword: "",
    });

    expect(result).toEqual({
      success: false,
      errors: {
        firstName: ["First name is required."],
        lastName: ["Last name must be at least 2 characters long."],
      },
    });
  });

  it("enforces strong password requirements and confirmation", () => {
    const result = validateAdminProfileUpdate({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      currentEmail: "ada@example.com",
      password: "weakpass",
      confirmPassword: "weakpass",
    });

    expect(result).toEqual({
      success: false,
      errors: {
        password: [
          "Password must include at least one uppercase letter.",
          "Password must include at least one number.",
          "Password must include at least one special character.",
        ],
      },
    });
  });

  it("rejects mismatched password confirmation", () => {
    const result = validateAdminProfileUpdate({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "new@example.com",
      currentEmail: "ada@example.com",
      password: "StrongPass1!",
      confirmPassword: "StrongPass1?",
    });

    expect(result).toEqual({
      success: false,
      errors: {
        confirmPassword: ["Passwords do not match."],
      },
    });
  });
});
