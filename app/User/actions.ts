'use server'

import { refresh, revalidatePath } from 'next/cache'
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
import {
  initialChargingStationState,
  validateChargingStation,
  type ChargingStationActionState,
} from '@/services/chargingStation'
import { REVIEW_WORD_LIMIT, getReviewWordCount, validateReviewScore } from '@/services/reviews'

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
    phone: String(formData.get('phone') ?? '') || null,
  })
}

export async function upsertChargingStation(
  _previousState: ChargingStationActionState,
  formData: FormData
): Promise<ChargingStationActionState> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ...initialChargingStationState, message: 'You must be signed in.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (!profile || profile.user_type !== 'provider') {
    return { ...initialChargingStationState, message: 'Only service providers can register charging stations.' }
  }

  const validated = validateChargingStation({
    address: String(formData.get('address') ?? ''),
    lat: String(formData.get('lat') ?? ''),
    lng: String(formData.get('lng') ?? ''),
    station_type: String(formData.get('station_type') ?? 'AC'),
    opening_time: String(formData.get('opening_time') ?? ''),
    closing_time: String(formData.get('closing_time') ?? ''),
  })

  if (!validated.success) {
    return { errors: validated.errors, message: 'Please fix the highlighted fields and try again.', success: false }
  }

  const { address, lat, lng, station_type, opening_time, closing_time } = validated.data

  const { data: existing } = await supabase
    .from('charging_stations')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  // Preserve approval status: keep existing approved stations approved on update,
  // but new stations must wait for admin approval.
  const isApprove = existing
    ? undefined // don't touch is_approve on updates — admin may have already approved
    : false

  const stationData = {
    address,
    lat,
    lng,
    station_type,
    opening_time,
    closing_time,
    ...(isApprove !== undefined ? { is_approve: isApprove } : {}),
  }

  const { error: dbError } = existing
    ? await supabase.from('charging_stations').update(stationData).eq('user_id', user.id)
    : await supabase.from('charging_stations').insert({ user_id: user.id, ...stationData, is_approve: false })

  if (dbError) {
    return { ...initialChargingStationState, message: dbError.message }
  }

  refresh()
  revalidatePath('/map')

  return {
    errors: {},
    message: existing
      ? 'Charging station updated successfully.'
      : 'Charging station registered. An admin will review it soon.',
    success: true,
  }
}

export async function requestChargingStation(
  _previousState: ChargingStationActionState,
  formData: FormData
): Promise<ChargingStationActionState> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ...initialChargingStationState, message: 'You must be signed in.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (!profile || profile.user_type !== 'customer') {
    return { ...initialChargingStationState, message: 'Only customers can request a new charging station.' }
  }

  const validated = validateChargingStation({
    address: String(formData.get('address') ?? ''),
    lat: String(formData.get('lat') ?? ''),
    lng: String(formData.get('lng') ?? ''),
    station_type: String(formData.get('station_type') ?? 'SLOW'),
    opening_time: String(formData.get('opening_time') ?? ''),
    closing_time: String(formData.get('closing_time') ?? ''),
  })

  if (!validated.success) {
    return { errors: validated.errors, message: 'Please fix the highlighted fields and try again.', success: false }
  }

  const { address, lat, lng, station_type, opening_time, closing_time } = validated.data

  const { data: existing } = await supabase
    .from('charging_stations')
    .select('id, is_approve')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing?.is_approve === true) {
    return {
      ...initialChargingStationState,
      message: 'You already have an approved charging station.',
    }
  }

  const stationData = {
    address,
    lat,
    lng,
    station_type,
    opening_time,
    closing_time,
    is_approve: false,
  }

  const { error: dbError } = existing
    ? await supabase.from('charging_stations').update(stationData).eq('id', existing.id)
    : await supabase.from('charging_stations').insert({ user_id: user.id, ...stationData })

  if (dbError) {
    return { ...initialChargingStationState, message: dbError.message }
  }

  refresh()
  revalidatePath('/admin')

  return {
    errors: {},
    message: existing
      ? 'Station request updated. It is waiting for admin approval.'
      : 'Station request sent. An admin will review it soon.',
    success: true,
  }
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
    email: string
    currentEmail?: string
    password: string
    confirmPassword: string
  }) =>
    | {
        success: true
        data: {
          firstName: string
          lastName: string
          email: string
          emailChanged: boolean
          password: string | null
        }
      }
    | {
        success: false
        errors: SharedProfileState['errors']
      }
  unauthorizedMessage: string
  phone?: string | null
}

async function updateProfileByRole({
  formData,
  expectedRole,
  initialState,
  validate,
  unauthorizedMessage,
  phone,
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
    email: String(formData.get('email') ?? ''),
    currentEmail: String(formData.get('currentEmail') ?? ''),
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

  const { firstName, lastName, email, emailChanged, password } = validated.data

  const { error: updateProfileError } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      email,
      ...(phone !== undefined ? { phone } : {}),
    })
    .eq('id', user.id)

  if (updateProfileError) {
    return {
      ...initialState,
      message: updateProfileError.message,
    }
  }

  if (emailChanged) {
    const { error: updateEmailError } = await supabase.auth.updateUser({
      email,
    })

    if (updateEmailError) {
      return {
        ...initialState,
        message: updateEmailError.message,
      }
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
    message:
      emailChanged && password
        ? 'Profile, email, and password updated successfully. Please check your inbox if email confirmation is required.'
        : emailChanged
          ? 'Profile and email updated successfully. Please check your inbox if email confirmation is required.'
          : password
            ? 'Profile and password updated successfully.'
            : 'Profile updated successfully.',
    success: true,
  }
}

