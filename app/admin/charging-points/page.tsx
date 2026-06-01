import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChargingPointsClient from './ChargingPointsClient'
import { loadStationRows } from './data'

export default async function ChargingPointsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, is_approved')
    .eq('id', user.id)
    .single()
  if (!profile || profile.user_type !== 'admin' || !profile.is_approved) redirect('/')

  const allRows = await loadStationRows(supabase)

  return <ChargingPointsClient rows={allRows} />
}
