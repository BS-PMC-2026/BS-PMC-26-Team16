import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCurrentUser,
  signInUser,
  signOutUser,
  signUpUser,
} from "./auth";

const createClientMock = vi.fn();

vi.mock("../lib/supabase/client", () => ({
  createClient: () => createClientMock(),
}));

function createSupabaseMock() {
  const signUp = vi.fn().mockResolvedValue({
    data: { user: { id: "user-1" } },
    error: null,
  });
  const signInWithPassword = vi.fn().mockResolvedValue({
    data: { user: { id: "user-1" }, session: { access_token: "token" } },
    error: null,
  });
  const signOut = vi.fn().mockResolvedValue({
    error: null,
  });
  const getUser = vi.fn().mockResolvedValue({
    data: { user: { id: "user-1", email: "ada@example.com" } },
    error: null,
  });

  return {
    supabase: {
      auth: {
        signUp,
        signInWithPassword,
        signOut,
        getUser,
      },
    },
    calls: {
      signUp,
      signInWithPassword,
      signOut,
      getUser,
    },
  };
}

describe("auth services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signUpUser delegates to supabase auth.signUp", async () => {
    const { supabase, calls } = createSupabaseMock();
    createClientMock.mockReturnValue(supabase);

    const result = await signUpUser("ada@example.com", "abc123");

    expect(calls.signUp).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "abc123",
    });
    expect(result).toEqual({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  it("signInUser delegates to supabase auth.signInWithPassword", async () => {
    const { supabase, calls } = createSupabaseMock();
    createClientMock.mockReturnValue(supabase);

    const result = await signInUser("ada@example.com", "abc123");

    expect(calls.signInWithPassword).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "abc123",
    });
    expect(result).toEqual({
      data: { user: { id: "user-1" }, session: { access_token: "token" } },
      error: null,
    });
  });

  it("signOutUser delegates to supabase auth.signOut", async () => {
    const { supabase, calls } = createSupabaseMock();
    createClientMock.mockReturnValue(supabase);

    const result = await signOutUser();

    expect(calls.signOut).toHaveBeenCalled();
    expect(result).toEqual({ error: null });
  });

  it("getCurrentUser delegates to supabase auth.getUser", async () => {
    const { supabase, calls } = createSupabaseMock();
    createClientMock.mockReturnValue(supabase);

    const result = await getCurrentUser();

    expect(calls.getUser).toHaveBeenCalled();
    expect(result).toEqual({
      data: { user: { id: "user-1", email: "ada@example.com" } },
      error: null,
    });
  });
});
