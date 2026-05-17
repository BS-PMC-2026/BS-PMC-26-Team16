import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const stationId: string | undefined = body?.stationId
  if (!stationId) {
    return NextResponse.json({ error: 'Missing stationId.' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('user_favorites')
    .select('station_id')
    .eq('user_id', user.id)
    .eq('station_id', stationId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('station_id', stationId)
    return NextResponse.json({ favorited: false })
  }

  await supabase
    .from('user_favorites')
    .insert({ user_id: user.id, station_id: stationId })
  return NextResponse.json({ favorited: true })
}
