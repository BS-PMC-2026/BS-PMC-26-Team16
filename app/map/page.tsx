import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import MapClient from './MapClient'
import { isStationOpen } from '@/services/chargingStation'

export type ProviderStation = {
  id: string
  address: string
  lat: number
  lng: number
  providerName: string
  phone: string
  stationType: string
  openingTime: string | null
  closingTime: string | null
  isOpen: boolean
  isLocked: boolean
  averageRating: number | null
  ratingCount: number
}

export default async function MapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let providerStations: ProviderStation[] = []
  let userName = ''

  if (user) {
    const { data: stations } = await supabase
      .from('charging_stations')
      .select('id, address, lat, lng, user_id, station_type, opening_time, closing_time')
      .eq('is_approve', true)

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()

    userName = profile
      ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
      : user.email ?? ''

    if (stations?.length) {
      const stationIds = stations.map((s) => s.id)
      const userIds = stations.map((s) => s.user_id)

      const [{ data: profiles }, { data: activeVisits }, { data: ratingsData }] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name, phone').in('id', userIds),
        supabase.from('station_visits').select('station_id').in('status', ['on_the_way', 'arrived']).in('station_id', stationIds),
        supabase.from('ratings').select('station_id, score').in('station_id', stationIds),
      ])

      const profileMap = Object.fromEntries(
        (profiles ?? []).map((p) => [
          p.id,
          { name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(), phone: p.phone ?? '' },
        ])
      )

      const lockedStationIds = new Set((activeVisits ?? []).map((v) => v.station_id))

      const ratingMap = new Map<string, { total: number; count: number }>()
      for (const r of ratingsData ?? []) {
        const cur = ratingMap.get(r.station_id) ?? { total: 0, count: 0 }
        ratingMap.set(r.station_id, { total: cur.total + r.score, count: cur.count + 1 })
      }

      providerStations = stations.map((s) => {
        const rating = ratingMap.get(s.id)
        return {
          id: s.id,
          address: s.address,
          lat: s.lat,
          lng: s.lng,
          providerName: profileMap[s.user_id]?.name ?? '',
          phone: profileMap[s.user_id]?.phone ?? '',
          stationType: s.station_type ?? 'SLOW',
          openingTime: s.opening_time ?? null,
          closingTime: s.closing_time ?? null,
          isOpen: isStationOpen(s.opening_time ?? null, s.closing_time ?? null),
          isLocked: lockedStationIds.has(s.id),
          averageRating: rating ? rating.total / rating.count : null,
          ratingCount: rating?.count ?? 0,
        }
      })
    }
  }

  return (
    <main className="flex-1 overflow-hidden flex flex-col bg-gray-950 p-3">
      {user ? (
        <MapClient providerStations={providerStations} userName={userName} />
      ) : (
        <div className="flex-1 rounded-2xl border border-gray-700 bg-gray-800 flex flex-col items-center justify-center gap-4">
          <span className="text-7xl select-none">🔒</span>
          <p className="text-xl font-semibold text-white">Map locked</p>
          <p className="text-gray-400 text-sm">You must be logged in to view charging stations.</p>
          <Link
            href="/login"
            className="mt-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
          >
            Login
          </Link>
        </div>
      )}
    </main>
  )
}
