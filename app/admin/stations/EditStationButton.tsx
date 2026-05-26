'use client'

import { useState, useTransition } from 'react'
import { updateProviderStation } from './actions'

type Station = {
  id: string
  address: string
  lat: number
  lng: number
  station_type: string
  opening_time: string | null
  closing_time: string | null
}

export default function EditStationButton({ station }: { station: Station }) {
  const [open, setOpen] = useState(false)
  const [address, setAddress] = useState(station.address)
  const [lat, setLat] = useState(station.lat.toString())
  const [lng, setLng] = useState(station.lng.toString())
  const [stationType, setStationType] = useState(station.station_type === 'FAST' ? 'FAST' : 'SLOW')
  const [openingTime, setOpeningTime] = useState(station.opening_time ?? '')
  const [closingTime, setClosingTime] = useState(station.closing_time ?? '')
  const [geocoding, setGeocoding] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, startSave] = useTransition()

  function openModal() {
    // reset to current DB values each time
    setAddress(station.address)
    setLat(station.lat.toString())
    setLng(station.lng.toString())
    setStationType(station.station_type === 'FAST' ? 'FAST' : 'SLOW')
    setOpeningTime(station.opening_time ?? '')
    setClosingTime(station.closing_time ?? '')
    setGeoError('')
    setSaveError('')
    setOpen(true)
  }

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
        setGeoError('Address not found. Try a more specific address.')
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
      () => setGeoError('Could not get your location.'),
    )
  }

  function handleSave() {
    const latNum = parseFloat(lat)
    const lngNum = parseFloat(lng)
    if (!address.trim() || isNaN(latNum) || isNaN(lngNum)) {
      setSaveError('Please fill in all required fields.')
      return
    }
    setSaveError('')
    startSave(async () => {
      const result = await updateProviderStation(station.id, {
        address: address.trim(),
        lat: latNum,
        lng: lngNum,
        station_type: stationType,
        opening_time: openingTime.trim() || null,
        closing_time: closingTime.trim() || null,
      })
      if (result.error) {
        setSaveError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  return (
    <>
      <button
        onClick={openModal}
        className="px-3 py-1.5 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold hover:bg-cyan-600/40 transition"
      >
        Edit Location
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-full max-w-lg rounded-3xl border border-cyan-500/20 bg-slate-950 p-6 shadow-2xl shadow-cyan-950/30">
            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Edit Station Location</h2>
                <p className="mt-0.5 text-xs text-gray-500">Update address and coordinates for this station.</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-white transition text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Address */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-200">Address</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Herzl St 1, Tel Aviv"
                    disabled={saving}
                    className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400 placeholder:text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={geocodeAddress}
                    disabled={geocoding || saving || !address.trim()}
                    className="rounded-2xl border border-cyan-500/30 bg-cyan-900/40 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-800/60 disabled:opacity-50"
                  >
                    {geocoding ? 'Locating…' : 'Locate →'}
                  </button>
                </div>
              </div>

              {/* Station Type */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-200">Station Type</label>
                <select
                  value={stationType}
                  onChange={(e) => setStationType(e.target.value)}
                  disabled={saving}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400"
                >
                  <option value="SLOW">Slow Charging</option>
                  <option value="FAST">Fast Charging</option>
                </select>
              </div>

              {/* Opening Hours */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-200">
                  Opening hours{' '}
                  <span className="text-gray-500 font-normal">(optional — leave empty for 24/7)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Opens at</label>
                    <input
                      type="time"
                      value={openingTime}
                      onChange={(e) => setOpeningTime(e.target.value)}
                      disabled={saving}
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Closes at</label>
                    <input
                      type="time"
                      value={closingTime}
                      onChange={(e) => setClosingTime(e.target.value)}
                      disabled={saving}
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400"
                    />
                  </div>
                </div>
                {(openingTime || closingTime) && (
                  <button
                    type="button"
                    onClick={() => { setOpeningTime(''); setClosingTime('') }}
                    className="mt-1.5 text-xs text-gray-500 hover:text-red-300 transition"
                  >
                    ✕ Clear hours (always open)
                  </button>
                )}
              </div>

              {/* Lat / Lng */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-200">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="31.78"
                    disabled={saving}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400 placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-200">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="35.21"
                    disabled={saving}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400 placeholder:text-gray-500"
                  />
                </div>
              </div>

              {geoError && <p className="text-xs text-red-300">{geoError}</p>}
              {saveError && <p className="text-xs text-red-300">{saveError}</p>}

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={saving}
                  className="text-sm text-cyan-300 transition hover:text-cyan-200 disabled:opacity-50"
                >
                  📍 Use my current location
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={saving}
                    className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-gray-300 transition hover:bg-white/10 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
