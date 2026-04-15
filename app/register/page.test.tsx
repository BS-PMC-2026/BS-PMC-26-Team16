"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "./page";

const registerUserMock = vi.fn();

vi.mock("../../services/registerUser", () => ({
  registerUser: (...args: unknown[]) => registerUserMock(...args),
}));

async function fillStepOne() {
  fireEvent.change(screen.getByPlaceholderText("Enter your first name"), {
    target: { value: "Ada" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter your last name"), {
    target: { value: "Lovelace" },
  });
  fireEvent.change(screen.getByPlaceholderText("0501234567"), {
    target: { value: "0501234567" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter your ID number"), {
    target: { value: "123456789" },
  });
  fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
    target: { value: "Ada@Example.com " },
  });
  fireEvent.change(screen.getByPlaceholderText("Create a strong password"), {
    target: { value: "abc123" },
  });
}

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerUserMock.mockResolvedValue({ data: null, error: null });
  });

  it("shows validation messages when step one is incomplete", async () => {
    render(<RegisterPage />);

    fireEvent.click(screen.getByRole("button", { name: /next step/i }));

    expect(
      screen.getByText(/please fix the highlighted fields before continuing\./i)
    ).toBeInTheDocument();
    expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  });

  it("moves to step two after valid step one input", async () => {
    render(<RegisterPage />);

    await fillStepOne();
    fireEvent.click(screen.getByRole("button", { name: /next step/i }));

    expect(
      screen.getByRole("heading", { name: "Create Your Account" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Tell us why we should approve your request")
    ).toBeInTheDocument();
    expect(screen.getByText("Your Details")).toBeInTheDocument();
  });

  it("submits the registration request and shows the success state", async () => {
    render(<RegisterPage />);

    await fillStepOne();
    fireEvent.click(screen.getByRole("button", { name: /next step/i }));
    fireEvent.change(
      screen.getByPlaceholderText("Write a short explanation here..."),
      {
        target: {
          value: "I use EV charging often and need access to the platform.",
        },
      }
    );

    fireEvent.click(screen.getByRole("button", { name: /submit request/i }));

    await waitFor(() => {
      expect(registerUserMock).toHaveBeenCalledWith({
        first_name: "Ada",
        last_name: "Lovelace",
        phone: "0501234567",
        email: "Ada@Example.com",
        password: "abc123",
        id_number: "123456789",
        user_type: "customer",
        request_reason: "I use EV charging often and need access to the platform.",
      });
    });

    expect(
      await screen.findByRole("heading", { name: "Request Submitted!" })
    ).toBeInTheDocument();
  });

  it("shows the service error when registration fails", async () => {
    registerUserMock.mockResolvedValue({
      data: null,
      error: { message: "This email already exists in the system." },
    });

    render(<RegisterPage />);

    await fillStepOne();
    fireEvent.click(screen.getByRole("button", { name: /next step/i }));
    fireEvent.change(
      screen.getByPlaceholderText("Write a short explanation here..."),
      {
        target: {
          value: "I use EV charging often and need access to the platform.",
        },
      }
    );

    fireEvent.click(screen.getByRole("button", { name: /submit request/i }));

    expect(
      await screen.findByText(/this email already exists in the system\./i)
    ).toBeInTheDocument();
  });
});
