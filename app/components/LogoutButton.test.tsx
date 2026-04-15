"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LogoutButton from "./LogoutButton";

const pushMock = vi.fn();
const refreshMock = vi.fn();
const signOutMock = vi.fn();
const createClientMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => createClientMock(),
}));

describe("LogoutButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    signOutMock.mockResolvedValue({ error: null });
    createClientMock.mockReturnValue({
      auth: {
        signOut: signOutMock,
      },
    });
  });

  it("signs the user out and redirects to login", async () => {
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalled();
    });

    expect(pushMock).toHaveBeenCalledWith("/login");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("does not redirect before sign out resolves", async () => {
    let resolveSignOut: ((value: { error: null }) => void) | undefined;

    signOutMock.mockImplementation(
      () =>
        new Promise<{ error: null }>((resolve) => {
          resolveSignOut = resolve;
        })
    );

    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    expect(pushMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();

    resolveSignOut?.({ error: null });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });

    expect(refreshMock).toHaveBeenCalled();
  });
});
