import { describe, expect, it } from "vitest";
import {
  initialCustomerProfileState,
  validateCustomerProfileUpdate,
} from "./customerProfile";

describe("customer profile validation", () => {
  it("exports a stable empty initial state", () => {
    expect(initialCustomerProfileState).toEqual({
      errors: {},
      message: "",
      success: false,
    });
  });

  it("normalizes names and allows saving without changing the password", () => {
    const result = validateCustomerProfileUpdate({
      firstName: "  Ada  ",
      lastName: "  Lovelace ",
      password: "",
      confirmPassword: "",
    });

    expect(result).toEqual({
      success: true,
      data: {
        firstName: "Ada",
        lastName: "Lovelace",
        password: null,
      },
    });
  });

  it("returns field errors for missing or too-short names", () => {
    const result = validateCustomerProfileUpdate({
      firstName: " ",
      lastName: "L",
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
    const result = validateCustomerProfileUpdate({
      firstName: "Ada",
      lastName: "Lovelace",
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
    const result = validateCustomerProfileUpdate({
      firstName: "Ada",
      lastName: "Lovelace",
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
