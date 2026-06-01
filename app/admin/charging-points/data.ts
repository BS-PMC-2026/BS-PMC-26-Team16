import { readFile } from 'fs/promises'
import path from 'path'
import { createClient } from '@/lib/supabase/server'
import type { FeedbackResponse, Review, StationRow } from './types'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export async function loadStationRows(supabase: SupabaseClient): Promise<StationRow[]> {
  const { data: dbStations } = await supabase
    .from('charging_stations')
    .select('id, address, lat, lng, station_type, opening_time, closing_time, is_approve, user_id')
    .order('is_approve', { ascending: false })

  let ownerPhoneMap: Record<string, string> = {}
  if (dbStations?.length) {
    const userIds = [...new Set(dbStations.map((s) => s.user_id))]
    const { data: ownerProfiles } = await supabase
      .from('profiles')
      .select('id, phone')
      .in('id', userIds)
    ownerPhoneMap = Object.fromEntries(
      (ownerProfiles ?? []).map((p) => [p.id, p.phone ?? ''])
    )
  }

  const stationIds = (dbStations ?? []).map((s) => s.id)
  const ratingsMap: Record<string, Review[]> = {}

  if (stationIds.length) {
    const { data: ratings } = await supabase
      .from('ratings')
      .select('id, station_id, score, comment, created_at, reviewer_id')
      .in('station_id', stationIds)
      .order('created_at', { ascending: false })

    if (ratings?.length) {
      const reviewerIds = [...new Set(ratings.map((r) => r.reviewer_id))]
      const { data: reviewerProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', reviewerIds)
      const reviewerMap = Object.fromEntries(
        (reviewerProfiles ?? []).map((p) => [
          p.id,
          {
            name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
            email: p.email ?? '',
          },
        ])
      )

      const ratingIds = ratings.map((r) => r.id)
      const feedbackMap: Record<string, FeedbackResponse[]> = {}
      try {
        const { data: feedbacks } = await supabase
          .from('station_feedback')
          .select('id, rating_id, message, created_at')
          .in('rating_id', ratingIds)
        for (const fb of feedbacks ?? []) {
          if (!feedbackMap[fb.rating_id]) feedbackMap[fb.rating_id] = []
          feedbackMap[fb.rating_id].push({
            id: fb.id,
            message: fb.message,
            created_at: fb.created_at,
          })
        }
      } catch {
        // station_feedback may not exist in older local databases.
      }

      for (const r of ratings) {
        if (!ratingsMap[r.station_id]) ratingsMap[r.station_id] = []
        const reviewer = reviewerMap[r.reviewer_id]
        ratingsMap[r.station_id].push({
          id: r.id,
          score: r.score,
          comment: r.comment,
          created_at: r.created_at,
          reviewer_name: reviewer?.name || 'Unknown',
          reviewer_email: reviewer?.email || '',
          feedback_responses: feedbackMap[r.id] ?? [],
        })
      }
    }
  }

  const providerRows: StationRow[] = (dbStations ?? []).map((s) => {
    const reviews = ratingsMap[s.id] ?? []
    const avgRating =
      reviews.length
        ? reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length
        : null
    return {
      key: `provider_${s.id}`,
      source: 'provider',
      providerId: s.id,
      providerLat: s.lat ?? null,
      providerLng: s.lng ?? null,
      station_type: s.station_type as 'FAST' | 'SLOW',
      phone: ownerPhoneMap[s.user_id] ?? '',
      is_approve: s.is_approve,
      opening_time: s.opening_time ?? null,
      closing_time: s.closing_time ?? null,
      avg_rating: avgRating,
      rating_count: reviews.length,
      reviews,
      geoLat: null,
      geoLng: null,
      geoName: null,
      geoOperator: null,
      geoFast: null,
      address: s.address,
    }
  })

  const geojsonRaw = await readFile(
    path.join(process.cwd(), 'public', 'AGG_CHARGE_STATIONS.geojson'),
    'utf-8'
  )
  const geojson = JSON.parse(geojsonRaw)

  const geoRows: StationRow[] = geojson.features.map(
    (f: { properties: Record<string, unknown>; geometry: { coordinates: number[] } }) => {
      const lat = f.geometry.coordinates[1]
      const lng = f.geometry.coordinates[0]
      return {
        key: `geo_${lat}_${lng}`,
        source: 'geo',
        providerId: null,
        providerLat: null,
        providerLng: null,
        station_type: null,
        phone: '',
        is_approve: true,
        opening_time: null,
        closing_time: null,
        avg_rating: null,
        rating_count: 0,
        reviews: [],
        geoLat: lat,
        geoLng: lng,
        geoName: String(f.properties.name ?? ''),
        geoOperator: String(f.properties.op ?? ''),
        geoFast: Number(f.properties.cnt_fast ?? 0),
        address: String(f.properties.Address ?? ''),
      }
    }
  )

  return [...providerRows, ...geoRows]
}
