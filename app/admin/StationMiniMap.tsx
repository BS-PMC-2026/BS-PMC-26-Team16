'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'

type Props = { lat: number; lng: number; address: string }

export default function StationMiniMap({ lat, lng, address }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)

  async function initMap() {
    if (!mapRef.current || !window.google) return
    mapInstanceRef.current = null

    const map = new google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 15,
      mapId: 'urban-ev-map',
      disableDefaultUI: true,
      zoomControl: true,
    })
    mapInstanceRef.current = map

    const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary
    const pin = document.createElement('div')
    pin.style.cssText = 'position:relative;display:inline-block;'
    pin.innerHTML = `
      <span style="font-size:24px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">📍</span>
    `
    new AdvancedMarkerElement({ position: { lat, lng }, map, title: address, content: pin })
  }

  // Re-init whenever coordinates change
  useEffect(() => {
    if (window.google) initMap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])

  return (
    <>
      <div ref={mapRef} className="w-full h-48 rounded-xl overflow-hidden" />
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=marker`}
        onLoad={initMap}
      />
    </>
  )
}
