'use server'

import { refresh } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  initialAdminProfileState,
  validateAdminProfileUpdate,
  type AdminProfileActionState,
} from '@/services/adminProfile'
import {
  initialCustomerProfileState,
  validateCustomerProfileUpdate,
  type CustomerProfileActionState,
} from '@/services/customerProfile'
import {
  initialProviderProfileState,
  validateProviderProfileUpdate,
  type ProviderProfileActionState,
} from '@/services/providerProfile'

export async function updateAdminProfile(
  _previousState: AdminProfileActionState,
  formData: FormData
): Promise<AdminProfileActionState> {
  return updateProfileByRole({
    formData,
    expectedRole: 'admin',
    initialState: initialAdminProfileState,
    validate: validateAdminProfileUpdate,
    unauthorizedMessage: 'Only admins can update this profile.',
  })
}

export async function updateCustomerProfile(
  _previousState: CustomerProfileActionState,
  formData: FormData
): Promise<CustomerProfileActionState> {
  return updateProfileByRole({
    formData,
    expectedRole: 'customer',
    initialState: initialCustomerProfileState,
    validate: validateCustomerProfileUpdate,
    unauthorizedMessage: 'Only customers can update this profile.',
  })
}

export async function updateProviderProfile(
  _previousState: ProviderProfileActionState,
  formData: FormData
): Promise<ProviderProfileActionState> {
  return updateProfileByRole({
    formData,
    expectedRole: 'provider',
    initialState: initialProviderProfileState,
    validate: validateProviderProfileUpdate,
    unauthorizedMessage: 'Only providers can update this profile.',
  })
}

type SupportedProfileRole = 'admin' | 'customer' | 'provider'

type SharedProfileState = AdminProfileActionState

type UpdateProfileByRoleOptions = {
  formData: FormData
  expectedRole: SupportedProfileRole
  initialState: SharedProfileState
  validate: (values: {
    firstName: string
    lastName: string
    password: string
    confirmPassword: string
  }) =>
    | {
        success: true
        data: {
          firstName: string
          lastName: string
          password: string | null
        }
      }
    | {
        success: false
        errors: SharedProfileState['errors']
      }
  unauthorizedMessage: string
}

async function updateProfileByRole({
  formData,
  expectedRole,
  initialState,
  validate,
  unauthorizedMessage,
}: UpdateProfileByRoleOptions): Promise<SharedProfileState> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      ...initialState,
      message: 'You must be signed in to update this profile.',
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_type, is_approved')
    .eq('id', user.id)
    .single()

  if (
    profileError ||
    !profile ||
    profile.user_type !== expectedRole
  ) {
    return {
      ...initialState,
      message: unauthorizedMessage,
    }
  }

  const validated = validate({
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
    password: String(formData.get('password') ?? ''),
    confirmPassword: String(formData.get('confirmPassword') ?? ''),
  })

  if (!validated.success) {
    return {
      errors: validated.errors,
      message: 'Please fix the highlighted fields and try again.',
      success: false,
    }
  }

  const { firstName, lastName, password } = validated.data

  const { error: updateProfileError } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
    })
    .eq('id', user.id)

  if (updateProfileError) {
    return {
      ...initialState,
      message: updateProfileError.message,
    }
  }

  if (password) {
    const { error: updateAuthError } = await supabase.auth.updateUser({
      password,
    })

    if (updateAuthError) {
      return {
        ...initialState,
        message: updateAuthError.message,
      }
    }
  }

  refresh()

  return {
    errors: {},
    message: password
      ? 'Profile and password updated successfully.'
      : 'Profile updated successfully.',
    success: true,
  }
}
