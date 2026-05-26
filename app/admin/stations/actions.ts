'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateProviderStation(
  stationId: string,
  data: {
    address: string
    lat: number
    lng: number
    station_type: string
    opening_time: string | null
    closing_time: string | null
  }
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, is_approved')
    .eq('id', user.id)
    .single()

  if (!profile || profile.user_type !== 'admin' || !profile.is_approved) {
    return { error: 'Admin access required.' }
  }

  const { error: dbError } = await supabase
    .from('charging_stations')
    .update(data)
    .eq('id', stationId)

  if (dbError) return { error: dbError.message }

  revalidatePath('/admin/stations')
  revalidatePath('/map')

  return {}
}

export async function deleteProviderStation(stationId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, is_approved')
    .eq('id', user.id)
    .single()

  if (!profile || profile.user_type !== 'admin' || !profile.is_approved) {
    return { error: 'Admin access required.' }
  }

  const { error: dbError } = await supabase
    .from('charging_stations')
    .delete()
    .eq('id', stationId)

  if (dbError) return { error: dbError.message }

  revalidatePath('/admin/stations')
  revalidatePath('/map')

  return {}
}

export async function approveProviderStation(stationId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, is_approved')
    .eq('id', user.id)
    .single()

  if (!profile || profile.user_type !== 'admin' || !profile.is_approved) {
    return { error: 'Admin access required.' }
  }

  const { data: station, error: stationError } = await supabase
    .from('charging_stations')
    .select('user_id')
    .eq('id', stationId)
    .single()

  if (stationError || !station) {
    return { error: stationError?.message ?? 'Station request not found.' }
  }

  const { error: stationUpdateError } = await supabase
    .from('charging_stations')
    .update({ is_approve: true })
    .eq('id', stationId)

  if (stationUpdateError) return { error: stationUpdateError.message }

  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({ user_type: 'provider', is_approved: true })
    .eq('id', station.user_id)

  if (profileUpdateError) return { error: profileUpdateError.message }

  revalidatePath('/admin')
  revalidatePath('/User')
  revalidatePath('/map')

  return {}
}
