export type AdminProfileFormValues = {
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
};

export type AdminProfileFormErrors = Partial<
  Record<keyof AdminProfileFormValues, string[]>
>;

export type AdminProfileActionState = {
  errors: AdminProfileFormErrors;
  message: string;
  success: boolean;
};

export type ValidatedAdminProfileUpdate = {
  firstName: string;
  lastName: string;
  password: string | null;
};

export const initialAdminProfileState: AdminProfileActionState = {
  errors: {},
  message: "",
  success: false,
};

import { getStrongPasswordErrors } from "./passwordValidation";

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function validateAdminProfileUpdate(
  values: AdminProfileFormValues
):
  | { success: true; data: ValidatedAdminProfileUpdate }
  | { success: false; errors: AdminProfileFormErrors } {
  const firstName = normalizeName(values.firstName);
  const lastName = normalizeName(values.lastName);
  const password = values.password.trim();
  const confirmPassword = values.confirmPassword.trim();

  const errors: AdminProfileFormErrors = {};

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
      password: password || null,
    },
  };
}
