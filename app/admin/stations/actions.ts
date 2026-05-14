'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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
