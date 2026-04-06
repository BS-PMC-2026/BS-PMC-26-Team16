"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import "./LoginPage.css";

type LoginErrors = {
  email?: string;
  password?: string;
};

type TouchedType = {
  email?: boolean;
  password?: boolean;
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState<LoginErrors>({});
  const [touched, setTouched] = useState<TouchedType>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const validateForm = (): LoginErrors => {
    const newErrors: LoginErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

    return newErrors;
  };

  const handleBlur = (field: keyof TouchedType) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setErrors((prev) => ({ ...prev, email: undefined }));
    setMessage("");
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setErrors((prev) => ({ ...prev, password: undefined }));
    setMessage("");
  };

  const showError = (field: keyof LoginErrors) => touched[field] && errors[field];

  const getInputClass = (field: keyof LoginErrors) =>
    showError(field) ? "login-input login-input-error" : "login-input";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = validateForm();

    setTouched({
      email: true,
      password: true,
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setMessage("Please fix the highlighted fields before continuing.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setMessage("Incorrect email or password.");
        return;
      }

      setShowSuccess(true);

      setTimeout(() => {
        router.push("/map");
      }, 2000);
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
            <h3 className="login-success-title">Welcome Back!</h3>
            <p className="login-success-text">Redirecting to the map...</p>
          </div>
        </div>
      )}

      <div className="login-card">
        <div className="login-header">
          <div className="login-badge">Sign In</div>
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Enter your details to continue</p>
        </div>

        {message && (
          <div className="login-message-box login-error-box">
            ⚠️ {message}
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form">
          <div className="login-field">
            <label className="login-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={() => handleBlur("email")}
              placeholder="you@example.com"
              className={getInputClass("email")}
              autoComplete="email"
              inputMode="email"
              disabled={loading}
            />
            {showError("email") && (
              <span className="login-error-text">⚠ {errors.email}</span>
            )}
          </div>

          <div className="login-field">
            <label className="login-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              onBlur={() => handleBlur("password")}
              placeholder="Enter your password"
              className={getInputClass("password")}
              autoComplete="current-password"
              disabled={loading}
            />
            {showError("password") && (
              <span className="login-error-text">⚠ {errors.password}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-primary-button"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="login-footer-text">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="login-footer-link">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}