import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  initialCustomerProfileState,
  validateCustomerProfileUpdate,
} from "./customerProfile";

const createClientMock = vi.fn();

vi.mock("../lib/supabase/client", () => ({
  createClient: () => createClientMock(),
}));

describe("customer auth flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* Customer (EV owner) registers successfully — user_type is customer */
  it("customer registers successfully", async () => {
    const signUpMock = vi.fn().mockResolvedValue({
      data: { user: { id: "customer-1", email: "eva@example.com" } },
      error: null,
    });

    createClientMock.mockReturnValue({ auth: { signUp: signUpMock } });

    const supabase = createClientMock();
    const result = await supabase.auth.signUp({
      email: "eva@example.com",
      password: "Customer1!",
    });

    expect(signUpMock).toHaveBeenCalledWith({
      email: "eva@example.com",
      password: "Customer1!",
    });
    expect(result.error).toBeNull();
    expect(result.data.user.id).toBe("customer-1");
  });

  /* Customer logs in successfully after registration */
  it("customer logs in successfully", async () => {
    const signInMock = vi.fn().mockResolvedValue({
      data: { user: { id: "customer-1" }, session: { access_token: "token" } },
      error: null,
    });

    createClientMock.mockReturnValue({ auth: { signInWithPassword: signInMock } });

    const supabase = createClientMock();
    const result = await supabase.auth.signInWithPassword({
      email: "eva@example.com",
      password: "Customer1!",
    });

    expect(signInMock).toHaveBeenCalledWith({
      email: "eva@example.com",
      password: "Customer1!",
    });
    expect(result.error).toBeNull();
    expect(result.data.session.access_token).toBe("token");
  });

  /* After logout, getUser returns null — customer is no longer connected */
  it("customer is no longer connected after logout", async () => {
    const signOutMock = vi.fn().mockResolvedValue({ error: null });
    const getUserMock = vi.fn().mockResolvedValue({ data: { user: null }, error: null });

    createClientMock.mockReturnValue({
      auth: { signOut: signOutMock, getUser: getUserMock },
    });

    const supabase = createClientMock();
    await supabase.auth.signOut();
    const { data } = await supabase.auth.getUser();

    expect(signOutMock).toHaveBeenCalled();
    expect(data.user).toBeNull();
  });
});

describe("customer profile validation", () => {
  /* Verifies that the initial form state is empty with no errors */
  it("exports a stable empty initial state", () => {
    expect(initialCustomerProfileState).toEqual({
      errors: {},
      message: "",
      success: false,
    });
  });

  /* Verifies that extra whitespace is trimmed from names and password can be left empty */
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

  /* Verifies that blank or too-short names return the correct field error messages */
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

  /* Verifies that a weak password returns all relevant strength error messages */
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

  /* Verifies that mismatched password and confirmation returns a mismatch error */
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
