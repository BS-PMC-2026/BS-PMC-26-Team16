'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Script from 'next/script'
import type { StationRow, Review } from './page'
import {
  addAdminStation,
  deleteChargingPoint,
  deleteGeoStation,
  updateProviderStationAddress,
  updateGeoStationAddress,
  updateProviderStationLocation,
  updateGeoStationLocation,
  sendFeedbackEmail,
  deleteReview,
} from './actions'

// ─── Icons ────────────────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Stars({ score }: { score: number }) {
  return (
    <span className="text-amber-400 text-xs">
      {'★'.repeat(score)}{'☆'.repeat(5 - score)}
    </span>
  )
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className={`text-sm font-semibold text-white ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
      <p className="text-xs text-gray-600 mt-0.5">{label}</p>
    </div>
  )
}

function FilterCheckbox({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-gray-400 hover:bg-white/5 hover:text-white transition"
    >
      <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${checked ? 'bg-cyan-500 border-cyan-500' : 'border-white/20'}`}>
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      {label}
    </button>
  )
}

// ─── Send email button ────────────────────────────────────────────────────────

function SendEmailButton({ ratingId }: { ratingId: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [isPending, startTransition] = useTransition()

  function handleSend() {
    if (status === 'sent') return
    setStatus('sending')
    startTransition(async () => {
      const result = await sendFeedbackEmail(ratingId)
      if (result.error) { setStatus('error'); alert(result.error) }
      else setStatus('sent')
    })
  }

  return (
    <button
      onClick={handleSend}
      disabled={isPending || status === 'sent'}
      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition disabled:opacity-60 ${
        status === 'sent'
          ? 'bg-green-600/20 border border-green-500/30 text-green-300'
          : status === 'error'
          ? 'bg-red-600/20 border border-red-500/30 text-red-300 hover:bg-red-600/40'
          : 'bg-cyan-600/20 border border-cyan-500/30 text-cyan-200 hover:bg-cyan-600/40'
      }`}
    >
      {status === 'sent' ? 'Sent ✓' : status === 'sending' ? '…' : 'Send Email'}
    </button>
  )
}

// ─── Delete review button ─────────────────────────────────────────────────────

function DeleteReviewButton({ ratingId, onDeleted }: { ratingId: string; onDeleted: () => void }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Delete this review? This cannot be undone.')) return
    startTransition(async () => {
      const result = await deleteReview(ratingId)
      if (result.error) alert(result.error)
      else onDeleted()
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-red-600/20 border border-red-500/30 text-red-300 hover:bg-red-600/40 disabled:opacity-50 transition"
    >
      {isPending ? '…' : 'Delete'}
    </button>
  )
}

// ─── Location picker map ──────────────────────────────────────────────────────

function LocationPickerMap({
  initialLat,
  initialLng,
  onPick,
}: {
  initialLat: number | null
  initialLng: number | null
  onPick: (lat: number, lng: number) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  async function initMap() {
    if (!mapRef.current || !window.google) return
    const center =
      initialLat !== null && initialLng !== null
        ? { lat: initialLat, lng: initialLng }
        : { lat: 31.5, lng: 34.75 }

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: initialLat !== null ? 14 : 7,
      mapId: 'urban-ev-picker',
      disableDefaultUI: true,
      zoomControl: true,
    })

    const { AdvancedMarkerElement } = (await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary

    if (initialLat !== null && initialLng !== null) {
      const pin = document.createElement('div')
      pin.innerHTML = '<span style="font-size:24px;line-height:1">📍</span>'
      markerRef.current = new AdvancedMarkerElement({ position: { lat: initialLat, lng: initialLng }, map, content: pin })
    }

    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return
      const lat = e.latLng.lat()
      const lng = e.latLng.lng()
      if (markerRef.current) {
        markerRef.current.position = { lat, lng }
      } else {
        const pin = document.createElement('div')
        pin.innerHTML = '<span style="font-size:24px;line-height:1">📍</span>'
        markerRef.current = new AdvancedMarkerElement({ position: { lat, lng }, map, content: pin })
      }
      onPickRef.current(lat, lng)
    })
  }

  useEffect(() => {
    if (window.google?.maps) {
      initMap()
    } else {
      window.addEventListener('google-maps-loaded', initMap, { once: true })
      return () => window.removeEventListener('google-maps-loaded', initMap)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={mapRef} className="w-full h-44 rounded-xl overflow-hidden cursor-crosshair border border-white/10" />
  )
}

// ─── Edit location modal ──────────────────────────────────────────────────────

function EditLocationModal({ row, onClose }: { row: StationRow; onClose: () => void }) {
  const initialLat = row.source === 'provider' ? row.providerLat : row.geoLat
  const initialLng = row.source === 'provider' ? row.providerLng : row.geoLng

  const [address, setAddress] = useState(row.address)
  const [lat, setLat] = useState<number | null>(initialLat)
  const [lng, setLng] = useState<number | null>(initialLng)
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  async function geocodeAddress() {
    if (!address.trim()) return
    setGeocoding(true)
    setGeocodeError('')
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`)
      if (!res.ok) setGeocodeError('Address not found.')
      else {
        const data = await res.json()
        setLat(data.lat)
        setLng(data.lng)
      }
    } catch {
      setGeocodeError('Failed to geocode.')
    } finally {
      setGeocoding(false)
    }
  }

  function handleSubmit() {
    if (lat === null || lng === null) { setError('Please set a location.'); return }
    const trimmed = address.trim()
    if (!trimmed) { setError('Address cannot be empty.'); return }
    setError('')
    startTransition(async () => {
      const result =
        row.source === 'provider'
          ? await updateProviderStationLocation(row.providerId!, lat, lng, trimmed)
          : await updateGeoStationLocation(row.geoLat!, row.geoLng!, lat, lng, trimmed)
      if (result.error) setError(result.error)
      else onClose()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-gray-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-bold text-white">Edit Location</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl font-bold">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-400 uppercase tracking-wider">Address</label>
            <div className="flex gap-2">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter address…"
                className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400 placeholder:text-gray-500"
              />
              <button
                type="button"
                onClick={geocodeAddress}
                disabled={geocoding || !address.trim()}
                className="px-4 py-2 rounded-xl bg-cyan-600/40 border border-cyan-500/30 text-sm text-cyan-100 hover:bg-cyan-600/60 disabled:opacity-50 transition whitespace-nowrap"
              >
                {geocoding ? 'Locating…' : 'Geocode'}
              </button>
            </div>
            {geocodeError && <p className="text-xs text-red-400">{geocodeError}</p>}
          </div>

          <div className="space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Click map to pick location</p>
            <LocationPickerMap initialLat={lat} initialLng={lng} onPick={(newLat, newLng) => { setLat(newLat); setLng(newLng) }} />
            {lat !== null && lng !== null && (
              <p className="text-xs text-green-400">Selected: {lat.toFixed(5)}, {lng.toFixed(5)}</p>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending || lat === null}
              className="flex-1 py-2.5 rounded-xl bg-cyan-600 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isPending ? 'Saving…' : 'Save Location'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Edit address modal ───────────────────────────────────────────────────────

function EditAddressModal({ row, onClose }: { row: StationRow; onClose: () => void }) {
  const [address, setAddress] = useState(row.address)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleSubmit() {
    const trimmed = address.trim()
    if (!trimmed) { setError('Address cannot be empty.'); return }
    setError('')
    startTransition(async () => {
      const result =
        row.source === 'provider'
          ? await updateProviderStationAddress(row.providerId!, trimmed)
          : await updateGeoStationAddress(row.geoLat!, row.geoLng!, trimmed)
      if (result.error) setError(result.error)
      else onClose()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-bold text-white">Edit Address</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl font-bold">×</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} className="px-6 py-5 space-y-4">
          {row.geoName && (
            <p className="text-sm text-gray-400">Station: <span className="text-gray-200">{row.geoName}</span></p>
          )}
          <div className="space-y-1">
            <label className="text-xs text-gray-400 uppercase tracking-wider">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition">Cancel</button>
            <button type="submit" disabled={isPending} className="flex-1 py-2.5 rounded-xl bg-cyan-600 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50 transition">
              {isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Add station modal ────────────────────────────────────────────────────────

function AddStationModal({ onClose }: { onClose: () => void }) {
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  async function geocodeAddress() {
    if (!address.trim()) return
    setGeocoding(true)
    setGeocodeError('')
    setLat(null)
    setLng(null)
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`)
      if (!res.ok) setGeocodeError('Address not found. Try a more specific address in Israel.')
      else {
        const data = await res.json()
        setLat(data.lat)
        setLng(data.lng)
      }
    } catch {
      setGeocodeError('Failed to geocode. Check your connection.')
    } finally {
      setGeocoding(false)
    }
  }

  function handleSubmit() {
    if (lat === null || lng === null) { setError('Please geocode the address before submitting.'); return }
    setError('')
    const formData = new FormData(formRef.current!)
    formData.set('lat', String(lat))
    formData.set('lng', String(lng))
    startTransition(async () => {
      const result = await addAdminStation(formData)
      if (result.error) setError(result.error)
      else onClose()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-gray-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Add Charging Point</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl font-bold">×</button>
        </div>
        <form ref={formRef} onSubmit={(e) => { e.preventDefault(); handleSubmit() }} className="px-6 py-5 space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-400 uppercase tracking-wider">Address</label>
            <div className="flex gap-2">
              <input
                name="address"
                value={address}
                onChange={(e) => { setAddress(e.target.value); setLat(null); setLng(null) }}
                placeholder="e.g. Rothschild Blvd 10, Tel Aviv"
                required
                className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400 placeholder:text-gray-500"
              />
              <button
                type="button"
                onClick={geocodeAddress}
                disabled={geocoding || !address.trim()}
                className="px-4 py-2 rounded-xl bg-cyan-600/40 border border-cyan-500/30 text-sm text-cyan-100 hover:bg-cyan-600/60 disabled:opacity-50 transition whitespace-nowrap"
              >
                {geocoding ? 'Locating…' : 'Geocode'}
              </button>
            </div>
            {geocodeError && <p className="text-xs text-red-400">{geocodeError}</p>}
            {lat !== null && lng !== null && (
              <p className="text-xs text-green-400">Located: {lat.toFixed(5)}, {lng.toFixed(5)}</p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 uppercase tracking-wider">Charging Type</label>
            <select
              name="station_type"
              defaultValue="SLOW"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400"
            >
              <option value="SLOW">Slow Charging (AC)</option>
              <option value="FAST">Fast Charging (DC)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase tracking-wider">Opening Time</label>
              <input type="time" name="opening_time" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase tracking-wider">Closing Time</label>
              <input type="time" name="closing_time" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400" />
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition">Cancel</button>
            <button
              type="submit"
              disabled={isPending || lat === null}
              className="flex-1 py-2.5 rounded-xl bg-cyan-600 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isPending ? 'Adding…' : 'Add Station'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Station detail panel ─────────────────────────────────────────────────────

function StationDetail({
  row,
  onEditAddress,
  onEditLocation,
  onDeleteReview,
  onDeleteStation,
}: {
  row: StationRow
  onEditAddress: () => void
  onEditLocation: () => void
  onDeleteReview: (ratingId: string) => void
  onDeleteStation: () => void
}) {
  const [isPendingDelete, startDeleteTransition] = useTransition()

  const hasFast = row.source === 'provider' ? row.station_type === 'FAST' : (row.geoFast ?? 0) > 0
  const lat = row.source === 'provider' ? row.providerLat : row.geoLat
  const lng = row.source === 'provider' ? row.providerLng : row.geoLng

  function handleDelete() {
    if (!confirm('Remove this charging point from the map? This cannot be undone.')) return
    startDeleteTransition(async () => {
      const result =
        row.source === 'provider'
          ? await deleteChargingPoint(row.providerId!)
          : await deleteGeoStation(row.geoLat!, row.geoLng!)
      if (result.error) alert(result.error)
      else onDeleteStation()
    })
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Detail area */}
      <div className="flex-1 p-7 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-7">
          <div className="flex-1 mr-4">
            <h2 className="text-base font-bold leading-snug">{row.geoName || row.address}</h2>
            {row.geoName && <p className="text-xs text-gray-500 mt-0.5 truncate">{row.address}</p>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
              row.source === 'provider'
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
            }`}>
              {row.source === 'provider' ? 'Provider' : 'Public'}
            </span>
            {hasFast && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-400 font-semibold">Fast</span>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
              row.is_approve !== false
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
            }`}>
              {row.is_approve !== false ? 'Available' : 'Unavailable'}
            </span>
          </div>
        </div>

        <div className="space-y-5">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <DetailField
              label="Charging type"
              value={
                row.source === 'provider'
                  ? row.station_type === 'FAST' ? 'Fast Charging (DC)' : 'Slow Charging (AC)'
                  : hasFast ? 'Fast Charging available' : 'Slow Charging only'
              }
            />
            <DetailField label="Source" value={row.source === 'provider' ? 'Provider (DB)' : 'Public (GeoJSON)'} />
            {row.phone ? <DetailField label="Phone" value={row.phone} /> : null}
            {row.opening_time && row.closing_time ? (
              <DetailField label="Opening hours" value={`${row.opening_time.slice(0, 5)} – ${row.closing_time.slice(0, 5)}`} />
            ) : null}
            {row.geoOperator ? <DetailField label="Operator" value={row.geoOperator} /> : null}
            {row.source === 'geo' && row.geoFast != null ? (
              <DetailField label="Fast chargers" value={String(row.geoFast)} />
            ) : null}
          </div>

          <hr className="border-white/6" />

          {/* Coordinates */}
          <div>
            <p className="text-xs text-gray-600 mb-1">Coordinates</p>
            {lat !== null && lng !== null ? (
              <p className="text-xs font-mono text-gray-300">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
            ) : (
              <p className="text-xs text-gray-600">—</p>
            )}
          </div>

          {/* Reviews */}
          {row.rating_count > 0 && (
            <>
              <hr className="border-white/6" />
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <p className="text-xs font-semibold text-gray-300">Reviews ({row.rating_count})</p>
                  <Stars score={Math.round(row.avg_rating ?? 0)} />
                  <span className="text-xs text-gray-500">{row.avg_rating?.toFixed(1)}</span>
                </div>
                <div className="space-y-3">
                  {row.reviews.map((review: Review) => (
                    <div key={review.id} className="rounded-xl border border-white/[0.07] bg-black/20 p-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Stars score={review.score} />
                          <span className="text-xs text-gray-400">{review.score}/5</span>
                        </div>
                        <span className="text-[10px] text-gray-600">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-xs text-gray-300 italic">"{review.comment}"</p>
                      )}
                      <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                        <div className="text-[10px] text-gray-500">
                          <span className="text-gray-400">{review.reviewer_name}</span>
                          {review.reviewer_email && (
                            <span className="ml-1">· {review.reviewer_email}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {review.reviewer_email && <SendEmailButton ratingId={review.id} />}
                          <DeleteReviewButton ratingId={review.id} onDeleted={() => onDeleteReview(review.id)} />
                        </div>
                      </div>
                      {review.feedback_responses.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/[0.07] space-y-1">
                          <p className="text-[10px] text-green-400 font-medium">
                            User answers ({review.feedback_responses.length})
                          </p>
                          {review.feedback_responses.map((fb) => (
                            <p key={fb.id} className="text-[10px] text-gray-300 bg-green-900/20 rounded px-3 py-2">
                              {fb.message}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions sidebar */}
      <div className="w-52 shrink-0 border-l border-white/6 p-5 flex flex-col gap-3">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Actions</p>

        {row.source === 'geo' ? (
          <p className="text-xs text-gray-400 leading-relaxed border border-white/[0.07] rounded-xl px-3 py-3">
            This is a public station — this information was transferred from the government database{' '}
            <span className="text-cyan-400 font-medium">Gov.il</span> and is subject to changes only.
          </p>
        ) : (
          <>
            <button
              onClick={onEditAddress}
              className="w-full rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between bg-white/4 border border-white/[0.07] text-gray-300 hover:bg-white/[0.07] hover:text-white transition"
            >
              Edit Address
              <PencilIcon />
            </button>

            <button
              onClick={onEditLocation}
              className="w-full rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between bg-white/4 border border-white/[0.07] text-gray-300 hover:bg-white/[0.07] hover:text-white transition"
            >
              Edit Location
              <PinIcon />
            </button>
          </>
        )}

        <div className="flex-1" />

        <button
          onClick={handleDelete}
          disabled={isPendingDelete}
          className="w-full rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {isPendingDelete ? 'Removing…' : 'Delete Station'}
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChargingPointsClient({ rows: initialRows }: { rows: StationRow[] }) {
  const [localRows, setLocalRows] = useState(initialRows)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<StationRow | null>(null)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editAddressRow, setEditAddressRow] = useState<StationRow | null>(null)
  const [editLocationRow, setEditLocationRow] = useState<StationRow | null>(null)

  const [filterSource, setFilterSource] = useState<Set<'provider' | 'geo'>>(new Set(['provider', 'geo']))
  const [filterFast, setFilterFast] = useState<Set<'yes' | 'no'>>(new Set(['yes', 'no']))
  const [filterReview, setFilterReview] = useState<Set<'yes' | 'no'>>(new Set(['yes', 'no']))

  function toggleSource(v: 'provider' | 'geo') {
    setFilterSource((prev) => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n })
  }
  function toggleFastFilter(v: 'yes' | 'no') {
    setFilterFast((prev) => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n })
  }
  function toggleReviewFilter(v: 'yes' | 'no') {
    setFilterReview((prev) => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n })
  }

  const q = search.toLowerCase().trim()
  const filtered = localRows.filter((r) => {
    if (q && !r.address.toLowerCase().includes(q) && !r.geoName?.toLowerCase().includes(q) && !r.geoOperator?.toLowerCase().includes(q)) return false
    if (!filterSource.has(r.source)) return false
    const hasFast = r.source === 'provider' ? r.station_type === 'FAST' : (r.geoFast ?? 0) > 0
    if (!filterFast.has(hasFast ? 'yes' : 'no')) return false
    const hasReview = r.rating_count > 0
    if (!filterReview.has(hasReview ? 'yes' : 'no')) return false
    return true
  })

  const providerCount = localRows.filter((r) => r.source === 'provider').length
  const publicCount = localRows.filter((r) => r.source === 'geo').length
  const withReviewCount = localRows.filter((r) => r.rating_count > 0).length

  function handleDeleteStation(row: StationRow) {
    setLocalRows((prev) => prev.filter((r) => r.key !== row.key))
    if (selected?.key === row.key) setSelected(null)
  }

  function handleDeleteReview(stationKey: string, ratingId: string) {
    const recalc = (rows: StationRow[]) =>
      rows.map((r) => {
        if (r.key !== stationKey) return r
        const newReviews = r.reviews.filter((rv) => rv.id !== ratingId)
        const newAvg = newReviews.length
          ? newReviews.reduce((sum, rv) => sum + rv.score, 0) / newReviews.length
          : null
        return { ...r, reviews: newReviews, rating_count: newReviews.length, avg_rating: newAvg }
      })
    setLocalRows(recalc)
    setSelected((prev) => (prev ? recalc([prev])[0] : null))
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-950 text-white" onClick={() => setShowFilterMenu(false)}>
      <Script
        id="google-maps"
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=marker`}
        strategy="afterInteractive"
        onLoad={() => window.dispatchEvent(new Event('google-maps-loaded'))}
      />
      <div className="flex flex-col flex-1 min-h-0 p-6 gap-5">

        {/* Header */}
        <div className="flex items-center gap-4 shrink-0">
          <div>
            <p className="text-2xl font-bold tracking-tight">Charging Points</p>
            <p className="text-sm text-gray-500 mt-0.5">Administrator</p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex gap-3 shrink-0 items-center">
          {[
            { label: 'Total Stations', value: localRows.length, color: 'text-cyan-400' },
            { label: 'Provider Stations', value: providerCount, color: 'text-purple-400' },
            { label: 'Public Stations', value: publicCount, color: 'text-blue-400' },
            { label: 'With Reviews', value: withReviewCount, color: 'text-amber-400' },
          ].map(({ label, value, color }, i, arr) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="flex items-baseline gap-2">
                <span className={`text-base font-bold tabular-nums ${color}`}>{value}</span>
                <span className="text-xs text-gray-500">{label}</span>
              </div>
              {i < arr.length - 1 && <span className="text-white/10 text-sm">|</span>}
            </div>
          ))}
        </div>

        {/* Two-panel layout */}
        <div className="flex flex-1 min-h-0 gap-4">

          {/* Left: list panel */}
          <div className="w-80 shrink-0 rounded-2xl bg-[#111318] border border-white/6 flex flex-col min-h-0 overflow-hidden">

            {/* List header */}
            <div className="flex items-center justify-between px-4 py-2.5 shrink-0 border-b border-white/6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-300">All Stations</span>
                <span className="text-[10px] rounded-full bg-white/10 text-gray-400 px-1.5 py-0.5 font-semibold">
                  {filtered.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAddModal(true) }}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 transition font-medium px-2 py-1 rounded-lg hover:bg-white/5"
                >
                  + Add
                </button>
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowFilterMenu((v) => !v) }}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition px-2 py-1 rounded-lg hover:bg-white/5"
                  >
                    Filter
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {showFilterMenu && (
                    <div
                      className="absolute right-0 top-full mt-1 z-20 w-52 rounded-xl bg-[#1a1d24] border border-white/10 shadow-xl overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="px-3 pt-2 pb-1 text-[9px] font-semibold text-gray-600 uppercase tracking-widest">Source</p>
                      <FilterCheckbox label="Provider stations" checked={filterSource.has('provider')} onToggle={() => toggleSource('provider')} />
                      <FilterCheckbox label="Public stations" checked={filterSource.has('geo')} onToggle={() => toggleSource('geo')} />
                      <hr className="border-white/10 mx-2 my-1" />
                      <p className="px-3 pt-1 pb-1 text-[9px] font-semibold text-gray-600 uppercase tracking-widest">Fast Charging</p>
                      <FilterCheckbox label="Has fast charging" checked={filterFast.has('yes')} onToggle={() => toggleFastFilter('yes')} />
                      <FilterCheckbox label="No fast charging" checked={filterFast.has('no')} onToggle={() => toggleFastFilter('no')} />
                      <hr className="border-white/10 mx-2 my-1" />
                      <p className="px-3 pt-1 pb-1 text-[9px] font-semibold text-gray-600 uppercase tracking-widest">Reviews</p>
                      <FilterCheckbox label="Has reviews" checked={filterReview.has('yes')} onToggle={() => toggleReviewFilter('yes')} />
                      <FilterCheckbox label="No reviews" checked={filterReview.has('no')} onToggle={() => toggleReviewFilter('no')} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="px-3 py-2 shrink-0 border-b border-white/6">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or address…"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400 placeholder:text-gray-600"
              />
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-xs text-gray-700">
                  {search ? 'No stations match.' : 'No stations found.'}
                </div>
              ) : (
                filtered.map((row) => {
                  const hasFast = row.source === 'provider' ? row.station_type === 'FAST' : (row.geoFast ?? 0) > 0
                  const displayName = row.geoName || row.address
                  return (
                    <button
                      key={row.key}
                      onClick={() => { setSelected(row); setShowFilterMenu(false) }}
                      className={`w-full text-left px-4 py-3 border-b border-white/4 transition ${
                        selected?.key === row.key ? 'bg-white/[0.07]' : 'hover:bg-white/3'
                      }`}
                    >
                      <p className="text-xs font-semibold text-white leading-tight truncate">{displayName}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${
                          row.source === 'provider'
                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                            : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        }`}>
                          {row.source === 'provider' ? 'Provider' : 'Public'}
                        </span>
                        {hasFast && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-400 font-semibold">
                            Fast
                          </span>
                        )}
                        {row.rating_count > 0 && (
                          <span className="text-[9px] text-gray-500">
                            ★ {row.avg_rating?.toFixed(1)} ({row.rating_count})
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Right: detail panel */}
          <div className="flex-1 rounded-2xl bg-[#111318] border border-white/6 min-h-0 overflow-hidden flex flex-col">
            {selected ? (
              <StationDetail
                key={selected.key}
                row={selected}
                onEditAddress={() => setEditAddressRow(selected)}
                onEditLocation={() => setEditLocationRow(selected)}
                onDeleteReview={(ratingId) => handleDeleteReview(selected.key, ratingId)}
                onDeleteStation={() => handleDeleteStation(selected)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-700">
                Select a station to view details
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && <AddStationModal onClose={() => setShowAddModal(false)} />}
      {editAddressRow && <EditAddressModal row={editAddressRow} onClose={() => setEditAddressRow(null)} />}
      {editLocationRow && <EditLocationModal row={editLocationRow} onClose={() => setEditLocationRow(null)} />}
    </div>
  )
}