export async function deleteChargingStation(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be signed in.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (!profile || profile.user_type !== 'provider') {
    return { error: 'Only service providers can remove their charging station.' }
  }

  const { error: dbError } = await supabase
    .from('charging_stations')
    .delete()
    .eq('user_id', user.id)

  if (dbError) {
    return { error: dbError.message }
  }

  refresh()
  revalidatePath('/map')
  revalidatePath('/User')
  return {}
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('recipient_id', user.id)
}

export async function markArrived(visitId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: visit } = await supabase
    .from('station_visits')
    .select('station_id, visitor_name')
    .eq('id', visitId)
    .eq('visitor_id', user.id)
    .eq('status', 'on_the_way')
    .single()

  if (!visit) return { error: 'Visit not found.' }

  const { error } = await supabase
    .from('station_visits')
    .update({ status: 'arrived' })
    .eq('id', visitId)
    .eq('visitor_id', user.id)

  if (error) return { error: error.message }

  // Notify provider that customer arrived
  const { data: station } = await supabase
    .from('charging_stations')
    .select('user_id, address')
    .eq('id', visit.station_id)
    .single()

  if (station && station.user_id !== user.id) {
    await supabase.from('notifications').insert({
      recipient_id: station.user_id,
      station_id: visit.station_id,
      message: `✅ ${visit.visitor_name ?? 'A customer'} has arrived at your station at ${station.address}`,
    })
  }

  revalidatePath('/User')
  return {}
}

export async function completeVisit(visitId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('station_visits')
    .update({ status: 'completed' })
    .eq('id', visitId)
    .eq('visitor_id', user.id)
    .eq('status', 'arrived')

  if (error) return { error: error.message }
  revalidatePath('/User')
  return {}
}

export async function completeVisitAsProvider(visitId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: visit } = await supabase
    .from('station_visits')
    .select('station_id')
    .eq('id', visitId)
    .eq('status', 'arrived')
    .single()

  if (!visit) return { error: 'Visit not found.' }

  const { data: station } = await supabase
    .from('charging_stations')
    .select('user_id')
    .eq('id', visit.station_id)
    .single()

  if (!station || station.user_id !== user.id) {
    return { error: 'Only the station owner can finish this charging session.' }
  }

  const { error } = await supabase
    .from('station_visits')
    .update({ status: 'completed' })
    .eq('id', visitId)
    .eq('status', 'arrived')

  if (error) return { error: error.message }

  revalidatePath('/User')
  revalidatePath('/map')
  return {}
}

export async function cancelVisit(visitId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Allow visitor OR the station owner to cancel (any active status)
  const { data: visit } = await supabase
    .from('station_visits')
    .select('visitor_id, station_id')
    .eq('id', visitId)
    .in('status', ['on_the_way', 'arrived'])
    .single()

  if (!visit) return { error: 'Visit not found or already resolved.' }

  const isVisitor = visit.visitor_id === user.id
  const { data: station } = isVisitor ? { data: null } : await supabase
    .from('charging_stations')
    .select('user_id')
    .eq('id', visit.station_id)
    .single()

  if (!isVisitor && station?.user_id !== user.id) {
    return { error: 'Not authorized.' }
  }

  const { error } = await supabase
    .from('station_visits')
    .update({ status: 'cancelled' })
    .eq('id', visitId)

  if (error) return { error: error.message }
  revalidatePath('/User')
  return {}
}

export async function submitRating(
  visitId: string,
  score: number,
  comment: string
): Promise<{ error?: string }> {
  const trimmedComment = comment.trim()
  const reviewWordCount = getReviewWordCount(trimmedComment)

  if (!validateReviewScore(score)) {
    return { error: 'Please select a rating from 1 to 5.' }
  }

  if (reviewWordCount > REVIEW_WORD_LIMIT) {
    return { error: `Written reviews can be up to ${REVIEW_WORD_LIMIT} words.` }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: visit } = await supabase
    .from('station_visits')
    .select('station_id, visitor_id')
    .eq('id', visitId)
    .eq('status', 'completed')
    .single()

  if (!visit || visit.visitor_id !== user.id) return { error: 'Visit not found.' }

  const { data: station } = await supabase
    .from('charging_stations')
    .select('user_id')
    .eq('id', visit.station_id)
    .single()

  if (!station) return { error: 'Station not found.' }

  const { error } = await supabase.from('ratings').insert({
    visit_id: visitId,
    reviewer_id: user.id,
    provider_id: station.user_id,
    station_id: visit.station_id,
    score,
    comment: trimmedComment || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/User')
  return {}
}
