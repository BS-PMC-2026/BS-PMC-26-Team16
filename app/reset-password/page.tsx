"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getStrongPasswordErrors } from "@/services/passwordValidation";
import "../login/LoginPage.css";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ password?: string[]; confirmPassword?: string }>({});
  const [touched, setTouched] = useState<{ password?: boolean; confirmPassword?: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const validate = () => {
    const newErrors: { password?: string[]; confirmPassword?: string } = {};
    const passwordErrors = getStrongPasswordErrors(password);
    if (passwordErrors.length > 0) newErrors.password = passwordErrors;
    if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match.";
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ password: true, confirmPassword: true });
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setMessage("Failed to reset password. The link may have expired — request a new one.");
        return;
      }

      setShowSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
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

      {showSuccess && (
        <div className="login-overlay">
          <div className="login-success-modal">
            <div className="login-success-icon">✅</div>
            <h3 className="login-success-title">Password Updated!</h3>
            <p className="login-success-text">Redirecting to login...</p>
          </div>
        </div>
      )}

      <div className="login-card">
        <div className="login-header">
          <div className="login-badge">New Password</div>
          <h1 className="login-title">Reset Password</h1>
          <p className="login-subtitle">Choose a strong new password</p>
        </div>

        {message && (
          <div className="login-message-box login-error-box">⚠️ {message}</div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label className="login-label">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
              placeholder="Enter new password"
              className={touched.password && errors.password ? "login-input login-input-error" : "login-input"}
              autoComplete="new-password"
              disabled={loading}
            />
            {touched.password && errors.password?.map((err, i) => (
              <span key={i} className="login-error-text">⚠ {err}</span>
            ))}
          </div>

          <div className="login-field">
            <label className="login-label">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
              placeholder="Confirm new password"
              className={touched.confirmPassword && errors.confirmPassword ? "login-input login-input-error" : "login-input"}
              autoComplete="new-password"
              disabled={loading}
            />
            {touched.confirmPassword && errors.confirmPassword && (
              <span className="login-error-text">⚠ {errors.confirmPassword}</span>
            )}
          </div>

          <button type="submit" disabled={loading} className="login-primary-button">
            {loading ? "Saving..." : "Set New Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
