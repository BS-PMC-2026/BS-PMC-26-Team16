import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const stationId: string | undefined = body?.stationId
  if (!stationId) {
    return NextResponse.json({ error: 'Missing station ID.' }, { status: 400 })
  }

  // Verify station exists and fetch owner
  const { data: station } = await supabase
    .from('charging_stations')
    .select('id, user_id, address')
    .eq('id', stationId)
    .single()

  if (!station) {
    return NextResponse.json({ error: 'Station not found.' }, { status: 404 })
  }

  // Block if already locked (someone is on the way)
  const { data: existing } = await supabase
    .from('station_visits')
    .select('id')
    .eq('station_id', stationId)
    .eq('status', 'on_the_way')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Someone is already on the way to this station. Please try again later.' }, { status: 409 })
  }

  // Fetch visitor name + phone
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, phone')
    .eq('id', user.id)
    .single()

  const visitorName = profile
    ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'משתמש'
    : 'משתמש'
  const visitorPhone = profile?.phone ?? null

  // Create visit record
  const { error: visitError } = await supabase.from('station_visits').insert({
    station_id: stationId,
    visitor_id: user.id,
    visitor_name: visitorName,
    status: 'on_the_way',
  })

  if (visitError) {
    return NextResponse.json({ error: visitError.message }, { status: 500 })
  }

  // Notify the provider (only if they're not visiting their own station)
  if (station.user_id !== user.id) {
    const phoneNote = visitorPhone ? ` | 📞 ${visitorPhone}` : ''
    await supabase.from('notifications').insert({
      recipient_id: station.user_id,
      station_id: stationId,
      message: `${visitorName}${phoneNote} is on the way to your station at ${station.address}`,
    })
  }

  return NextResponse.json({ ok: true })
}
