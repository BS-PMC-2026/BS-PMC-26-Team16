export type FeedbackResponse = {
  id: string
  message: string
  created_at: string
}

export type Review = {
  id: string
  score: number
  comment: string | null
  created_at: string
  reviewer_name: string
  reviewer_email: string
  feedback_responses: FeedbackResponse[]
}

export type StationRow = {
  key: string
  source: 'provider' | 'geo'
  providerId: string | null
  providerLat: number | null
  providerLng: number | null
  station_type: 'FAST' | 'SLOW' | null
  phone: string
  is_approve: boolean | null
  opening_time: string | null
  closing_time: string | null
  avg_rating: number | null
  rating_count: number
  reviews: Review[]
  geoLat: number | null
  geoLng: number | null
  geoName: string | null
  geoOperator: string | null
  geoFast: number | null
  address: string
}
