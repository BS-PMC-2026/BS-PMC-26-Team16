export type ChargingStationFormErrors = {
  address?: string[]
  lat?: string[]
  lng?: string[]
  station_type?: string[]
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

export function validateChargingStation(values: {
  address: string
  lat: string
  lng: string
  station_type: string
}):
  | { success: true; data: { address: string; lat: number; lng: number; station_type: StationType } }
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
    },
  }
}
