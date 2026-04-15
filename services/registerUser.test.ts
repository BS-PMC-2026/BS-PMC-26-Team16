import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerUser } from "./registerUser";

const createClientMock = vi.fn();

vi.mock("../lib/supabase/client", () => ({
  createClient: () => createClientMock(),
}));

type RegisterInput = Parameters<typeof registerUser>[0];

type MockExistingProfile = { id: string } | null;
type MockError = { message: string } | null;
type MockSignUpData = {
  user: { id: string; email: string } | null;
  session: { access_token: string } | null;
};
type MockProfileData = { id: string; first_name: string } | null;

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
}: {
  existingProfile?: MockExistingProfile;
  existingError?: MockError;
  signUpData?: MockSignUpData;
  signUpError?: MockError;
  profileData?: MockProfileData;
  profileError?: MockError;
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

  const upsertSingle = vi.fn().mockResolvedValue({
    data: profileData,
    error: profileError,
  });

  const upsertSelect = vi.fn().mockReturnValue({
    single: upsertSingle,
  });

  const upsert = vi.fn().mockReturnValue({
    select: upsertSelect,
  });

  const from = vi.fn((table: string) => {
    if (table === "profiles") {
      return {
        select: selectExisting,
        upsert,
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
      upsert,
      upsertSelect,
      upsertSingle,
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
    expect(calls.upsert).not.toHaveBeenCalled();
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
    expect(calls.upsert).toHaveBeenCalledWith(
      {
        id: "user-123",
        first_name: "Ada",
        last_name: "Lovelace",
        phone: "0501234567",
        email: "ada@example.com",
        id_number: "123456789",
        user_type: "customer",
        request_reason: "I want to use the platform as an everyday customer.",
        is_approved: false,
      },
      {
        onConflict: "id",
      }
    );
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
    expect(calls.upsert).not.toHaveBeenCalled();
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
