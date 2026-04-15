'use server'

import { refresh } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  initialAdminProfileState,
  validateAdminProfileUpdate,
  type AdminProfileActionState,
} from '@/services/adminProfile'

export async function updateAdminProfile(
  _previousState: AdminProfileActionState,
  formData: FormData
): Promise<AdminProfileActionState> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      ...initialAdminProfileState,
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
    profile.user_type !== 'admin' ||
    profile.is_approved !== true
  ) {
    return {
      ...initialAdminProfileState,
      message: 'Only approved admins can update this profile.',
    }
  }

  const validated = validateAdminProfileUpdate({
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
      ...initialAdminProfileState,
      message: updateProfileError.message,
    }
  }

  if (password) {
    const { error: updateAuthError } = await supabase.auth.updateUser({
      password,
    })

    if (updateAuthError) {
      return {
        ...initialAdminProfileState,
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
