'use client'

import { useActionState, useState } from 'react'
import { upsertChargingStation } from './actions'
import { initialChargingStationState } from '@/services/chargingStation'

type ChargingStation = {
  id: string
  address: string
  lat: number
  lng: number
  station_type: string
}

export default function ChargingStationForm({ existingStation }: { existingStation: ChargingStation | null }) {
  const [state, formAction, pending] = useActionState(upsertChargingStation, initialChargingStationState)
  const [address, setAddress] = useState(existingStation?.address ?? '')
  const [lat, setLat] = useState(existingStation?.lat?.toString() ?? '')
  const [lng, setLng] = useState(existingStation?.lng?.toString() ?? '')
  const [stationType, setStationType] = useState(
    existingStation?.station_type === 'FAST' ? 'FAST' : 'SLOW'
  )
  const [geocoding, setGeocoding] = useState(false)
  const [geoError, setGeoError] = useState('')

  async function geocodeAddress() {
    if (!address.trim()) return
    setGeocoding(true)
    setGeoError('')
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`)
      const data = await res.json()
      if (res.ok && data.lat != null && data.lng != null) {
        setLat(String(data.lat))
        setLng(String(data.lng))
      } else {
        setGeoError('Address not found. Please try a more specific address.')
      }
    } catch {
      setGeoError('Could not reach the geocoding service.')
    } finally {
      setGeocoding(false)
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude))
        setLng(String(pos.coords.longitude))
      },
      () => setGeoError('Could not get your location.')
    )
  }

  const messageTone = state.success
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
    : 'border-red-500/40 bg-red-500/10 text-red-200'

  return (
    <section className="mt-8 rounded-[2rem] border border-cyan-500/20 bg-slate-950/70 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-white">My Charging Station</h2>
        <p className="mt-1 text-sm text-gray-400">
          {existingStation
            ? 'Your station is listed on the map. Update its details below.'
            : 'Register your home charging station so customers can find it on the map.'}
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        {state.message && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${messageTone}`}>
            {state.message}
          </div>
        )}

        <div>
          <label htmlFor="stationAddress" className="mb-2 block text-sm font-medium text-gray-200">
            Address
          </label>
          <div className="flex gap-2">
            <input
              id="stationAddress"
              name="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Herzl St 1, Tel Aviv"
              required
              disabled={pending}
              className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400 placeholder:text-gray-500"
            />
            <button
              type="button"
              onClick={geocodeAddress}
              disabled={geocoding || pending || !address.trim()}
              className="rounded-2xl border border-cyan-500/30 bg-cyan-900/40 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-800/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {geocoding ? 'Locating…' : 'Locate →'}
            </button>
          </div>
          {state.errors.address && (
            <p className="mt-1 text-sm text-red-300">{state.errors.address[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="stationType" className="mb-2 block text-sm font-medium text-gray-200">
            Station Type
          </label>
          <select
            id="stationType"
            name="station_type"
            value={stationType}
            onChange={(e) => setStationType(e.target.value)}
            disabled={pending}
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
          >
            <option value="SLOW">Slow Charging</option>
            <option value="FAST">Fast Charging</option>
          </select>
          {state.errors.station_type && (
            <p className="mt-1 text-sm text-red-300">{state.errors.station_type[0]}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="stationLat" className="mb-2 block text-sm font-medium text-gray-200">
              Latitude
            </label>
            <input
              id="stationLat"
              name="lat"
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="31.78"
              required
              disabled={pending}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400 placeholder:text-gray-500"
            />
            {state.errors.lat && (
              <p className="mt-1 text-sm text-red-300">{state.errors.lat[0]}</p>
            )}
          </div>
          <div>
            <label htmlFor="stationLng" className="mb-2 block text-sm font-medium text-gray-200">
              Longitude
            </label>
            <input
              id="stationLng"
              name="lng"
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="35.21"
              required
              disabled={pending}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400 placeholder:text-gray-500"
            />
            {state.errors.lng && (
              <p className="mt-1 text-sm text-red-300">{state.errors.lng[0]}</p>
            )}
          </div>
        </div>

        {geoError && <p className="text-sm text-red-300">{geoError}</p>}

        <div className="flex items-center justify-between gap-4 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 px-5 py-4">
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={pending}
            className="text-sm text-cyan-300 transition hover:text-cyan-200 disabled:opacity-50"
          >
            📍 Use my current location
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Saving…' : existingStation ? 'Update station' : 'Register station'}
          </button>
        </div>
      </form>
    </section>
  )
}
