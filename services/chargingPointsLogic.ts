// Pure logic extracted from ChargingPointsClient and actions for testability.

export type ReviewEntry = {
  id: string
  score: number
}

export type StationEntry = {
  key: string
  source: 'provider' | 'geo'
  station_type: 'FAST' | 'SLOW' | null
  geoFast: number | null
  rating_count: number
  avg_rating: number | null
  reviews: ReviewEntry[]
  address: string
  geoName: string | null
  geoOperator: string | null
}

export function filterRows(
  rows: StationEntry[],
  search: string,
  filterSource: Set<'provider' | 'geo'>,
  filterFast: Set<'yes' | 'no'>,
  filterReview: Set<'yes' | 'no'>
): StationEntry[] {
  const q = search.toLowerCase().trim()
  return rows.filter((r) => {
    if (
      q &&
      !r.address.toLowerCase().includes(q) &&
      !r.geoName?.toLowerCase().includes(q) &&
      !r.geoOperator?.toLowerCase().includes(q)
    )
      return false
    if (!filterSource.has(r.source)) return false
    const hasFast = r.source === 'provider' ? r.station_type === 'FAST' : (r.geoFast ?? 0) > 0
    if (!filterFast.has(hasFast ? 'yes' : 'no')) return false
    const hasReview = r.rating_count > 0
    if (!filterReview.has(hasReview ? 'yes' : 'no')) return false
    return true
  })
}

export function computeStats(rows: StationEntry[]) {
  return {
    total: rows.length,
    providerCount: rows.filter((r) => r.source === 'provider').length,
    publicCount: rows.filter((r) => r.source === 'geo').length,
    withReviewCount: rows.filter((r) => r.rating_count > 0).length,
  }
}

export function recalcAfterDeleteReview<
  T extends { key: string; reviews: ReviewEntry[]; rating_count: number; avg_rating: number | null },
>(rows: T[], stationKey: string, ratingId: string): T[] {
  return rows.map((r) => {
    if (r.key !== stationKey) return r
    const newReviews = r.reviews.filter((rv) => rv.id !== ratingId)
    const newAvg = newReviews.length
      ? newReviews.reduce((sum, rv) => sum + rv.score, 0) / newReviews.length
      : null
    return { ...r, reviews: newReviews, rating_count: newReviews.length, avg_rating: newAvg }
  })
}

export function computeFeedbackToken(ratingId: string): string {
  return Buffer.from(`${ratingId}:smartev2026`).toString('base64url')
}

export function isValidFeedbackToken(ratingId: string, token: string): boolean {
  if (!ratingId || !token) return false
  return token === computeFeedbackToken(ratingId)
}
