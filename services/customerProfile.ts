import {
  initialProfileState,
  validateProfileUpdate,
  type ProfileActionState,
  type ProfileFormErrors,
  type ProfileFormValues,
  type ValidatedProfileUpdate,
} from "./profileValidation";

export type CustomerProfileFormValues = ProfileFormValues;
export type CustomerProfileFormErrors = ProfileFormErrors;
export type CustomerProfileActionState = ProfileActionState;
export type ValidatedCustomerProfileUpdate = ValidatedProfileUpdate;

export const initialCustomerProfileState: CustomerProfileActionState =
  initialProfileState;

export const validateCustomerProfileUpdate = validateProfileUpdate;
