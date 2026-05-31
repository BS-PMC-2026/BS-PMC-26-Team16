import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { originLat, originLng, destLat, destLng } = await req.json()

  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${originLng},${originLat};${destLng},${destLat}` +
    `?overview=full&geometries=polyline`

  const res = await fetch(url)
  const data = await res.json()

  if (!res.ok || data.code !== 'Ok' || !data.routes?.[0]) {
    return NextResponse.json({ error: 'Route not found' }, { status: 400 })
  }

  const route = data.routes[0]
  const durationMins = Math.round(route.duration / 60)
  const distanceKm = (route.distance / 1000).toFixed(1)

  return NextResponse.json({
    encodedPolyline: route.geometry,
    duration: durationMins < 60
      ? `${durationMins} min`
      : `${Math.floor(durationMins / 60)}h ${durationMins % 60}min`,
    distance: `${distanceKm} km`,
  })
}
