import {
  initialProfileState,
  validateProfileUpdate,
  type ProfileActionState,
  type ProfileFormErrors,
  type ProfileFormValues,
  type ValidatedProfileUpdate,
} from "./profileValidation";

export type AdminProfileFormValues = ProfileFormValues;
export type AdminProfileFormErrors = ProfileFormErrors;
export type AdminProfileActionState = ProfileActionState;
export type ValidatedAdminProfileUpdate = ValidatedProfileUpdate;

export const initialAdminProfileState: AdminProfileActionState =
  initialProfileState;

export const validateAdminProfileUpdate = validateProfileUpdate;
