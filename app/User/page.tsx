import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import UserDashboard, { type StationReview } from './UserDashboard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, user_type, is_approved, phone, provider_request_reason')
    .eq('id', user.id)
    .single()

  if (
    error ||
    !profile ||
    !['admin', 'customer', 'provider'].includes(profile.user_type)
  ) {
    redirect('/')
  }

  const isAdmin = profile.user_type === 'admin'

  if (isAdmin) {
    redirect('/admin')
  }

  const { data: userStation } = await supabase
    .from('charging_stations')
    .select('id, address, lat, lng, station_type, opening_time, closing_time, is_approve')
    .eq('user_id', user.id)
    .maybeSingle()

  const hasApprovedStation = userStation?.is_approve === true
  const isProvider = profile.user_type === 'provider' || hasApprovedStation
  const isCustomer = !isProvider

  if (hasApprovedStation && profile.user_type !== 'provider') {
    await supabase
      .from('profiles')
      .update({ user_type: 'provider', is_approved: true })
      .eq('id', user.id)
  }

  const chargingStation = isProvider && hasApprovedStation ? userStation : null

  const { data: customerStationRequest } = isCustomer
    ? { data: userStation }
    : { data: null }

  const { data: notifications } = isProvider
    ? await supabase
        .from('notifications')
        .select('id, message, read, created_at')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: null }

  let reviews: StationReview[] = []
  const reviewStationId = chargingStation?.id ?? customerStationRequest?.id ?? null

  if (reviewStationId) {
    const { data: ratingRows } = await supabase
      .from('ratings')
      .select('id, score, comment, created_at, reviewer_id')
      .eq('station_id', reviewStationId)
      .order('created_at', { ascending: false })

    if (ratingRows?.length) {
      const reviewerIds = [...new Set(ratingRows.map((rating) => rating.reviewer_id))]
      const { data: reviewerProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', reviewerIds)

      const reviewerMap = Object.fromEntries(
        (reviewerProfiles ?? []).map((reviewer) => [
          reviewer.id,
          `${reviewer.first_name ?? ''} ${reviewer.last_name ?? ''}`.trim() || 'Customer',
        ])
      )

      reviews = ratingRows.map((rating) => ({
        id: rating.id,
        score: rating.score,
        comment: rating.comment,
        created_at: rating.created_at,
        reviewerName: reviewerMap[rating.reviewer_id] ?? 'Customer',
      }))
    }
  }

  // Provider: find active visit to their station (on_the_way OR arrived)
  let providerActiveVisit: { id: string; visitor_name: string | null; visitor_phone: string | null; created_at: string; status: 'on_the_way' | 'arrived' } | null = null
  if (isProvider && chargingStation) {
    const { data: visit } = await supabase
      .from('station_visits')
      .select('id, visitor_name, visitor_id, created_at, status')
      .eq('station_id', chargingStation.id)
      .in('status', ['on_the_way', 'arrived'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (visit) {
      const { data: visitorProfile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', visit.visitor_id)
        .single()

      providerActiveVisit = {
        id: visit.id,
        visitor_name: visit.visitor_name,
        visitor_phone: visitorProfile?.phone ?? null,
        created_at: visit.created_at,
        status: visit.status as 'on_the_way' | 'arrived',
      }
    }
  }

  // Visitor: find this user's active or recently-completed visit, for both customers and providers
  let customerVisit: { id: string; station_address: string; created_at: string; status: 'on_the_way' | 'arrived'; already_rated: boolean } | null = null
  const { data: visit } = await supabase
    .from('station_visits')
    .select('id, station_id, created_at, status')
    .eq('visitor_id', user.id)
    .in('status', ['on_the_way', 'arrived'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (visit) {
    const { data: stationData } = await supabase
      .from('charging_stations')
      .select('address')
      .eq('id', visit.station_id)
      .single()

    customerVisit = {
      id: visit.id,
      station_address: stationData?.address ?? 'Unknown address',
      created_at: visit.created_at,
      status: visit.status as 'on_the_way' | 'arrived',
      already_rated: false,
    }
  }

  const roleLabel = isCustomer
    ? 'Customer'
    : 'Service Provider'
  const isApproved = profile.is_approved === true
  const providerRequestPending = isCustomer && profile.provider_request_reason != null
  const statusLabel = isApproved ? 'Approved' : 'Pending approval'

  return (
    <UserDashboard
      firstName={profile.first_name ?? ''}
      lastName={profile.last_name ?? ''}
      email={profile.email ?? user.email ?? ''}
      phone={profile.phone ?? ''}
      role={isCustomer ? 'customer' : 'provider'}
      roleLabel={roleLabel}
      statusLabel={statusLabel}
      providerRequestPending={providerRequestPending}
      chargingStation={chargingStation ?? null}
      customerStationRequest={customerStationRequest ?? null}
      providerActiveVisit={providerActiveVisit}
      customerVisit={customerVisit}
      notifications={notifications ?? []}
      reviews={reviews}
    />
  )
}
