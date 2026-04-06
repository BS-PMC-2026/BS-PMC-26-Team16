'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null)

  async function initMap() {
    if (!mapRef.current || !window.google) return

    const getUserLocation = (): Promise<{ lat: number; lng: number }> =>
      new Promise((resolve) =>
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({ lat: 31.4, lng: 34.8 })
        )
      )

    const center = await getUserLocation()

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: 15,
      mapId: 'urban-ev-map',
    })

    const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary

    const userPin = document.createElement('div')
    userPin.innerHTML = '🧍'
    userPin.style.cssText = 'font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));'
    new AdvancedMarkerElement({ position: center, map, title: 'You are here', content: userPin })

    // Load charging stations
    const res = await fetch('/AGG_CHARGE_STATIONS.geojson')
    const geojson = await res.json()

    const activeInfoWindow = { current: null as google.maps.InfoWindow | null }

    for (const feature of geojson.features) {
      const [lng, lat] = feature.geometry.coordinates
      const p = feature.properties
      const marker = new AdvancedMarkerElement({
        position: { lat, lng },
        map,
        title: p.name,
      })

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="direction:rtl;padding:8px;color:#111;font-family:sans-serif;min-width:180px">
          <p style="font-weight:bold;margin:0 0 4px">${p.name}</p>
          <p style="margin:0 0 2px;color:#555">${p.op}</p>
          <p style="margin:0 0 2px">${p.Address}</p>
          <p style="margin:4px 0 0;font-size:12px">⚡ ${p.count} עמדות &nbsp;|&nbsp; מהיר: ${p.cnt_fast} &nbsp;|&nbsp; איטי: ${p.cnt_slow}</p>
        </div>`,
      })

      marker.addListener('click', () => {
        if (activeInfoWindow.current) activeInfoWindow.current.close()
        infoWindow.open({ anchor: marker, map })
        activeInfoWindow.current = infoWindow
      })
    }
  }

  useEffect(() => {
    if (window.google) initMap()
  })

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-4xl bg-gray-900 rounded-2xl shadow-2xl p-6">
        <h2 className="text-2xl font-bold mb-4">Looking for a Charger?</h2>
        <div ref={mapRef} className="w-full h-125 rounded-xl" />
      </div>

      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=marker`}
        onLoad={initMap}
      />
    </main>
  )
}
