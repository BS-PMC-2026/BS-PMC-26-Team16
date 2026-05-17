import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminDashboard, { type StationWithOwner } from './AdminDashboard'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, user_type, is_approved')
    .eq('id', user.id)
    .single()

  if (!profile || profile.user_type !== 'admin' || !profile.is_approved) redirect('/')

  const [{ data: pendingUsers }, { data: allStations }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone, id_number, user_type, request_reason, created_at')
      .eq('is_approved', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('charging_stations')
      .select('id, address, lat, lng, station_type, user_id')
      .order('id', { ascending: false }),
  ])

  let stations: StationWithOwner[] = []

  if (allStations?.length) {
    const userIds = [...new Set(allStations.map(s => s.user_id))]
    const { data: owners } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, phone')
      .in('id', userIds)

    const ownerMap = Object.fromEntries(
      (owners ?? []).map(p => [
        p.id,
        { name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(), phone: p.phone ?? '' },
      ])
    )

    stations = allStations.map(s => ({
      id: s.id,
      address: s.address,
      station_type: s.station_type,
      lat: s.lat,
      lng: s.lng,
      ownerName: ownerMap[s.user_id]?.name ?? '',
      ownerPhone: ownerMap[s.user_id]?.phone ?? '',
      access_type: 'PRIVATE' as const,
    }))
  }


  return (
    <AdminDashboard
      adminFirstName={profile.first_name ?? ''}
      adminLastName={profile.last_name ?? ''}
      adminEmail={profile.email ?? user.email ?? ''}
      pendingUsers={pendingUsers ?? []}
      stations={stations}
    />
  )
}
