import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import MapClient from './MapClient'

export type ProviderStation = {
  id: string
  address: string
  lat: number
  lng: number
  providerName: string
  phone: string
  stationType: string
}

export default async function MapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let providerStations: ProviderStation[] = []

  if (user) {
    const { data: stations } = await supabase
      .from('charging_stations')
      .select('id, address, lat, lng, user_id, station_type')

    if (stations?.length) {
      const userIds = stations.map((s) => s.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .in('id', userIds)

      const profileMap = Object.fromEntries(
        (profiles ?? []).map((p) => [
          p.id,
          {
            name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
            phone: p.phone ?? '',
          },
        ])
      )

      providerStations = stations.map((s) => ({
        id: s.id,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        providerName: profileMap[s.user_id]?.name ?? '',
        phone: profileMap[s.user_id]?.phone ?? '',
        stationType: s.station_type ?? 'AC',
      }))
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-4xl bg-gray-900 rounded-2xl shadow-2xl p-6">
        <h2 className="text-2xl font-bold mb-4">Looking for a Charger?</h2>

        {user ? (
          <MapClient providerStations={providerStations} />
        ) : (
          <div className="relative w-full h-125 rounded-xl overflow-hidden bg-gray-800 flex flex-col items-center justify-center gap-4">
            <div className="absolute inset-0 bg-gray-800 opacity-90 rounded-xl" />
            <div className="relative z-10 flex flex-col items-center gap-4 text-center px-6">
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
          </div>
        )}
      </div>
    </main>
  )
}
