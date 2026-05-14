import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address')
  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 })
  }

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=il`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'UrbanEV/1.0' },
  })
  const data = await res.json()

  if (!data?.[0]) {
    return NextResponse.json({ error: 'Address not found' }, { status: 404 })
  }

  return NextResponse.json({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) })
}
