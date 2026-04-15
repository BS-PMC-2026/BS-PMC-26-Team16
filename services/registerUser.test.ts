import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerUser } from "./registerUser";

const createClientMock = vi.fn();

vi.mock("../lib/supabase/client", () => ({
  createClient: () => createClientMock(),
}));

type RegisterInput = Parameters<typeof registerUser>[0];

function createSupabaseMock({
  existingProfile = null,
  existingError = null,
  signUpData = {
    user: { id: "user-123", email: "test@example.com" },
    session: { access_token: "token" },
  },
  signUpError = null,
  profileData = { id: "user-123", first_name: "Ada" },
  profileError = null,
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: existingProfile,
    error: existingError,
  });

  const selectExisting = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle,
    }),
  });

  const updateSingle = vi.fn().mockResolvedValue({
    data: profileData,
    error: profileError,
  });

  const updateSelect = vi.fn().mockReturnValue({
    single: updateSingle,
  });

  const updateEq = vi.fn().mockReturnValue({
    select: updateSelect,
  });

  const update = vi.fn().mockReturnValue({
    eq: updateEq,
  });

  const from = vi.fn((table: string) => {
    if (table === "profiles") {
      return {
        select: selectExisting,
        update,
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  const auth = {
    signUp: vi.fn().mockResolvedValue({
      data: signUpData,
      error: signUpError,
    }),
  };

  return {
    supabase: {
      from,
      auth,
    },
    calls: {
      maybeSingle,
      selectExisting,
      update,
      updateEq,
      updateSelect,
      updateSingle,
      signUp: auth.signUp,
    },
  };
}

const validInput: RegisterInput = {
  first_name: " Ada ",
  last_name: " Lovelace ",
  phone: " 0501234567 ",
  email: " Ada@Example.com ",
  password: "abc123",
  id_number: " 123456789 ",
  user_type: "customer",
  request_reason: "I want to use the platform as an everyday customer.",
};

describe("registerUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an error when the email already exists", async () => {
    const { supabase, calls } = createSupabaseMock({
      existingProfile: { id: "existing-user" },
    });

    createClientMock.mockReturnValue(supabase);

    const result = await registerUser(validInput);

    expect(result).toEqual({
      data: null,
      error: { message: "This email already exists in the system." },
    });
    expect(calls.signUp).not.toHaveBeenCalled();
    expect(calls.update).not.toHaveBeenCalled();
  });

  it("returns the lookup error when checking existing profiles fails", async () => {
    const existingError = { message: "lookup failed" };
    const { supabase } = createSupabaseMock({ existingError });

    createClientMock.mockReturnValue(supabase);

    const result = await registerUser(validInput);

    expect(result).toEqual({
      data: null,
      error: existingError,
    });
  });

  it("normalizes the email and trims profile fields on success", async () => {
    const { supabase, calls } = createSupabaseMock();

    createClientMock.mockReturnValue(supabase);

    const result = await registerUser(validInput);

    expect(calls.selectExisting).toHaveBeenCalledWith("id");
    expect(calls.maybeSingle).toHaveBeenCalled();
    expect(calls.signUp).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "abc123",
    });
    expect(calls.update).toHaveBeenCalledWith({
      first_name: "Ada",
      last_name: "Lovelace",
      phone: "0501234567",
      id_number: "123456789",
      user_type: "customer",
      request_reason: "I want to use the platform as an everyday customer.",
      is_approved: false,
    });
    expect(calls.updateEq).toHaveBeenCalledWith("id", "user-123");
    expect(result.error).toBeNull();
    expect(result.data?.profile).toEqual({ id: "user-123", first_name: "Ada" });
  });

  it("returns an error when sign up fails", async () => {
    const signUpError = { message: "signup failed" };
    const { supabase, calls } = createSupabaseMock({ signUpError });

    createClientMock.mockReturnValue(supabase);

    const result = await registerUser(validInput);

    expect(result).toEqual({
      data: null,
      error: signUpError,
    });
    expect(calls.update).not.toHaveBeenCalled();
  });

  it("returns an error when sign up does not provide a user", async () => {
    const { supabase } = createSupabaseMock({
      signUpData: { user: null, session: null },
    });

    createClientMock.mockReturnValue(supabase);

    const result = await registerUser(validInput);

    expect(result).toEqual({
      data: null,
      error: { message: "User account was not created correctly." },
    });
  });

  it("returns an error when the profile update fails", async () => {
    const profileError = { message: "profile update failed" };
    const { supabase } = createSupabaseMock({ profileError });

    createClientMock.mockReturnValue(supabase);

    const result = await registerUser(validInput);

    expect(result).toEqual({
      data: null,
      error: profileError,
    });
  });
});
