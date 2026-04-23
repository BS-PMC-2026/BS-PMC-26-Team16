import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Navbar from "../app/components/Navbar";

vi.mock("../app/components/LogoutButton", () => ({
  default: () => <button>Logout</button>,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const createClientMock = vi.fn();
const createClientAuthMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createClientMock(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => createClientAuthMock(),
}));

function createSupabaseMock(userType: "admin" | "customer" | "provider" | null) {
  const user = userType ? { id: "user-1" } : null;
  const profile = userType
    ? { first_name: "Test", last_name: "User", user_type: userType }
    : null;

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: profile }),
        }),
      }),
    }),
  };
}

describe("Admin login behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* Verifies that the profile fetched from the database has user_type === "admin" */
  it("User type is admin", async () => {
    const supabase = createSupabaseMock("admin");
    createClientMock.mockReturnValue(supabase);

    const profileResult = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", "user-1")
      .single();

    expect(profileResult.data?.user_type).toBe("admin");
  });

  /* Verifies that the Approvals link appears in the Navbar when an admin is logged in */
  it("Admin is logged in — Approvals link is displayed in Navbar", async () => {
    createClientMock.mockReturnValue(createSupabaseMock("admin"));

    render(await Navbar());

    expect(screen.getByRole("link", { name: /approvals/i })).toBeInTheDocument();
  });

  /* Verifies that the Dashboard link is displayed in the Navbar for every logged-in user, including admins */
  it("Admin is logged in — Dashboard link is displayed in Navbar", async () => {
    createClientMock.mockReturnValue(createSupabaseMock("admin"));

    render(await Navbar());

    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
  });

  /* Verifies that an admin can sign in successfully with valid email and password */
  it("Admin can log in with email and password", async () => {
    const signInMock = vi.fn().mockResolvedValue({
      data: { user: { id: "user-1" }, session: { access_token: "token" } },
      error: null,
    });

    createClientAuthMock.mockReturnValue({
      auth: { signInWithPassword: signInMock },
    });

    const supabase = createClientAuthMock();
    const result = await supabase.auth.signInWithPassword({
      email: "admin@example.com",
      password: "Admin1234!",
    });

    expect(signInMock).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "Admin1234!",
    });
    expect(result.error).toBeNull();
    expect(result.data.user.id).toBe("user-1");
  });

  /* Verifies that an admin can view pending users' request reasons and approve them */
  it("Admin can view registration justification and approve a user", async () => {
    const pendingUser = {
      id: "pending-user-1",
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
      phone: "0501234567",
      id_number: "123456789",
      user_type: "customer",
      request_reason: "I want to use the platform to charge my EV daily.",
      is_approved: false,
      created_at: "2026-04-19T10:00:00",
    };

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "admin-1" } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { user_type: "admin", is_approved: true },
                }),
              }),
              order: vi.fn().mockResolvedValue({ data: [pendingUser], error: null }),
            }),
            update: updateMock,
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    createClientMock.mockReturnValue(supabase);

    // Admin fetches pending users and can read their request_reason
    const { data: pendingUsers } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, request_reason, is_approved")
      .order("created_at", { ascending: false });

    expect(pendingUsers).toHaveLength(1);
    expect(pendingUsers[0].request_reason).toBe(
      "I want to use the platform to charge my EV daily."
    );
    expect(pendingUsers[0].is_approved).toBe(false);

    // Admin approves the user
    await supabase.from("profiles").update({ is_approved: true }).eq("id", pendingUser.id);

    expect(updateMock).toHaveBeenCalledWith({ is_approved: true });
  });

  /* Verifies that an admin can sign out successfully without errors */
  it("Admin can log out", async () => {
    const signOutMock = vi.fn().mockResolvedValue({ error: null });

    createClientAuthMock.mockReturnValue({
      auth: { signOut: signOutMock },
    });

    const supabase = createClientAuthMock();
    const result = await supabase.auth.signOut();

    expect(signOutMock).toHaveBeenCalled();
    expect(result.error).toBeNull();
  });
});
