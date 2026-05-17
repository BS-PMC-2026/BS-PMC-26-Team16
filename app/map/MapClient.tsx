/// <reference types="google.maps" />
'use client'

import { useCallback, useEffect, useRef } from 'react'
import Script from 'next/script'
import type { ProviderStation } from './page'

export default function MapClient({ providerStations }: { providerStations: ProviderStation[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const providerMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const activeInfoWindowRef = useRef<google.maps.InfoWindow | null>(null)

  // Expose handler for "on my way" button inside InfoWindow HTML
  useEffect(() => {
    (window as Window & { stationOnMyWay?: (id: string, lat: number, lng: number, btn: HTMLButtonElement) => void }).stationOnMyWay = async (
      stationId: string,
      lat: number,
      lng: number,
      btn: HTMLButtonElement
    ) => {
      btn.disabled = true
      btn.textContent = 'Saving...'

      try {
        const res = await fetch('/api/station-visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stationId }),
        })
        const data = await res.json()

        if (res.ok) {
          btn.textContent = '✅ On my way!'
          btn.style.background = '#16a34a'
          window.open(
            `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
            '_blank'
          )
        } else {
          btn.textContent = data.error ?? 'Error'
          btn.disabled = false
          btn.style.background = '#dc2626'
        }
      } catch {
        btn.textContent = 'Network error'
        btn.disabled = false
      }
    }

    return () => {
      delete (window as Window & { stationOnMyWay?: unknown }).stationOnMyWay
    }
  }, [])

  const syncProviderMarkers = useCallback(async () => {
    const map = mapInstanceRef.current
    if (!map || !window.google) return

    for (const m of providerMarkersRef.current) m.map = null
    providerMarkersRef.current = []

    const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary

    for (const station of providerStations) {
      const { isOpen, isLocked } = station

      const pin = document.createElement('div')
      pin.style.cssText = 'position:relative;display:inline-block;'

      if (!isOpen) {
        pin.innerHTML = `
          <span style="font-size:20px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));opacity:0.55">🏠</span>
          <span style="position:absolute;top:-5px;right:-5px;font-size:13px;line-height:1">🌙</span>
        `
      } else if (isLocked) {
        pin.innerHTML = `
          <span style="font-size:20px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));opacity:0.7">🏠</span>
          <span style="position:absolute;top:-5px;right:-5px;font-size:13px;line-height:1">🔒</span>
        `
      } else {
        pin.innerHTML = `
          <span style="font-size:20px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">🏠</span>
          <span style="position:absolute;top:-5px;right:-5px;background:#0e3a5c;border:1.5px solid #22d3ee;border-radius:50%;width:13px;height:13px;display:flex;align-items:center;justify-content:center;font-size:8px;box-shadow:0 1px 4px rgba(34,211,238,0.5)">⚡</span>
        `
      }

      const marker = new AdvancedMarkerElement({
        position: { lat: station.lat, lng: station.lng },
        map,
        title: station.address,
        content: pin,
      })

      const stationTypeLabel = station.stationType === 'FAST' ? 'Fast Charging' : 'Slow Charging'

      const hoursLine = station.openingTime && station.closingTime
        ? `<p style="margin:0 0 3px;font-size:12px;color:#555">🕐 ${station.openingTime.slice(0, 5)} – ${station.closingTime.slice(0, 5)}</p>`
        : ''

      let actionHtml: string
      if (!isOpen) {
        actionHtml = `
          <div style="width:100%;padding:7px 0;background:#374151;color:#9ca3af;border:none;border-radius:8px;font-size:13px;font-weight:bold;text-align:center;cursor:default">
            🌙 Closed now
          </div>`
      } else if (isLocked) {
        actionHtml = `
          <div style="width:100%;padding:7px 0;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:bold;text-align:center;cursor:default">
            🔒 Someone is already on the way
          </div>`
      } else {
        actionHtml = `
          <button
            onclick="window.stationOnMyWay('${station.id}',${station.lat},${station.lng},this)"
            style="width:100%;padding:7px 0;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:bold">
            I'm on my way 🚗
          </button>`
      }

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="padding:10px 12px 10px;color:#111;font-family:sans-serif;min-width:200px;max-width:240px">
          <p style="font-weight:bold;margin:0 0 6px;font-size:14px">🏠 Private Charging Station</p>
          ${station.providerName ? `<p style="margin:0 0 3px;font-size:13px;color:#333">👤 ${station.providerName}</p>` : ''}
          ${station.phone ? `<p style="margin:0 0 3px;font-size:13px;color:#333">📞 ${station.phone}</p>` : ''}
          <p style="margin:0 0 3px;font-size:12px;color:#555">📍 ${station.address}</p>
          <p style="margin:0 0 3px;font-size:12px;color:#555">⚡ ${stationTypeLabel}</p>
          ${hoursLine}
          <div style="margin-top:10px">${actionHtml}</div>
        </div>`,
        pixelOffset: new google.maps.Size(0, -4),
      })

      marker.addListener('click', () => {
        if (activeInfoWindowRef.current) activeInfoWindowRef.current.close()
        infoWindow.open({ anchor: marker, map })
        activeInfoWindowRef.current = infoWindow
      })

      providerMarkersRef.current.push(marker)
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
    })

    mapInstanceRef.current = map

    const worldBounds = { north: 85, south: -85, east: 180, west: -180 }
    for (const bounds of [
      { north: worldBounds.north, south: israelBounds.north, east: worldBounds.east, west: worldBounds.west },
      { north: israelBounds.south, south: worldBounds.south, east: worldBounds.east, west: worldBounds.west },
      { north: israelBounds.north, south: israelBounds.south, east: worldBounds.east, west: israelBounds.east },
      { north: israelBounds.north, south: israelBounds.south, east: israelBounds.west, west: worldBounds.west },
    ]) {
      new google.maps.Rectangle({ bounds, map, fillColor: '#ff0000', fillOpacity: 0.35, strokeWeight: 0, clickable: false })
    }

    const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary

    const userPin = document.createElement('div')
    userPin.innerHTML = '🧍'
    userPin.style.cssText = 'font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));'
    new AdvancedMarkerElement({ position: center, map, title: 'You are here', content: userPin })

    const locationBtn = document.createElement('button')
    locationBtn.innerHTML = '📍'
    locationBtn.title = 'Go to my location'
    locationBtn.style.cssText = 'margin:10px;width:40px;height:40px;border-radius:50%;border:none;background:#fff;font-size:20px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;'
    locationBtn.addEventListener('click', () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => { map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }); map.setZoom(15) },
        () => { map.setCenter(center); map.setZoom(15) }
      )
    })
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(locationBtn)

    const res = await fetch('/AGG_CHARGE_STATIONS.geojson')
    const geojson = await res.json()

    for (const feature of geojson.features) {
      const [lng, lat] = feature.geometry.coordinates
      const p = feature.properties
      const marker = new AdvancedMarkerElement({ position: { lat, lng }, map, title: p.name })

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="direction:rtl;padding:8px;color:#111;font-family:sans-serif;min-width:180px">
          <p style="font-weight:bold;margin:0 0 4px">${p.name}</p>
          <p style="margin:0 0 2px;color:#555">${p.op}</p>
          <p style="margin:0 0 2px">${p.Address}</p>
          <p style="margin:4px 0 0;font-size:12px">⚡ ${p.count} stations &nbsp;|&nbsp; Fast: ${p.cnt_fast} &nbsp;|&nbsp; Slow: ${p.cnt_slow}</p>
        </div>`,
      })

      marker.addListener('click', () => {
        if (activeInfoWindowRef.current) activeInfoWindowRef.current.close()
        infoWindow.open({ anchor: marker, map })
        activeInfoWindowRef.current = infoWindow
      })
    }

    await syncProviderMarkers()
  }

  useEffect(() => {
    if (window.google) initMap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    syncProviderMarkers()
  }, [syncProviderMarkers])

  return (
    <>
      <div ref={mapRef} className="w-full flex-1" />
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=marker`}
        onLoad={initMap}
      />
    </>
  )
}
