import { getStrongPasswordErrors } from "./passwordValidation";

export type ProfileFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  currentEmail?: string;
  password: string;
  confirmPassword: string;
};

export type ProfileFormErrors = Partial<
  Record<"firstName" | "lastName" | "email" | "password" | "confirmPassword", string[]>
>;

export type ProfileActionState = {
  errors: ProfileFormErrors;
  message: string;
  success: boolean;
};

export type ValidatedProfileUpdate = {
  firstName: string;
  lastName: string;
  email: string;
  emailChanged: boolean;
  password: string | null;
};

export const initialProfileState: ProfileActionState = {
  errors: {},
  message: "",
  success: false,
};

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function validateProfileUpdate(
  values: ProfileFormValues
):
  | { success: true; data: ValidatedProfileUpdate }
  | { success: false; errors: ProfileFormErrors } {
  const firstName = normalizeName(values.firstName);
  const lastName = normalizeName(values.lastName);
  const email = values.email.trim().toLowerCase();
  const currentEmail = values.currentEmail?.trim().toLowerCase() ?? "";
  const password = values.password.trim();
  const confirmPassword = values.confirmPassword.trim();

  const errors: ProfileFormErrors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!firstName) {
    errors.firstName = ["First name is required."];
  } else if (firstName.length < 2) {
    errors.firstName = ["First name must be at least 2 characters long."];
  }

  if (!lastName) {
    errors.lastName = ["Last name is required."];
  } else if (lastName.length < 2) {
    errors.lastName = ["Last name must be at least 2 characters long."];
  }

  if (!email) {
    errors.email = ["Email is required."];
  } else if (!emailPattern.test(email)) {
    errors.email = ["Please enter a valid email address."];
  }

  if (password || confirmPassword) {
    const passwordErrors = getStrongPasswordErrors(password);

    if (passwordErrors.length > 0) {
      errors.password = passwordErrors;
    }

    if (!confirmPassword) {
      errors.confirmPassword = ["Please confirm your new password."];
    } else if (password !== confirmPassword) {
      errors.confirmPassword = ["Passwords do not match."];
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: {
      firstName,
      lastName,
      email,
      emailChanged: email !== currentEmail,
      password: password || null,
    },
  };
}
