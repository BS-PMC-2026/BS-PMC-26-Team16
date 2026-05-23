'use server'

import { revalidatePath } from 'next/cache'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase: null, error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, is_approved')
    .eq('id', user.id)
    .single()

  if (!profile || profile.user_type !== 'admin' || !profile.is_approved) {
    return { supabase: null, error: 'Admin access required.' }
  }

  return { supabase, user, error: null }
}

const GEO_PATH = path.join(process.cwd(), 'public', 'AGG_CHARGE_STATIONS.geojson')
const COORD_EPS = 0.00002

function findGeoIndex(features: { geometry: { coordinates: number[] } }[], lat: number, lng: number) {
  return features.findIndex(
    (f) =>
      Math.abs(f.geometry.coordinates[1] - lat) < COORD_EPS &&
      Math.abs(f.geometry.coordinates[0] - lng) < COORD_EPS
  )
}

// ─── Provider station actions ─────────────────────────────────────────────────

export async function addAdminStation(formData: FormData): Promise<{ error?: string }> {
  const { supabase, user, error } = await requireAdmin()
  if (error || !supabase || !user) return { error: error ?? 'Error' }

  const address = String(formData.get('address') ?? '').trim()
  const lat = parseFloat(String(formData.get('lat') ?? ''))
  const lng = parseFloat(String(formData.get('lng') ?? ''))
  const station_type = String(formData.get('station_type') ?? 'SLOW')
  const opening_time = String(formData.get('opening_time') ?? '').trim() || null
  const closing_time = String(formData.get('closing_time') ?? '').trim() || null

  if (!address || isNaN(lat) || isNaN(lng)) {
    return { error: 'Address and valid coordinates are required. Please geocode the address first.' }
  }
  if (!['FAST', 'SLOW'].includes(station_type)) return { error: 'Invalid station type.' }

  const { error: dbError } = await supabase.from('charging_stations').insert({
    user_id: user.id,
    address,
    lat,
    lng,
    station_type,
    opening_time,
    closing_time,
    is_approve: true,
  })

  if (dbError) return { error: dbError.message }
  revalidatePath('/admin/charging-points')
  revalidatePath('/map')
  return {}
}

export async function deleteChargingPoint(stationId: string): Promise<{ error?: string }> {
  const { supabase, error } = await requireAdmin()
  if (error || !supabase) return { error: error ?? 'Error' }

  const { error: dbError } = await supabase
    .from('charging_stations')
    .delete()
    .eq('id', stationId)

  if (dbError) return { error: dbError.message }
  revalidatePath('/admin/charging-points')
  revalidatePath('/map')
  return {}
}

export async function updateProviderStationAddress(
  stationId: string,
  newAddress: string
): Promise<{ error?: string }> {
  const { supabase, error } = await requireAdmin()
  if (error || !supabase) return { error: error ?? 'Error' }

  const trimmed = newAddress.trim()
  if (!trimmed) return { error: 'Address cannot be empty.' }

  const { error: dbError } = await supabase
    .from('charging_stations')
    .update({ address: trimmed })
    .eq('id', stationId)

  if (dbError) return { error: dbError.message }
  revalidatePath('/admin/charging-points')
  revalidatePath('/map')
  return {}
}

// ─── GeoJSON station actions ──────────────────────────────────────────────────

export async function deleteGeoStation(lat: number, lng: number): Promise<{ error?: string }> {
  const { error } = await requireAdmin()
  if (error) return { error }

  const raw = await readFile(GEO_PATH, 'utf-8')
  const geojson = JSON.parse(raw)
  const before = geojson.features.length
  geojson.features = geojson.features.filter(
    (f: { geometry: { coordinates: number[] } }) =>
      !(
        Math.abs(f.geometry.coordinates[1] - lat) < COORD_EPS &&
        Math.abs(f.geometry.coordinates[0] - lng) < COORD_EPS
      )
  )
  if (geojson.features.length === before) return { error: 'Station not found in map data.' }

  await writeFile(GEO_PATH, JSON.stringify(geojson))
  revalidatePath('/admin/charging-points')
  revalidatePath('/map')
  return {}
}

