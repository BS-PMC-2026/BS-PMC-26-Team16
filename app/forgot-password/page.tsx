"use client";

import React, { useState } from "react";
import Link from "next/link";
import { resetPasswordForEmail } from "@/services/auth";
import "../login/LoginPage.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = () => {
    if (!email.trim()) return "Email is required";
    if (!emailRegex.test(email.trim())) return "Please enter a valid email address";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const error = validate();
    setEmailError(error);
    if (error) return;

    setLoading(true);
    setMessage("");

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resetError } = await resetPasswordForEmail(
        email.trim().toLowerCase(),
        redirectTo
      );

      if (resetError) {
        setMessage("Something went wrong. Please try again.");
        return;
      }

      setSent(true);
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background-glow-one" />
      <div className="login-background-glow-two" />

      <div className="login-card">
        <div className="login-header">
          <div className="login-badge">Password Reset</div>
          <h1 className="login-title">Forgot Password?</h1>
          <p className="login-subtitle">
            {sent
              ? "Check your inbox for a reset link"
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {sent ? (
          <div className="login-message-box login-success-box">
            ✅ Reset email sent! Follow the link in your inbox to set a new password.
          </div>
        ) : (
          <>
            {message && (
              <div className="login-message-box login-error-box">⚠️ {message}</div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label className="login-label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                    setMessage("");
                  }}
                  onBlur={() => {
                    setTouched(true);
                    setEmailError(validate());
                  }}
                  placeholder="you@example.com"
                  className={touched && emailError ? "login-input login-input-error" : "login-input"}
                  autoComplete="email"
                  inputMode="email"
                  disabled={loading}
                />
                {touched && emailError && (
                  <span className="login-error-text">⚠ {emailError}</span>
                )}
              </div>

              <button type="submit" disabled={loading} className="login-primary-button">
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </>
        )}

        <p className="login-footer-text">
          Remember your password?{" "}
          <Link href="/login" className="login-footer-link">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
