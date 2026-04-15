import {
  initialProfileState,
  validateProfileUpdate,
  type ProfileActionState,
  type ProfileFormErrors,
  type ProfileFormValues,
  type ValidatedProfileUpdate,
} from "./profileValidation";

export type ProviderProfileFormValues = ProfileFormValues;
export type ProviderProfileFormErrors = ProfileFormErrors;
export type ProviderProfileActionState = ProfileActionState;
export type ValidatedProviderProfileUpdate = ValidatedProfileUpdate;

export const initialProviderProfileState: ProviderProfileActionState =
  initialProfileState;

export const validateProviderProfileUpdate = validateProfileUpdate;
