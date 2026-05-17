export type ChargingStationFormErrors = {
  address?: string[]
  lat?: string[]
  lng?: string[]
  station_type?: string[]
  opening_time?: string[]
  closing_time?: string[]
}

export type ChargingStationActionState = {
  errors: ChargingStationFormErrors
  message: string
  success: boolean
}

export const initialChargingStationState: ChargingStationActionState = {
  errors: {},
  message: '',
  success: false,
}

const ISRAEL_BOUNDS = { latMin: 29.4, latMax: 33.4, lngMin: 34.2, lngMax: 35.9 }

const VALID_STATION_TYPES = ['FAST', 'SLOW'] as const
export type StationType = (typeof VALID_STATION_TYPES)[number]

const TIME_RE = /^\d{2}:\d{2}$/

export function validateChargingStation(values: {
  address: string
  lat: string
  lng: string
  station_type: string
  opening_time?: string
  closing_time?: string
}):
  | { success: true; data: { address: string; lat: number; lng: number; station_type: StationType; opening_time: string | null; closing_time: string | null } }
  | { success: false; errors: ChargingStationFormErrors } {
  const errors: ChargingStationFormErrors = {}

  if (!values.address.trim()) {
    errors.address = ['Address is required.']
  }

  const lat = parseFloat(values.lat)
  if (isNaN(lat) || lat < ISRAEL_BOUNDS.latMin || lat > ISRAEL_BOUNDS.latMax) {
    errors.lat = [`Latitude must be within Israel (${ISRAEL_BOUNDS.latMin}–${ISRAEL_BOUNDS.latMax}).`]
  }

  const lng = parseFloat(values.lng)
  if (isNaN(lng) || lng < ISRAEL_BOUNDS.lngMin || lng > ISRAEL_BOUNDS.lngMax) {
    errors.lng = [`Longitude must be within Israel (${ISRAEL_BOUNDS.lngMin}–${ISRAEL_BOUNDS.lngMax}).`]
  }

  if (!VALID_STATION_TYPES.includes(values.station_type as StationType)) {
    errors.station_type = ['Please select a valid station type.']
  }

  const openingTime = values.opening_time?.trim() || null
  const closingTime = values.closing_time?.trim() || null

  if ((openingTime && !closingTime) || (!openingTime && closingTime)) {
    const field = !openingTime ? 'opening_time' : 'closing_time'
    errors[field] = ['Both opening and closing times must be set together.']
  }

  if (openingTime && !TIME_RE.test(openingTime)) {
    errors.opening_time = ['Invalid time format.']
  }
  if (closingTime && !TIME_RE.test(closingTime)) {
    errors.closing_time = ['Invalid time format.']
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors }
  }

  return {
    success: true,
    data: {
      address: values.address.trim(),
      lat,
      lng,
      station_type: values.station_type as StationType,
      opening_time: openingTime,
      closing_time: closingTime,
    },
  }
}

export function isStationOpen(openingTime: string | null, closingTime: string | null): boolean {
  if (!openingTime || !closingTime) return true

  const israelTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())

  const [h, m] = israelTime.split(':').map(Number)
  const now = h * 60 + m

  const [oh, om] = openingTime.split(':').map(Number)
  const [ch, cm] = closingTime.split(':').map(Number)
  const opens = oh * 60 + om
  const closes = ch * 60 + cm

  return opens <= closes ? now >= opens && now < closes : now >= opens || now < closes
}
