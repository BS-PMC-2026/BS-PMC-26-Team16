'use client'

import { useActionState, useState, useTransition } from 'react'
import { upsertChargingStation, deleteChargingStation } from './actions'
import { initialChargingStationState } from '@/services/chargingStation'

type ChargingStation = {
  id: string
  address: string
  lat: number
  lng: number
  station_type: string
  opening_time: string | null
  closing_time: string | null
}

export default function ChargingStationForm({ existingStation }: { existingStation: ChargingStation | null }) {
  const [state, formAction, pending] = useActionState(upsertChargingStation, initialChargingStationState)
  const [address, setAddress] = useState(existingStation?.address ?? '')
  const [lat, setLat] = useState(existingStation?.lat?.toString() ?? '')
  const [lng, setLng] = useState(existingStation?.lng?.toString() ?? '')
  const [stationType, setStationType] = useState(
    existingStation?.station_type === 'FAST' ? 'FAST' : 'SLOW'
  )
  const [openingTime, setOpeningTime] = useState(existingStation?.opening_time ?? '')
  const [closingTime, setClosingTime] = useState(existingStation?.closing_time ?? '')
  const [geocoding, setGeocoding] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, startDelete] = useTransition()

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

  function handleDeleteClick() {
    setDeleteError('')
    setConfirmDelete(true)
  }

  function handleDeleteCancel() {
    setConfirmDelete(false)
    setDeleteError('')
  }

  function handleDeleteConfirm() {
    startDelete(async () => {
      const result = await deleteChargingStation()
      if (result.error) {
        setDeleteError(result.error)
      }
      // Always close the confirm dialog — on success the page will
      // re-render with existingStation=null and the form resets itself.
      setConfirmDelete(false)
    })
  }

  const messageTone = state.success
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
    : 'border-red-500/40 bg-red-500/10 text-red-200'

  return (
    <section className="mt-8 rounded-4xl border border-cyan-500/20 bg-slate-950/70 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">My Charging Station</h2>
          <p className="mt-1 text-sm text-gray-400">
            {existingStation
              ? 'Your station is listed on the map. Update its details below.'
              : 'Register your home charging station so customers can find it on the map.'}
          </p>
        </div>
        {existingStation && !confirmDelete && (
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={pending || deleting}
            className="shrink-0 rounded-2xl border border-red-500/30 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-900/60 hover:text-red-200 disabled:opacity-50"
          >
            🗑 Remove Station
          </button>
        )}
      </div>

      {confirmDelete && (
        <div className="mb-5 rounded-2xl border border-red-500/40 bg-red-950/30 px-5 py-4">
          {deleting ? (
            <p className="text-sm font-semibold text-red-300 animate-pulse">⏳ Removing your station…</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-red-200">Remove your station?</p>
              <p className="mt-1 text-xs text-red-300/70">
                This will permanently delete your charging station from the map and the database. This action cannot be undone.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                >
                  Yes, remove it
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCancel}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-gray-300 transition hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {deleteError && (
        <div className="mb-5 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {deleteError}
        </div>
      )}

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

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-200">
            Opening hours <span className="text-gray-400">(optional — if not set, station is always open)</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="openingTime" className="mb-1 block text-xs text-gray-400">Opens at</label>
              <input
                id="openingTime"
                name="opening_time"
                type="time"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              />
              {state.errors.opening_time && (
                <p className="mt-1 text-sm text-red-300">{state.errors.opening_time[0]}</p>
              )}
            </div>
            <div>
              <label htmlFor="closingTime" className="mb-1 block text-xs text-gray-400">Closes at</label>
              <input
                id="closingTime"
                name="closing_time"
                type="time"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              />
              {state.errors.closing_time && (
                <p className="mt-1 text-sm text-red-300">{state.errors.closing_time[0]}</p>
              )}
            </div>
          </div>
          {(openingTime || closingTime) && (
            <button
              type="button"
              onClick={() => { setOpeningTime(''); setClosingTime('') }}
              className="mt-2 text-xs text-gray-400 hover:text-red-300 transition"
            >
              ✕ Clear hours (always open)
            </button>
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
