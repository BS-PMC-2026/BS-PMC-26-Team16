import type { SupabaseClient } from '@supabase/supabase-js'

const VISIT_RESERVATION_MINUTES = 30

function reservationCutoff() {
  return new Date(Date.now() - VISIT_RESERVATION_MINUTES * 60 * 1000).toISOString()
}

export async function cancelExpiredStationReservations(
  supabase: SupabaseClient,
  stationIds: string[]
) {
  if (stationIds.length === 0) return

  await supabase
    .from('station_visits')
    .update({ status: 'cancelled' })
    .in('station_id', stationIds)
    .eq('status', 'on_the_way')
    .lt('created_at', reservationCutoff())
}

export async function cancelExpiredStationReservation(
  supabase: SupabaseClient,
  stationId: string
) {
  await cancelExpiredStationReservations(supabase, [stationId])
}
