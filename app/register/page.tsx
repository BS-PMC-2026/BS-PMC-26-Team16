"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "../../services/registerUser";
import { getStrongPasswordErrors } from "../../services/passwordValidation";
import "./RegisterPage.css";

type FormDataType = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  idNumber: string;
  userType: "customer" | "provider";
  reason: string;
};

type ErrorType = Partial<Record<keyof FormDataType, string>>;
type TouchedType = Partial<Record<keyof FormDataType, boolean>>;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const [form, setForm] = useState<FormDataType>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    idNumber: "",
    userType: "customer",
    reason: "",
  });

  const [errors, setErrors] = useState<ErrorType>({});
  const [touched, setTouched] = useState<TouchedType>({});
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!submitted) return;
    if (countdown <= 0) { router.push("/login"); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [submitted, countdown, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setMessage("");
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const validateStep1 = (): ErrorType => {
    const newErrors: ErrorType = {};

    if (!form.firstName.trim()) {
      newErrors.firstName = "First name is required";
    } else if (form.firstName.trim().length < 2) {
      newErrors.firstName = "First name must be at least 2 characters";
    }

    if (!form.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    } else if (form.lastName.trim().length < 2) {
      newErrors.lastName = "Last name must be at least 2 characters";
    }

    const phoneDigits = form.phone.replace(/\D/g, "");
    if (!phoneDigits) {
      newErrors.phone = "Phone number is required";
    } else if (phoneDigits.length < 9 || phoneDigits.length > 10) {
      newErrors.phone = "Phone number must contain 9 to 10 digits";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(form.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (getStrongPasswordErrors(form.password).length > 0) {
      newErrors.password =
        "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character";
    }

    const idDigits = form.idNumber.replace(/\D/g, "");
    if (!idDigits) {
      newErrors.idNumber = "ID number is required";
    } else if (idDigits.length < 5 || idDigits.length > 9) {
      newErrors.idNumber = "ID number must contain 5 to 9 digits";
    }

    return newErrors;
  };

  const validateStep2 = (): ErrorType => {
    const newErrors: ErrorType = {};

    if (!form.reason.trim()) {
      newErrors.reason = "Please explain why we should approve you";
    } else if (form.reason.trim().length < 20) {
      newErrors.reason = "Please write at least 20 characters";
    }

    return newErrors;
  };

  const handleNext = () => {
    const newErrors = validateStep1();

    setTouched({
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      password: true,
      idNumber: true,
      userType: true,
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setMessage("Please fix the highlighted fields before continuing.");
      return;
    }

    setMessage("");
    setStep(2);
  };

  const handleBack = () => {
    setErrors({});
    setMessage("");
    setStep(1);
  };

  const handleSubmit = async () => {
    const step1Errors = validateStep1();
    const step2Errors = validateStep2();
    const newErrors = { ...step1Errors, ...step2Errors };

    setTouched({
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      password: true,
      idNumber: true,
      userType: true,
      reason: true,
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setMessage("Please fix the highlighted fields before submitting.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const { error } = await registerUser({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
        id_number: form.idNumber.trim(),
        user_type: form.userType,
        request_reason: form.reason.trim(),
      });

      if (error) {
        setMessage(error.message || "Registration failed. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const showError = (fieldName: keyof FormDataType) =>
    touched[fieldName] && errors[fieldName];

  const getInputClass = (fieldName: keyof FormDataType) =>
    showError(fieldName)
      ? "register-input register-input-error"
      : "register-input";

  const getTextareaClass = (fieldName: keyof FormDataType) =>
    showError(fieldName)
      ? "register-input register-textarea register-input-error"
      : "register-input register-textarea";

  const backToLoginBtn = (
    <Link
      href="/login"
      className="register-back-link"
    >
      ← Back to Login
    </Link>
  );

  if (submitted) {
    return (
      <div className="register-page">
        <div className="register-pattern" aria-hidden="true">
          <span className="register-shape register-shape-one" />
          <span className="register-shape register-shape-two" />
          <span className="register-shape register-shape-three" />
          <span className="register-shape register-shape-four" />
          <span className="register-shape register-shape-five" />
        </div>
        {backToLoginBtn}

        <div className="register-card register-card-center">
          <div className="register-success-icon">✅</div>
          <h1 className="register-title">Request Submitted!</h1>
          <p className="register-subtitle register-subtitle-success">
            We&apos;ll review your details and get back to you soon.
          </p>
          <p className="register-subtitle">
            Redirecting to login in {countdown}s...
          </p>
          <Link href="/login" className="register-primary-button" style={{ display: "inline-block", marginTop: "1rem", textAlign: "center" }}>
            Go to Login now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <div className="register-pattern" aria-hidden="true">
        <span className="register-shape register-shape-one" />
        <span className="register-shape register-shape-two" />
        <span className="register-shape register-shape-three" />
        <span className="register-shape register-shape-four" />
        <span className="register-shape register-shape-five" />
      </div>
      {backToLoginBtn}

      <div className="register-shell">
        <div className="register-header">
          <div className="register-step-indicator" aria-label={`Step ${step} of 2`}>
            <div className={`register-step-dot ${step > 1 ? "done" : "active"}`}>
              {step > 1 ? "✓" : "1"}
            </div>
            <div className={`register-step-line ${step > 1 ? "active" : ""}`} />
            <div className={`register-step-dot ${step === 2 ? "active" : ""}`}>2</div>
            <div className="register-step-line" />
            <div className="register-step-dot">3</div>
            <div className="register-step-line" />
            <div className="register-step-dot">4</div>
          </div>

          <h1 className="register-title">
            {step === 1 ? "Let's get to know you" : "Tell us about your request"}
          </h1>
        </div>

        <div className="register-card">
          {message && (
            <div className="register-message-box register-error-box">
              ⚠️ {message}
            </div>
          )}

          {step === 1 && (
            <div className="register-form">
              <div className="register-row">
                <div className="register-field">
                  <label className="register-label">First name</label>
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter your first name"
                    className={getInputClass("firstName")}
                    autoComplete="given-name"
                    disabled={loading}
                  />
                  {showError("firstName") && (
                    <span className="register-error-text">⚠ {errors.firstName}</span>
                  )}
                </div>

                <div className="register-field">
                  <label className="register-label">Last name</label>
                  <input
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter your last name"
                    className={getInputClass("lastName")}
                    autoComplete="family-name"
                    disabled={loading}
                  />
                  {showError("lastName") && (
                    <span className="register-error-text">⚠ {errors.lastName}</span>
                  )}
                </div>
              </div>

              <div className="register-row">
                <div className="register-field">
                  <label className="register-label">Phone Number</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="0501234567"
                    className={getInputClass("phone")}
                    autoComplete="tel"
                    inputMode="numeric"
                    disabled={loading}
                  />
                  {showError("phone") && (
                    <span className="register-error-text">⚠ {errors.phone}</span>
                  )}
                </div>

                <div className="register-field">
                  <label className="register-label">ID Number</label>
                  <input
                    name="idNumber"
                    value={form.idNumber}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter your ID number"
                    className={getInputClass("idNumber")}
                    inputMode="numeric"
                    disabled={loading}
                  />
                  {showError("idNumber") && (
                    <span className="register-error-text">⚠ {errors.idNumber}</span>
                  )}
                </div>
              </div>

              <div className="register-field">
                <label className="register-label">Email</label>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="you@example.com"
                  className={getInputClass("email")}
                  autoComplete="email"
                  inputMode="email"
                  disabled={loading}
                />
                {showError("email") && (
                  <span className="register-error-text">⚠ {errors.email}</span>
                )}
              </div>

              <div className="register-field">
                <label className="register-label">Create Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Create a strong password"
                  className={getInputClass("password")}
                  autoComplete="new-password"
                  disabled={loading}
                />
                {showError("password") && (
                  <span className="register-error-text">⚠ {errors.password}</span>
                )}
              </div>

              <div className="register-field">
                <label className="register-label">Account Type</label>
                <select
                  name="userType"
                  value={form.userType}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={getInputClass("userType")}
                  disabled={loading}
                >
                  <option value="customer">Customer</option>
                  <option value="provider">Service Provider</option>
                </select>
              </div>

              <div className="register-actions register-actions-center">
                <button
                  type="button"
                  onClick={handleNext}
                  className="register-primary-button"
                  disabled={loading}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="register-form">
              <div className="register-summary-box">
                <p className="register-summary-title">Your Details</p>
                <p className="register-summary-text">
                  {form.firstName} {form.lastName} · {form.email} ·{" "}
                  {form.userType === "customer" ? "Customer" : "Service Provider"}
                </p>
              </div>

              <div className="register-field">
                <label className="register-label">Why should we approve you?</label>
                <textarea
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Write a short explanation here..."
                  className={getTextareaClass("reason")}
                  rows={7}
                  disabled={loading}
                />
                {showError("reason") && (
                  <span className="register-error-text">⚠ {errors.reason}</span>
                )}
                <span className="register-char-count">
                  {form.reason.trim().length} / 20 min characters
                </span>
              </div>

              <div className="register-button-row">
                <button
                  type="button"
                  onClick={handleBack}
                  className="register-secondary-button"
                  disabled={loading}
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  className="register-primary-button"
                  disabled={loading}
                >
                  {loading ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
