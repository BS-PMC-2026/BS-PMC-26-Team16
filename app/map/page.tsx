'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Script from 'next/script'

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null)

  function initMap() {
    if (!mapRef.current || !window.google) return

    const defaultCenter = { lat: 40.7128, lng: -74.006 }
    const map = new google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 12,
      mapId: 'urban-ev-map',
    })

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          map.setCenter(userLocation)
          const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary
          new AdvancedMarkerElement({ position: userLocation, map, title: 'You are here' })
        }
      )
    }
  }

  useEffect(() => {
    if (window.google) initMap()
  })

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <nav className="flex justify-between items-center p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">Urban EV</h1>
        <div className="space-x-4">
          <Link href="/" className="text-gray-300 hover:text-white">Home</Link>
          <Link href="/map" className="text-gray-300 hover:text-white">Map</Link>
          <Link href="/login" className="text-gray-300 hover:text-white">Login</Link>
          
        </div>
      </nav>

      <div className="p-8 flex-1 flex flex-col">
      <h1 className="text-3xl font-bold mb-4">Charging Stations Map</h1>

      <div ref={mapRef} className="h-100 rounded-xl" />

      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=marker`}
        onLoad={initMap}
      />
      </div>
    </main>
  )
}
