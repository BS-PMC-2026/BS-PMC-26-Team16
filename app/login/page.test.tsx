"use client";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

const pushMock = vi.fn();
const refreshMock = vi.fn();
const signInWithPasswordMock = vi.fn();
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

function submitLoginForm() {
  const button = screen.getByRole("button", { name: /sign in/i });
  const form = button.closest("form");

  if (!form) {
    throw new Error("Login form not found");
  }

  fireEvent.submit(form);
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    signInWithPasswordMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    createClientMock.mockReturnValue({
      auth: {
        signInWithPassword: signInWithPasswordMock,
      },
    });
  });

  it("shows validation messages when the form is empty", async () => {
    render(<LoginPage />);

    submitLoginForm();

    expect(
      screen.getByText(/please fix the highlighted fields before continuing\./i)
    ).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it("shows an email validation error for invalid email format", async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "not-an-email" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "abc123" },
    });

    submitLoginForm();

    expect(
      screen.getByText(/please enter a valid email address/i)
    ).toBeInTheDocument();
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it("submits normalized credentials and redirects on success", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: " Ada@Example.com " },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "abc123" },
    });

    submitLoginForm();

    await waitFor(() => {
      expect(signInWithPasswordMock).toHaveBeenCalledWith({
        email: "ada@example.com",
        password: "abc123",
      });
    });

    expect(
      screen.getByRole("heading", { name: /welcome back!/i })
    ).toBeInTheDocument();

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);

    const redirectCall = setTimeoutSpy.mock.calls.find(([, delay]) => delay === 2000);
    const redirectCallback = redirectCall?.[0];

    if (typeof redirectCallback !== "function") {
      throw new Error("Expected redirect timeout callback");
    }

    act(() => {
      redirectCallback();
    });

    expect(pushMock).toHaveBeenCalledWith("/map");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows a friendly message when credentials are rejected", async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "wrong-password" },
    });

    submitLoginForm();

    expect(
      await screen.findByText(/incorrect email or password\./i)
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a generic message when the login request throws", async () => {
    signInWithPasswordMock.mockRejectedValue(new Error("network failed"));

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "abc123" },
    });

    submitLoginForm();

    expect(
      await screen.findByText(/something went wrong\. please try again\./i)
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
