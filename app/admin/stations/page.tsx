import { redirect } from 'next/navigation'
import { readFile } from 'fs/promises'
import path from 'path'
import { createClient } from '@/lib/supabase/server'
import DeleteStationButton from './DeleteStationButton'

const GEOJSON_PREVIEW_LIMIT = 100

type SearchParams = Promise<{
  search?: string
  type?: string
  geoSearch?: string
  geoOp?: string
}>

export default async function AdminStationsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, is_approved')
    .eq('id', user.id)
    .single()

  if (!profile || profile.user_type !== 'admin' || !profile.is_approved) redirect('/')

  const { data: allProviderStations } = await supabase
    .from('charging_stations')
    .select('id, address, lat, lng, station_type, user_id')
    .order('id', { ascending: false })

  let ownerMap: Record<string, { name: string; phone: string }> = {}
  if (allProviderStations?.length) {
    const userIds = allProviderStations.map((s) => s.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, phone')
      .in('id', userIds)
    ownerMap = Object.fromEntries(
      (profiles ?? []).map((p) => [
        p.id,
        { name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(), phone: p.phone ?? '' },
      ])
    )
  }

  const search = params.search?.trim().toLowerCase() ?? ''
  const typeFilter = params.type ?? ''

  const providerStations = (allProviderStations ?? []).filter((s) => {
    const owner = ownerMap[s.user_id]
    const matchesSearch =
      !search ||
      owner?.name.toLowerCase().includes(search) ||
      owner?.phone.includes(search) ||
      s.address.toLowerCase().includes(search)
    const matchesType = !typeFilter || s.station_type === typeFilter
    return matchesSearch && matchesType
  })

  const geojsonRaw = await readFile(
    path.join(process.cwd(), 'public', 'AGG_CHARGE_STATIONS.geojson'),
    'utf-8'
  )
  const geojson = JSON.parse(geojsonRaw)
  const allGeoStations: { name: string; op: string; address: string; count: number; fast: number; slow: number }[] =
    geojson.features.map((f: { properties: Record<string, unknown> }) => ({
      name: String(f.properties.name ?? ''),
      op: String(f.properties.op ?? ''),
      address: String(f.properties.Address ?? ''),
      count: Number(f.properties.count ?? 0),
      fast: Number(f.properties.cnt_fast ?? 0),
      slow: Number(f.properties.cnt_slow ?? 0),
    }))

  const geoSearch = params.geoSearch?.trim().toLowerCase() ?? ''
  const geoOp = params.geoOp?.trim().toLowerCase() ?? ''

  const filteredGeo = allGeoStations.filter((s) => {
    const matchesSearch =
      !geoSearch ||
      s.name.toLowerCase().includes(geoSearch) ||
      s.address.toLowerCase().includes(geoSearch)
    const matchesOp = !geoOp || s.op.toLowerCase().includes(geoOp)
    return matchesSearch && matchesOp
  })

  const geoPreview = filteredGeo.slice(0, GEOJSON_PREVIEW_LIMIT)

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* Header */}
        <div>
          <div className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-sm font-medium text-cyan-100 mb-4">
            Admin Panel
          </div>
          <h1 className="text-3xl font-bold">Charging Stations</h1>
          <p className="mt-2 text-gray-400 text-sm">Manage provider-registered and pre-loaded charging stations.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-gray-400">Provider Stations</p>
            <p className="mt-1 text-3xl font-bold text-cyan-300">{allProviderStations?.length ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-gray-400">Pre-loaded Stations</p>
            <p className="mt-1 text-3xl font-bold text-cyan-300">{allGeoStations.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-gray-400">Total on Map</p>
            <p className="mt-1 text-3xl font-bold text-cyan-300">
              {(allProviderStations?.length ?? 0) + allGeoStations.length}
            </p>
          </div>
        </div>

        {/* Provider Stations */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            🏠 Provider Stations
            <span className="text-sm font-normal text-gray-400">— added by users</span>
          </h2>

          {/* Provider Filters */}
          <form method="GET" className="mb-4 flex flex-wrap gap-3 items-end">
            <input type="hidden" name="geoSearch" value={params.geoSearch ?? ''} />
            <input type="hidden" name="geoOp" value={params.geoOp ?? ''} />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 uppercase tracking-wider">Search</label>
              <input
                type="text"
                name="search"
                defaultValue={params.search ?? ''}
                placeholder="Name, address, phone…"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400 placeholder:text-gray-500 w-56"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 uppercase tracking-wider">Station Type</label>
              <select
                name="type"
                defaultValue={params.type ?? ''}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400"
              >
                <option value="">All Types</option>
                <option value="FAST">Fast Charging</option>
                <option value="SLOW">Slow Charging</option>
              </select>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-cyan-600/40 border border-cyan-500/30 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-600/60 transition"
            >
              Filter
            </button>
            <a
              href="/admin/stations"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition"
            >
              Clear
            </a>
          </form>

          {!providerStations.length ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-8 text-center text-gray-400">
              No provider stations found.
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Provider</th>
                    <th className="px-4 py-3 text-left">Phone</th>
                    <th className="px-4 py-3 text-left">Address</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Coords</th>
                    <th className="px-4 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {providerStations.map((s) => {
                    const owner = ownerMap[s.user_id]
                    return (
                      <tr key={s.id} className="hover:bg-white/5 transition">
                        <td className="px-4 py-3 text-white font-medium">{owner?.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-300">{owner?.phone || '—'}</td>
                        <td className="px-4 py-3 text-gray-300">{s.address}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            s.station_type === 'FAST'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}>
                            {s.station_type === 'FAST' ? 'Fast' : 'Slow'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{s.lat.toFixed(4)}, {s.lng.toFixed(4)}</td>
                        <td className="px-4 py-3">
                          <DeleteStationButton stationId={s.id} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Pre-loaded Stations */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            ⚡ Pre-loaded Stations
            <span className="text-sm font-normal text-gray-400">
              — showing {geoPreview.length} of {filteredGeo.length}
              {geoSearch || geoOp ? ` (filtered from ${allGeoStations.length})` : ''}
            </span>
          </h2>

          {/* GeoJSON Filters */}
          <form method="GET" className="mb-4 flex flex-wrap gap-3 items-end">
            <input type="hidden" name="search" value={params.search ?? ''} />
            <input type="hidden" name="type" value={params.type ?? ''} />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 uppercase tracking-wider">Search</label>
              <input
                type="text"
                name="geoSearch"
                defaultValue={params.geoSearch ?? ''}
                placeholder="Name or address…"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400 placeholder:text-gray-500 w-56"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 uppercase tracking-wider">Operator</label>
              <input
                type="text"
                name="geoOp"
                defaultValue={params.geoOp ?? ''}
                placeholder="e.g. SonolEvi"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400 placeholder:text-gray-500 w-40"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-cyan-600/40 border border-cyan-500/30 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-600/60 transition"
            >
              Filter
            </button>
            <a
              href="/admin/stations"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition"
            >
              Clear
            </a>
          </form>

          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Operator</th>
                  <th className="px-4 py-3 text-left">Address</th>
                  <th className="px-4 py-3 text-left">Total</th>
                  <th className="px-4 py-3 text-left">Fast</th>
                  <th className="px-4 py-3 text-left">Slow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {geoPreview.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No stations found.</td>
                  </tr>
                ) : geoPreview.map((s, i) => (
                  <tr key={i} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3 text-white">{s.name}</td>
                    <td className="px-4 py-3 text-gray-400">{s.op}</td>
                    <td className="px-4 py-3 text-gray-400">{s.address}</td>
                    <td className="px-4 py-3 text-cyan-300 font-medium">{s.count}</td>
                    <td className="px-4 py-3 text-amber-300">{s.fast}</td>
                    <td className="px-4 py-3 text-blue-300">{s.slow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  )
}
