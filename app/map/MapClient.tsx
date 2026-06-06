/// <reference types="google.maps" />
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import type { ProviderStation } from './page'
import MapVisitPanel from './MapVisitPanel'
import type { CustomerVisit } from '@/app/User/CustomerActiveVisitPanel'

type PublicStation = {
  type: 'public'
  key: string
  name: string
  address: string
  operator: string
  total: number
  fast: number
  slow: number
  lat: number
  lng: number
}

type SelectedStation =
  | { type: 'private'; station: ProviderStation }
  | PublicStation


export default function MapClient({
  providerStations,
  userName,
  initialFavoriteIds = [],
}: {
  providerStations: ProviderStation[]
  userName: string
  initialFavoriteIds?: string[]
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const providerMarkersRef = useRef<{ marker: google.maps.marker.AdvancedMarkerElement; stationId: string }[]>([])
  const publicMarkersRef = useRef<{ marker: google.maps.marker.AdvancedMarkerElement; key: string }[]>([])
  const activeInfoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const routePolylineRef = useRef<google.maps.Polyline | null>(null)

  const [selected, setSelected] = useState<SelectedStation | null>(null)
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set(initialFavoriteIds))
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [togglingFav, setTogglingFav] = useState(false)
  const [routeInfo, setRouteInfo] = useState<{ duration: string; distance: string } | null>(null)
  const [onMyWayLoading, setOnMyWayLoading] = useState(false)
  const [onMyWayError, setOnMyWayError] = useState<string | null>(null)
  const [activeVisit, setActiveVisit] = useState<CustomerVisit | null>(null)

  // Refs that are always current — safe to read inside async initMap closure
  const showFavoritesOnlyRef = useRef(false)
  const favoritesRef = useRef(new Set<string>(initialFavoriteIds))
  useEffect(() => { showFavoritesOnlyRef.current = showFavoritesOnly }, [showFavoritesOnly])
  useEffect(() => { favoritesRef.current = favorites }, [favorites])

  function stopNavigation() {
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null)
      routePolylineRef.current = null
    }
    setRouteInfo(null)
  }

  function closePanel() {
    stopNavigation()
    setSelected(null)
    setOnMyWayError(null)
  }

  async function navigateTo(lat: number, lng: number) {
    const map = mapInstanceRef.current
    if (!map || !window.google) return

    const userPos = await new Promise<{ lat: number; lng: number }>((resolve) =>
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: 31.4, lng: 34.8 })
      )
    )

    stopNavigation()

    const res = await fetch('/api/directions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originLat: userPos.lat, originLng: userPos.lng, destLat: lat, destLng: lng }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Route not found')

    const { encoding } = await google.maps.importLibrary('geometry') as google.maps.GeometryLibrary
    const path = encoding.decodePath(data.encodedPolyline)

    const polyline = new google.maps.Polyline({
      path,
      strokeColor: '#06b6d4',
      strokeWeight: 6,
      strokeOpacity: 0.9,
      map,
    })
    routePolylineRef.current = polyline

    const bounds = new google.maps.LatLngBounds()
    path.forEach((p: google.maps.LatLng) => bounds.extend(p))
    map.fitBounds(bounds, { left: 320, top: 20, right: 20, bottom: 20 })

    setRouteInfo({ duration: data.duration, distance: data.distance })
  }

  async function handleOnMyWay(stationId: string, lat: number, lng: number) {
    setOnMyWayLoading(true)
    setOnMyWayError(null)
    try {
      const res = await fetch('/api/station-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId }),
      })
      const data = await res.json()
      if (res.ok) {
        setActiveVisit(data.visit)
        setSelected(null)
        await navigateTo(lat, lng)
      } else {
        setOnMyWayError(data.error ?? 'Error')
      }
    } catch {
      setOnMyWayError('Network error')
    } finally {
      setOnMyWayLoading(false)
    }
  }

  async function handleSearch(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!search.trim() || !mapInstanceRef.current) return
    setSearching(true)
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(search)}`)
      const data = await res.json()
      if (res.ok) {
        mapInstanceRef.current.setCenter({ lat: data.lat, lng: data.lng })
        mapInstanceRef.current.setZoom(16)
      }
    } finally {
      setSearching(false)
    }
  }

  function updateMarkerVisibility(showFavOnly: boolean, favs: Set<string>) {
    const map = mapInstanceRef.current
    if (!map) return
    for (const { marker, stationId } of providerMarkersRef.current) {
      marker.map = (!showFavOnly || favs.has(stationId)) ? map : null
    }
    for (const { marker, key } of publicMarkersRef.current) {
      marker.map = (!showFavOnly || favs.has(key)) ? map : null
    }
  }

  async function toggleFavorite(stationId: string) {
    setTogglingFav(true)
    const isFav = favorites.has(stationId)
    const newFavs = new Set(favorites)
    if (isFav) { newFavs.delete(stationId) } else { newFavs.add(stationId) }
    setFavorites(newFavs)
    updateMarkerVisibility(showFavoritesOnly, newFavs)
    try {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId }),
      })
    } catch {
      const revertedFavs = new Set(newFavs)
      if (isFav) { revertedFavs.add(stationId) } else { revertedFavs.delete(stationId) }
      setFavorites(revertedFavs)
      updateMarkerVisibility(showFavoritesOnly, revertedFavs)
    } finally {
      setTogglingFav(false)
    }
  }

  const syncProviderMarkers = useCallback(async () => {
    const map = mapInstanceRef.current
    if (!map || !window.google) return

    for (const { marker: m } of providerMarkersRef.current) m.map = null
    providerMarkersRef.current = []

    const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary

    for (const station of providerStations) {
      const { isOpen, isLocked } = station

      const pinSvg = (color: string, stroke: string, opacity: number) =>
        `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 28 36" style="filter:drop-shadow(0 2px 5px rgba(0,0,0,0.45));opacity:${opacity}">
          <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22S28 24.5 28 14C28 6.268 21.732 0 14 0z" fill="${color}" stroke="${stroke}" stroke-width="1.5"/>
          <path d="M16 4L8 15H13L9 24L21 13H15Z" fill="white" opacity="0.95"/>
        </svg>`

      const pin = document.createElement('div')
      pin.style.cssText = 'position:relative;display:inline-block;cursor:pointer;'

      if (!isOpen) {
        pin.innerHTML = `${pinSvg('#6b7280', '#4b5563', 0.6)}<span style="position:absolute;top:-5px;right:-5px;font-size:14px;">🌙</span>`
      } else if (isLocked) {
        pin.innerHTML = `${pinSvg('#ef4444', '#dc2626', 1)}<span style="position:absolute;top:-6px;right:-6px;font-size:17px;">🔒</span>`
      } else {
        pin.innerHTML = pinSvg('#06b6d4', '#0891b2', 1)
      }

      const marker = new AdvancedMarkerElement({
        position: { lat: station.lat, lng: station.lng },
        map,
        title: station.address,
        content: pin,
      })

      const statusText = !isOpen
        ? '🌙 Closed now'
        : isLocked
          ? '🔒 Occupied'
          : station.openingTime && station.closingTime
            ? `✅ Open · till ${station.closingTime.slice(0, 5)}`
            : '✅ Available'

      const statusColor = !isOpen ? '#6b7280' : isLocked ? '#7c3aed' : '#0891b2'
      const typeLabel = station.stationType === 'FAST' ? 'Fast ⚡' : 'Slow ⚡'

      const tooltip = new google.maps.InfoWindow({
        content: `<div style="font-family:system-ui,sans-serif;background:#111827;border-radius:10px;overflow:hidden;min-width:220px;box-shadow:0 4px 20px rgba(0,0,0,0.5);">
          <div style="background:${statusColor};padding:5px 12px;font-size:11px;font-weight:700;color:#fff;letter-spacing:0.04em;">${statusText}</div>
          <div style="padding:10px 12px;">
            <p style="margin:0 0 2px;font-weight:700;font-size:14px;color:#fff;">${station.providerName || 'Private Station'}</p>
            <p style="margin:0 0 8px;font-size:11px;color:#9ca3af;">${station.address}</p>
            <div style="display:flex;gap:6px;">
              <span style="background:#1f2937;color:#d1d5db;font-size:10px;font-weight:600;padding:3px 8px;border-radius:20px;">Private</span>
              <span style="background:#1f2937;color:#d1d5db;font-size:10px;font-weight:600;padding:3px 8px;border-radius:20px;">${typeLabel}</span>
            </div>
          </div>
        </div>`,
        pixelOffset: new google.maps.Size(0, -10),
      })

      marker.addListener('click', () => {
        if (activeInfoWindowRef.current) activeInfoWindowRef.current.close()
        tooltip.open({ anchor: marker, map })
        activeInfoWindowRef.current = tooltip
        setOnMyWayError(null)
        setSelected({ type: 'private', station })
      })

      providerMarkersRef.current.push({ marker, stationId: station.id })
    }
  }, [providerStations])

  async function initMap() {
    if (!mapRef.current || !window.google || mapInstanceRef.current) return

    const getUserLocation = (): Promise<{ lat: number; lng: number }> =>
      new Promise((resolve) =>
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({ lat: 31.4, lng: 34.8 })
        )
      )

    const center = await getUserLocation()
    const israelBounds = { north: 33.4, south: 29.4, east: 35.9, west: 34.2 }

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: 15,
      mapId: 'urban-ev-map',
      restriction: { latLngBounds: israelBounds, strictBounds: true },
      disableDefaultUI: true,
      zoomControl: true,
    })

    mapInstanceRef.current = map

    const worldBounds = { north: 85, south: -85, east: 180, west: -180 }
    for (const bounds of [
      { north: worldBounds.north, south: israelBounds.north, east: worldBounds.east, west: worldBounds.west },
      { north: israelBounds.south, south: worldBounds.south, east: worldBounds.east, west: worldBounds.west },
      { north: israelBounds.north, south: israelBounds.south, east: worldBounds.east, west: israelBounds.east },
      { north: israelBounds.north, south: israelBounds.south, east: israelBounds.west, west: worldBounds.west },
    ]) {
      new google.maps.Rectangle({ bounds, map, fillColor: '#000', fillOpacity: 0.2, strokeWeight: 0, clickable: false })
    }

    const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary

    const userPin = document.createElement('div')
    userPin.innerHTML = '🧍'
    userPin.style.cssText = 'font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));'
    new AdvancedMarkerElement({ position: center, map, title: 'You are here', content: userPin })

    // My location button
    const locationBtn = document.createElement('button')
    locationBtn.innerHTML = '📍'
    locationBtn.title = 'My location'
    locationBtn.style.cssText = 'margin:10px;width:40px;height:40px;border-radius:50%;border:none;background:#fff;font-size:20px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.3);'
    locationBtn.addEventListener('click', () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => { map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }); map.setZoom(15) },
        () => { map.setCenter(center); map.setZoom(15) }
      )
    })
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(locationBtn)

    // Public stations from geojson
    const res = await fetch('/AGG_CHARGE_STATIONS.geojson')
    const geojson = await res.json()

    for (const feature of geojson.features) {
      const [lng, lat] = feature.geometry.coordinates
      const p = feature.properties

      const geoPin = document.createElement('div')
      geoPin.style.cssText = 'position:relative;display:inline-block;cursor:pointer;'
      geoPin.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 28 36" style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5))">
          <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22S28 24.5 28 14C28 6.268 21.732 0 14 0z" fill="#1d4ed8" stroke="#1e40af" stroke-width="1.5"/>
          <text x="14" y="18" text-anchor="middle" font-size="13" fill="white">⚡</text>
        </svg>
      `
      const stationKey = `pub_${lat.toFixed(6)}_${lng.toFixed(6)}`
      const marker = new AdvancedMarkerElement({ position: { lat, lng }, map, title: p.name, content: geoPin })
      publicMarkersRef.current.push({ marker, key: stationKey })

      const pubTooltip = new google.maps.InfoWindow({
        content: `<div style="font-family:system-ui,sans-serif;background:#111827;border-radius:10px;overflow:hidden;min-width:220px;box-shadow:0 4px 20px rgba(0,0,0,0.5);">
          <div style="background:#1d4ed8;padding:5px 12px;font-size:11px;font-weight:700;color:#fff;letter-spacing:0.04em;">⚡ PUBLIC STATION</div>
          <div style="padding:10px 12px;">
            <p style="margin:0 0 2px;font-weight:700;font-size:14px;color:#fff;">${p.name}</p>
            <p style="margin:0 0 8px;font-size:11px;color:#9ca3af;">${p.Address}</p>
            <div style="display:flex;gap:6px;">
              <span style="background:#1f2937;color:#d1d5db;font-size:10px;font-weight:600;padding:3px 8px;border-radius:20px;">Public</span>
              <span style="background:#1f2937;color:#f59e0b;font-size:10px;font-weight:600;padding:3px 8px;border-radius:20px;">Fast: ${p.cnt_fast}</span>
              <span style="background:#1f2937;color:#22d3ee;font-size:10px;font-weight:600;padding:3px 8px;border-radius:20px;">Slow: ${p.cnt_slow}</span>
            </div>
          </div>
        </div>`,
        pixelOffset: new google.maps.Size(0, -10),
      })

      marker.addListener('click', () => {
        if (activeInfoWindowRef.current) activeInfoWindowRef.current.close()
        pubTooltip.open({ anchor: marker, map })
        activeInfoWindowRef.current = pubTooltip
        setOnMyWayError(null)
        setSelected({
          type: 'public',
          key: stationKey,
          name: p.name,
          address: p.Address,
          operator: p.op,
          total: p.count,
          fast: p.cnt_fast,
          slow: p.cnt_slow,
          lat,
          lng,
        })
      })
    }

    // Apply the current favorites filter immediately after creating all public markers.
    // This is needed because the filter useEffect may have run before initMap completed.
    if (showFavoritesOnlyRef.current) {
      for (const { marker: m, key } of publicMarkersRef.current) {
        if (!favoritesRef.current.has(key)) m.map = null
      }
    }

    await syncProviderMarkers()
  }

  useEffect(() => {
    if (window.google) initMap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { syncProviderMarkers() }, [syncProviderMarkers])

  // Action button area for the side panel
  function renderActionArea() {
    if (!selected) return null

    if (selected.type === 'private') {
      if (!selected.station.isOpen) {
        return <div className="w-full py-3 rounded-xl bg-gray-700 text-gray-400 text-sm font-bold text-center">🌙 Closed now</div>
      }
      if (selected.station.isLocked) {
        return <div className="w-full py-3 rounded-xl bg-purple-900/60 text-purple-300 text-sm font-bold text-center">🔒 Someone is already on the way</div>
      }
      if (routeInfo) {
        return (
          <div className="space-y-3">
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Route to station</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-400 font-bold text-2xl leading-none">{routeInfo.duration}</p>
                  <p className="text-gray-400 text-sm mt-1">{routeInfo.distance}</p>
                </div>
                <span className="text-4xl opacity-60">🚗</span>
              </div>
            </div>
            <button
              onClick={stopNavigation}
              className="w-full py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold text-sm transition"
            >
              ✕ Stop Navigation
            </button>
          </div>
        )
      }
      return (
        <div className="space-y-2">
          {onMyWayError && (
            <p className="text-red-400 text-xs text-center bg-red-900/20 rounded-lg py-2">{onMyWayError}</p>
          )}
          <button
            onClick={() => {
              const s = (selected as { type: 'private'; station: ProviderStation }).station
              handleOnMyWay(s.id, s.lat, s.lng)
            }}
            disabled={onMyWayLoading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition disabled:opacity-50"
          >
            {onMyWayLoading ? '📍 Getting route...' : "I'm on my way 🚗"}
          </button>
        </div>
      )
    }

    // Public station
    if (routeInfo) {
      return (
        <div className="space-y-3">
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Route to station</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cyan-400 font-bold text-2xl leading-none">{routeInfo.duration}</p>
                <p className="text-gray-400 text-sm mt-1">{routeInfo.distance}</p>
              </div>
              <span className="text-4xl opacity-60">🚗</span>
            </div>
          </div>
          <button
            onClick={stopNavigation}
            className="w-full py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold text-sm transition"
          >
            ✕ Stop Navigation
          </button>
        </div>
      )
    }
    return (
      <button
        onClick={() => {
          const s = selected as PublicStation
          navigateTo(s.lat, s.lng)
        }}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition"
      >
        Take Me There 🚗
      </button>
    )
  }

  // Side panel content
  const sidePanel = selected && (
    <div className="hidden-scrollbar absolute left-0 top-0 bottom-0 z-10 w-[300px] bg-[#111827] shadow-2xl flex flex-col overflow-hidden">
      {/* Image / hero */}
      <div className="relative h-44 shrink-0 flex items-center justify-center"
        style={{
          background: selected.type === 'private'
            ? 'linear-gradient(135deg,#071f3a,#0f2d4e)'
            : 'linear-gradient(135deg,#071f3a,#0f2d4e)',
        }}>
        <span style={{ fontSize: 72, opacity: 0.4 }}>
          {selected.type === 'private' ? '🏠' : '⚡'}
        </span>
        {selected.type === 'private' && selected.station.averageRating != null && (
          <div className="absolute bottom-3 left-3 bg-black/60 rounded-full px-3 py-1 flex items-center gap-1">
            <span className="text-yellow-400 text-sm">★</span>
            <span className="text-white text-sm font-bold">{selected.station.averageRating.toFixed(1)}</span>
            <span className="text-gray-400 text-xs">({selected.station.ratingCount})</span>
          </div>
        )}
        <button
          onClick={closePanel}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition text-lg"
        >✕</button>
        {(() => {
          const favKey = selected.type === 'private' ? selected.station.id : selected.key
          const isFav = favorites.has(favKey)
          return (
            <button
              onClick={() => toggleFavorite(favKey)}
              disabled={togglingFav}
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
              className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition text-lg disabled:opacity-50"
              style={{ color: isFav ? '#f87171' : '#ffffff' }}
            >
              {isFav ? '♥' : '♡'}
            </button>
          )
        })()}
      </div>

      <div
        className="hidden-scrollbar flex-1 overflow-y-auto p-4 space-y-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {selected.type === 'private' ? (
          <>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  !selected.station.isOpen ? 'bg-gray-700 text-gray-300'
                  : selected.station.isLocked ? 'bg-purple-900 text-purple-200'
                  : 'bg-cyan-900 text-cyan-300'
                }`}>
                  {!selected.station.isOpen ? '🌙 Closed' : selected.station.isLocked ? '🔒 Occupied' : '✅ Available'}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">Private</span>
                {selected.station.averageRating != null && (
                  <span className="text-yellow-400 text-sm tracking-tight">
                    {'★'.repeat(Math.round(selected.station.averageRating))}
                    <span className="text-gray-600">{'★'.repeat(5 - Math.round(selected.station.averageRating))}</span>
                  </span>
                )}
              </div>
              <h2 className="text-white font-bold text-lg leading-tight">{selected.station.providerName || 'Private Station'}</h2>
              <p className="text-gray-400 text-sm mt-0.5">{selected.station.address}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-800 rounded-xl p-3">
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Type</p>
                <p className={`font-bold text-sm ${selected.station.stationType === 'FAST' ? 'text-amber-400' : 'text-cyan-400'}`}>
                  ⚡ {selected.station.stationType === 'FAST' ? 'Fast' : 'Slow'}
                </p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3">
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Hours</p>
                <p className="font-bold text-sm text-white">
                  {selected.station.openingTime && selected.station.closingTime
                    ? `${selected.station.openingTime.slice(0,5)}–${selected.station.closingTime.slice(0,5)}`
                    : '24/7'}
                </p>
              </div>
            </div>

            {selected.station.phone && (
              <a href={`tel:${selected.station.phone}`}
                className="flex items-center gap-3 bg-gray-800 rounded-xl p-3 hover:bg-gray-700 transition">
                <span className="text-xl">📞</span>
                <span className="text-cyan-400 font-medium text-sm">{selected.station.phone}</span>
              </a>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Written Reviews</p>
                <span className="text-xs font-semibold text-gray-500">
                  {selected.station.reviews.length}/{selected.station.ratingCount}
                </span>
              </div>

              {selected.station.reviews.length > 0 ? (
                <div className="space-y-2">
                  {selected.station.reviews.map((review, index) => (
                    <div key={`${review.createdAt ?? 'review'}-${index}`} className="rounded-xl bg-gray-800 p-3">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="text-yellow-400 text-sm tracking-tight" aria-label={`${review.score} out of 5 stars`}>
                          {'★'.repeat(review.score)}
                          <span className="text-gray-600">{'★'.repeat(5 - review.score)}</span>
                        </span>
                        {review.createdAt && (
                          <span className="text-[11px] text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed text-gray-200">{review.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-gray-800 p-3 text-sm text-gray-400">
                  No written reviews yet.
                </div>
              )}
            </div>

          </>
        ) : (
          <>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-900 text-blue-200">Public</span>
              </div>
              <h2 className="text-white font-bold text-lg leading-tight">{selected.name}</h2>
              <p className="text-gray-400 text-sm mt-0.5">{selected.address}</p>
              {selected.operator && <p className="text-gray-500 text-xs mt-1">{selected.operator}</p>}
            </div>

            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Charging Slots</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-gray-500 text-xs">Total</p>
                  <p className="text-white font-bold text-xl">{selected.total}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-amber-400 text-xs">Fast</p>
                  <p className="text-amber-400 font-bold text-xl">{selected.fast}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-cyan-400 text-xs">Slow</p>
                  <p className="text-cyan-400 font-bold text-xl">{selected.slow}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action button */}
      <div className="p-4 border-t border-gray-800 shrink-0">
        {renderActionArea()}
      </div>
    </div>
  )

  return (
    <>
      <div className="flex-1 flex flex-col rounded-2xl border border-gray-700 overflow-hidden min-h-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#0f172a] border-b border-gray-700 shrink-0">
          <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="shrink-0">
            <p className="text-white font-semibold text-sm leading-tight">{userName}</p>
            <p className="text-gray-400 text-xs">EV Driver</p>
          </div>

          <button
            onClick={() => {
              const newVal = !showFavoritesOnly
              setShowFavoritesOnly(newVal)
              updateMarkerVisibility(newVal, favorites)
            }}
            className={`ml-auto shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition border ${
              showFavoritesOnly
                ? 'bg-cyan-600 border-cyan-500 text-white'
                : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-cyan-600 hover:text-white'
            }`}
          >
            {showFavoritesOnly ? '♥' : '♡'} My Favorites
            {favorites.size > 0 && (
              <span className="bg-cyan-500/30 text-cyan-300 text-xs px-1.5 py-0.5 rounded-full">
                {favorites.size}
              </span>
            )}
          </button>

          <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search address..."
              className="flex-1 rounded-xl border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-cyan-500 transition"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition disabled:opacity-50"
            >
              {searching ? '...' : '🔍'}
            </button>
          </form>
        </div>

        {/* Map + side panel */}
        <div className="flex-1 relative min-h-0">
          {activeVisit
            ? (
              <MapVisitPanel
                visit={activeVisit}
                routeInfo={routeInfo}
                onStopNavigation={stopNavigation}
                onClose={() => { setActiveVisit(null); stopNavigation() }}
              />
            )
            : sidePanel}
          <div ref={mapRef} className="absolute inset-0" />
        </div>
      </div>

      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=marker,geometry&language=en&region=IL`}
        onLoad={initMap}
      />
    </>
  )
}
