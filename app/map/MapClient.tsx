/// <reference types="google.maps" />
'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'

export default function MapClient() {
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

    const israelBounds = { north: 33.4, south: 29.4, east: 35.9, west: 34.2 }

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: 15,
      mapId: 'urban-ev-map',
      restriction: {
        latLngBounds: israelBounds,
        strictBounds: true,
      },
    })

    // Red overlay outside Israel bounds
    const worldBounds = { north: 85, south: -85, east: 180, west: -180 }
    const overlayRegions = [
      { north: worldBounds.north, south: israelBounds.north, east: worldBounds.east, west: worldBounds.west },
      { north: israelBounds.south, south: worldBounds.south, east: worldBounds.east, west: worldBounds.west },
      { north: israelBounds.north, south: israelBounds.south, east: worldBounds.east, west: israelBounds.east },
      { north: israelBounds.north, south: israelBounds.south, east: israelBounds.west, west: worldBounds.west },
    ]
    for (const bounds of overlayRegions) {
      new google.maps.Rectangle({
        bounds,
        map,
        fillColor: '#ff0000',
        fillOpacity: 0.35,
        strokeWeight: 0,
        clickable: false,
      })
    }

    const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary

    const userPin = document.createElement('div')
    userPin.innerHTML = '🧍'
    userPin.style.cssText = 'font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));'
    new AdvancedMarkerElement({ position: center, map, title: 'You are here', content: userPin })

    // "My Location" button
    const locationBtn = document.createElement('button')
    locationBtn.innerHTML = '📍'
    locationBtn.title = 'Go to my location'
    locationBtn.style.cssText = 'margin:10px;width:40px;height:40px;border-radius:50%;border:none;background:#fff;font-size:20px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;'
    locationBtn.addEventListener('click', () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          map.setZoom(15)
        },
        () => {
          map.setCenter(center)
          map.setZoom(15)
        }
      )
    })
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(locationBtn)

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
    <>
      <div ref={mapRef} className="w-full h-125 rounded-xl" />
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=marker`}
        onLoad={initMap}
      />
    </>
  )
}