export async function updateGeoStationAddress(
  lat: number,
  lng: number,
  newAddress: string
): Promise<{ error?: string }> {
  const { error } = await requireAdmin()
  if (error) return { error }

  const trimmed = newAddress.trim()
  if (!trimmed) return { error: 'Address cannot be empty.' }

  const raw = await readFile(GEO_PATH, 'utf-8')
  const geojson = JSON.parse(raw)
  const idx = findGeoIndex(geojson.features, lat, lng)
  if (idx === -1) return { error: 'Station not found in map data.' }

  geojson.features[idx].properties.Address = trimmed
  await writeFile(GEO_PATH, JSON.stringify(geojson))
  revalidatePath('/admin/charging-points')
  revalidatePath('/map')
  return {}
}

// ─── Email action ─────────────────────────────────────────────────────────────

export async function sendFeedbackEmail(ratingId: string): Promise<{ error?: string }> {
  const { supabase, error } = await requireAdmin()
  if (error || !supabase) return { error: error ?? 'Error' }

  const { data: rating } = await supabase
    .from('ratings')
    .select('reviewer_id')
    .eq('id', ratingId)
    .single()
  if (!rating) return { error: 'Rating not found.' }

  const { data: reviewer } = await supabase
    .from('profiles')
    .select('email, first_name')
    .eq('id', rating.reviewer_id)
    .single()
  if (!reviewer?.email) return { error: 'Reviewer email not found.' }

  const token = Buffer.from(`${ratingId}:smartev2026`).toString('base64url')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const feedbackUrl = `${appUrl}/feedback?r=${ratingId}&t=${token}`

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || apiKey === 're_your_api_key_here') {
    console.log('[DEV] Feedback email would be sent to:', reviewer.email)
    console.log('[DEV] Feedback URL:', feedbackUrl)
    return {}
  }

  const resend = new Resend(apiKey)
  const { error: sendError } = await resend.emails.send({
    from: 'SmartEv <onboarding@resend.dev>',
    to: 'yagelso@ac.sce.ac.il',
    subject: "We'd love to hear your feedback",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">
        <h2 style="margin-top:0;">Hey,</h2>
        <p>We were disappointed to see that you didn't like one of the charging points from our service.</p>
        <p>We would love to hear from you what you didn't like, and what we can improve going forward!</p>
        <p style="margin:32px 0;">
          <a href="${feedbackUrl}"
             style="background:#06b6d4;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Share Your Feedback
          </a>
        </p>
        <p>Many thanks,<br/><strong>SmartEv Team.</strong></p>
      </div>
    `,
  })

  if (sendError) return { error: sendError.message }
  return {}
}

// ─── Review actions ───────────────────────────────────────────────────────────

export async function deleteReview(ratingId: string): Promise<{ error?: string }> {
  const { supabase, error } = await requireAdmin()
  if (error || !supabase) return { error: error ?? 'Error' }

  // Delete related feedback first to avoid FK violations
  await supabase.from('station_feedback').delete().eq('rating_id', ratingId)

  const { error: dbError } = await supabase.from('ratings').delete().eq('id', ratingId)
  if (dbError) return { error: dbError.message }
  revalidatePath('/admin/charging-points')
  return {}
}

// ─── Location update actions ──────────────────────────────────────────────────

export async function updateProviderStationLocation(
  stationId: string,
  lat: number,
  lng: number,
  address: string
): Promise<{ error?: string }> {
  const { supabase, error } = await requireAdmin()
  if (error || !supabase) return { error: error ?? 'Error' }

  const trimmed = address.trim()
  if (!trimmed) return { error: 'Address cannot be empty.' }

  const { error: dbError } = await supabase
    .from('charging_stations')
    .update({ lat, lng, address: trimmed })
    .eq('id', stationId)

  if (dbError) return { error: dbError.message }
  revalidatePath('/admin/charging-points')
  revalidatePath('/map')
  return {}
}

export async function updateGeoStationLocation(
  oldLat: number,
  oldLng: number,
  newLat: number,
  newLng: number,
  newAddress: string
): Promise<{ error?: string }> {
  const { error } = await requireAdmin()
  if (error) return { error }

  const trimmed = newAddress.trim()
  if (!trimmed) return { error: 'Address cannot be empty.' }

  const raw = await readFile(GEO_PATH, 'utf-8')
  const geojson = JSON.parse(raw)
  const idx = findGeoIndex(geojson.features, oldLat, oldLng)
  if (idx === -1) return { error: 'Station not found in map data.' }

  geojson.features[idx].geometry.coordinates = [newLng, newLat]
  geojson.features[idx].properties.Address = trimmed
  await writeFile(GEO_PATH, JSON.stringify(geojson))
  revalidatePath('/admin/charging-points')
  revalidatePath('/map')
  return {}
}
