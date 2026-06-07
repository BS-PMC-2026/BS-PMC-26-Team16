import { redirect } from 'next/navigation'
import { readFile } from 'fs/promises'
import path from 'path'
import { createClient } from '@/lib/supabase/server'
import AdminDashboard, { type ContactMessage, type StationWithOwner } from './AdminDashboard'
import { loadStationRows } from './charging-points/data'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, user_type, is_approved')
    .eq('id', user.id)
    .single()

  if (!profile || profile.user_type !== 'admin' || !profile.is_approved) redirect('/')

  const [
    { data: pendingUsers },
    { data: stationRequests },
    { count: activeUserCount },
    { count: approvedPrivateStationCount },
    { data: contactMessages },
    managedStations,
    geojsonRaw,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone, id_number, user_type, request_reason, created_at')
      .eq('is_approved', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('charging_stations')
      .select('id, address, lat, lng, station_type, user_id')
      .eq('is_approve', false)
      .order('id', { ascending: false }),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved', true)
      .neq('user_type', 'admin'),
    supabase
      .from('charging_stations')
      .select('*', { count: 'exact', head: true })
      .eq('is_approve', true),
    supabase
      .from('contact_messages')
      .select('id, name, email, subject, message, status, admin_response, created_at, responded_at')
      .order('created_at', { ascending: false }),
    loadStationRows(supabase),
    readFile(path.join(process.cwd(), 'public', 'AGG_CHARGE_STATIONS.geojson'), 'utf-8'),
  ])

  const geoStationCount: number = JSON.parse(geojsonRaw).features.length

  let stations: StationWithOwner[] = []

  if (stationRequests?.length) {
    const userIds = [...new Set(stationRequests.map(s => s.user_id))]
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

    stations = stationRequests.map(s => ({
      id: s.id,
      userId: s.user_id,
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
      contactMessages={(contactMessages ?? []) as ContactMessage[]}
      managedStations={managedStations}
      totalActiveUsers={activeUserCount ?? 0}
      totalMapStations={geoStationCount + (approvedPrivateStationCount ?? 0)}
    />
  )
}
