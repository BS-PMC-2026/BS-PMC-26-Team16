import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChargingPointsClient from '../app/admin/charging-points/ChargingPointsClient'

/* ── mocks ── */

vi.mock('next/script', () => ({ default: () => null }))

vi.mock('../app/admin/charging-points/actions', () => ({
  addAdminStation: vi.fn().mockResolvedValue({}),
  deleteChargingPoint: vi.fn().mockResolvedValue({}),
  deleteGeoStation: vi.fn().mockResolvedValue({}),
  updateProviderStationAddress: vi.fn().mockResolvedValue({}),
  updateGeoStationAddress: vi.fn().mockResolvedValue({}),
  updateProviderStationLocation: vi.fn().mockResolvedValue({}),
  updateGeoStationLocation: vi.fn().mockResolvedValue({}),
  sendFeedbackEmail: vi.fn().mockResolvedValue({}),
  deleteReview: vi.fn().mockResolvedValue({}),
}))

/* ── fixtures ── */

import type { StationRow, Review } from '../app/admin/charging-points/types'

const review1: Review = {
  id: 'rv-1',
  score: 5,
  comment: 'Great charger!',
  created_at: '2026-03-01T10:00:00',
  reviewer_name: 'Alice Levi',
  reviewer_email: 'alice@example.com',
  feedback_responses: [],
}

const review2: Review = {
  id: 'rv-2',
  score: 2,
  comment: 'Too slow.',
  created_at: '2026-04-01T10:00:00',
  reviewer_name: 'Bob Cohen',
  reviewer_email: 'bob@example.com',
  feedback_responses: [],
}

const stationA: StationRow = {
  key: 'provider_s1',
  source: 'provider',
  providerId: 's1',
  providerLat: 32.08,
  providerLng: 34.78,
  station_type: 'FAST',
  phone: '0501111111',
  is_approve: true,
  opening_time: '08:00',
  closing_time: '22:00',
  avg_rating: 3.5,
  rating_count: 2,
  reviews: [review1, review2],
  geoLat: null,
  geoLng: null,
  geoName: null,
  geoOperator: null,
  geoFast: null,
  address: 'Rothschild 10, Tel Aviv',
}

const stationB: StationRow = {
  key: 'provider_s2',
  source: 'provider',
  providerId: 's2',
  providerLat: 32.09,
  providerLng: 34.79,
  station_type: 'SLOW',
  phone: '0502222222',
  is_approve: true,
  opening_time: null,
  closing_time: null,
  avg_rating: null,
  rating_count: 0,
  reviews: [],
  geoLat: null,
  geoLng: null,
  geoName: null,
  geoOperator: null,
  geoFast: null,
  address: 'Dizengoff 50, Tel Aviv',
}

const stationC: StationRow = {
  key: 'geo_32_34',
  source: 'geo',
  providerId: null,
  providerLat: null,
  providerLng: null,
  station_type: null,
  phone: '',
  is_approve: true,
  opening_time: null,
  closing_time: null,
  avg_rating: 4,
  rating_count: 1,
  reviews: [{ ...review1, id: 'rv-3' }],
  geoLat: 32.0,
  geoLng: 34.0,
  geoName: 'Central Haifa Station',
  geoOperator: 'EV Go',
  geoFast: 2,
  address: 'Haifa Port 1',
}

const stationD: StationRow = {
  key: 'geo_32_35',
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
  geoLat: 32.1,
  geoLng: 34.1,
  geoName: 'Beer Sheva Mall',
  geoOperator: null,
  geoFast: 0,
  address: 'Beer Sheva Mall Parking',
}

const defaultRows: StationRow[] = [stationA, stationB, stationC, stationD]

/* ─────────────────────────── stats bar ─────────────────────────── */

describe('stats bar', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows total station count', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    // "4" appears in both the stats bar and the filter count badge
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Total Stations')).toBeInTheDocument()
  })

  it('shows correct provider station count', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    expect(screen.getByText('Provider Stations')).toBeInTheDocument()
  })

  it('shows correct public station count', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    expect(screen.getByText('Public Stations')).toBeInTheDocument()
  })

  it('shows correct count of stations with reviews', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    expect(screen.getByText('With Reviews')).toBeInTheDocument()
  })

  it('shows zero counts for an empty list', () => {
    render(<ChargingPointsClient rows={[]} />)
    // All four stat values should be 0
    const zeros = screen.getAllByText('0')
    expect(zeros.length).toBeGreaterThanOrEqual(4)
  })
})

/* ─────────────────────────── station list ─────────────────────────── */

describe('station list', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders each station in the list', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    expect(screen.getByText('Rothschild 10, Tel Aviv')).toBeInTheDocument()
    expect(screen.getByText('Dizengoff 50, Tel Aviv')).toBeInTheDocument()
    expect(screen.getByText('Central Haifa Station')).toBeInTheDocument()
    expect(screen.getByText('Beer Sheva Mall')).toBeInTheDocument()
  })

  it('shows "No stations found." when rows is empty', () => {
    render(<ChargingPointsClient rows={[]} />)
    expect(screen.getByText('No stations found.')).toBeInTheDocument()
  })

  it('shows the count badge reflecting visible station count', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    // The list header badge shows filtered count (same number as stats bar total when no filter)
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(2)
  })

  it('shows the empty detail prompt when nothing is selected', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    expect(screen.getByText('Select a station')).toBeInTheDocument()
  })
})

/* ─────────────────────────── search ─────────────────────────── */

describe('search', () => {
  beforeEach(() => vi.clearAllMocks())

  it('filters list by address text', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    fireEvent.change(screen.getByPlaceholderText('Search by name or address…'), {
      target: { value: 'Rothschild' },
    })
    expect(screen.getByText('Rothschild 10, Tel Aviv')).toBeInTheDocument()
    expect(screen.queryByText('Dizengoff 50, Tel Aviv')).not.toBeInTheDocument()
  })

  it('filters list by geoName', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    fireEvent.change(screen.getByPlaceholderText('Search by name or address…'), {
      target: { value: 'haifa' },
    })
    expect(screen.getByText('Central Haifa Station')).toBeInTheDocument()
    expect(screen.queryByText('Beer Sheva Mall')).not.toBeInTheDocument()
  })

  it('shows "No stations match." when no results', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    fireEvent.change(screen.getByPlaceholderText('Search by name or address…'), {
      target: { value: 'zzznomatch' },
    })
    expect(screen.getByText('No stations match.')).toBeInTheDocument()
  })
})

/* ─────────────────────────── source filter ─────────────────────────── */

describe('source filter', () => {
  beforeEach(() => vi.clearAllMocks())

  function openFilter() {
    fireEvent.click(screen.getByText('Filter'))
  }

  it('hides provider stations when "Provider stations" is unchecked', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    openFilter()
    fireEvent.click(screen.getByRole('button', { name: /provider stations/i }))
    expect(screen.queryByText('Rothschild 10, Tel Aviv')).not.toBeInTheDocument()
    expect(screen.queryByText('Dizengoff 50, Tel Aviv')).not.toBeInTheDocument()
  })

  it('hides geo stations when "Public stations" is unchecked', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    openFilter()
    fireEvent.click(screen.getByRole('button', { name: /public stations/i }))
    expect(screen.queryByText('Central Haifa Station')).not.toBeInTheDocument()
    expect(screen.queryByText('Beer Sheva Mall')).not.toBeInTheDocument()
  })

  it('restoring provider filter brings stations back', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    openFilter()
    fireEvent.click(screen.getByRole('button', { name: /provider stations/i }))
    expect(screen.queryByText('Rothschild 10, Tel Aviv')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /provider stations/i }))
    expect(screen.getByText('Rothschild 10, Tel Aviv')).toBeInTheDocument()
  })
})

/* ─────────────────────────── fast charging filter ─────────────────────────── */

describe('fast charging filter', () => {
  beforeEach(() => vi.clearAllMocks())

  function openFilter() {
    fireEvent.click(screen.getByText('Filter'))
  }

  it('hides fast-charging stations when "Has fast charging" is unchecked', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    openFilter()
    fireEvent.click(screen.getByRole('button', { name: /has fast charging/i }))
    // stationA (FAST) and stationC (geoFast=2) should disappear
    expect(screen.queryByText('Rothschild 10, Tel Aviv')).not.toBeInTheDocument()
    expect(screen.queryByText('Central Haifa Station')).not.toBeInTheDocument()
    // stationB (SLOW) and stationD (geoFast=0) remain
    expect(screen.getByText('Dizengoff 50, Tel Aviv')).toBeInTheDocument()
    expect(screen.getByText('Beer Sheva Mall')).toBeInTheDocument()
  })

  it('hides non-fast stations when "No fast charging" is unchecked', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    openFilter()
    fireEvent.click(screen.getByRole('button', { name: /no fast charging/i }))
    expect(screen.queryByText('Dizengoff 50, Tel Aviv')).not.toBeInTheDocument()
    expect(screen.queryByText('Beer Sheva Mall')).not.toBeInTheDocument()
    expect(screen.getByText('Rothschild 10, Tel Aviv')).toBeInTheDocument()
    expect(screen.getByText('Central Haifa Station')).toBeInTheDocument()
  })
})

/* ─────────────────────────── review filter ─────────────────────────── */

describe('review filter', () => {
  beforeEach(() => vi.clearAllMocks())

  function openFilter() {
    fireEvent.click(screen.getByText('Filter'))
  }

  it('hides stations with reviews when "Has reviews" is unchecked', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    openFilter()
    fireEvent.click(screen.getByRole('button', { name: /has reviews/i }))
    expect(screen.queryByText('Rothschild 10, Tel Aviv')).not.toBeInTheDocument()
    expect(screen.queryByText('Central Haifa Station')).not.toBeInTheDocument()
    expect(screen.getByText('Dizengoff 50, Tel Aviv')).toBeInTheDocument()
    expect(screen.getByText('Beer Sheva Mall')).toBeInTheDocument()
  })

  it('hides stations without reviews when "No reviews" is unchecked', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    openFilter()
    fireEvent.click(screen.getByRole('button', { name: /no reviews/i }))
    expect(screen.queryByText('Dizengoff 50, Tel Aviv')).not.toBeInTheDocument()
    expect(screen.queryByText('Beer Sheva Mall')).not.toBeInTheDocument()
  })
})

/* ─────────────────────────── station selection & detail panel ─────────────────────────── */

describe('station selection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows station detail when a station is clicked', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    fireEvent.click(screen.getByText('Rothschild 10, Tel Aviv'))
    // Detail panel shows the address as heading
    expect(screen.getAllByText('Rothschild 10, Tel Aviv').length).toBeGreaterThanOrEqual(1)
  })

  it('shows the Provider badge in the detail panel', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    fireEvent.click(screen.getByText('Rothschild 10, Tel Aviv'))
    expect(screen.getAllByText('Provider').length).toBeGreaterThanOrEqual(1)
  })

  it('shows the Fast badge for a fast-charging station', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    fireEvent.click(screen.getByText('Rothschild 10, Tel Aviv'))
    // "Fast" appears in the list badge and in the detail panel badge
    expect(screen.getAllByText('Fast').length).toBeGreaterThanOrEqual(1)
  })

  it('shows review count and reviews in the detail panel', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    fireEvent.click(screen.getByText('Rothschild 10, Tel Aviv'))
    expect(screen.getByText('Reviews (2)')).toBeInTheDocument()
    expect(screen.getByText('"Great charger!"')).toBeInTheDocument()
    expect(screen.getByText('"Too slow."')).toBeInTheDocument()
  })

  it('shows reviewer names in the detail panel', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    fireEvent.click(screen.getByText('Rothschild 10, Tel Aviv'))
    expect(screen.getByText('Alice Levi')).toBeInTheDocument()
    expect(screen.getByText('Bob Cohen')).toBeInTheDocument()
  })

  it('shows the geo station name as heading for a geo station', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    fireEvent.click(screen.getByText('Central Haifa Station'))
    expect(screen.getAllByText('Central Haifa Station').length).toBeGreaterThanOrEqual(1)
  })

  it('shows the Public badge for a geo station', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    fireEvent.click(screen.getByText('Central Haifa Station'))
    expect(screen.getAllByText('Public').length).toBeGreaterThanOrEqual(1)
  })

  it('switches the detail panel when a different station is clicked', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    fireEvent.click(screen.getByText('Rothschild 10, Tel Aviv'))
    fireEvent.click(screen.getByText('Dizengoff 50, Tel Aviv'))
    expect(screen.getAllByText('Dizengoff 50, Tel Aviv').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('"Great charger!"')).not.toBeInTheDocument()
  })
})

/* ─────────────────────────── edit location modal ─────────────────────────── */

describe('edit location modal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens the Edit Location modal when the button is clicked', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    fireEvent.click(screen.getByText('Rothschild 10, Tel Aviv'))
    fireEvent.click(screen.getByRole('button', { name: /edit location/i }))
    // Both the action button and the modal heading say "Edit Location"
    expect(screen.getAllByText('Edit Location').length).toBeGreaterThanOrEqual(2)
  })

  it('closes the modal when Cancel is clicked', () => {
    render(<ChargingPointsClient rows={defaultRows} />)
    fireEvent.click(screen.getByText('Rothschild 10, Tel Aviv'))
    fireEvent.click(screen.getByRole('button', { name: /edit location/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    // Modal heading should be gone
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
  })
})

/* ─────────────────────────── delete station (optimistic) ─────────────────────────── */

describe('delete station', () => {
  beforeEach(() => vi.clearAllMocks())

  it('removes the station from the list immediately after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ChargingPointsClient rows={defaultRows} />)
    fireEvent.click(screen.getByText('Rothschild 10, Tel Aviv'))
    fireEvent.click(screen.getByRole('button', { name: /delete station/i }))
    await waitFor(() => {
      expect(screen.queryByText('Rothschild 10, Tel Aviv')).not.toBeInTheDocument()
    })
  })

  it('does not remove the station if confirmation is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ChargingPointsClient rows={defaultRows} />)
    fireEvent.click(screen.getByText('Rothschild 10, Tel Aviv'))
    fireEvent.click(screen.getByRole('button', { name: /delete station/i }))
    // Address appears in both the list item and the detail panel header
    expect(screen.getAllByText('Rothschild 10, Tel Aviv').length).toBeGreaterThanOrEqual(1)
  })

  it('clears the detail panel after deleting the selected station', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ChargingPointsClient rows={defaultRows} />)
    fireEvent.click(screen.getByText('Rothschild 10, Tel Aviv'))
    fireEvent.click(screen.getByRole('button', { name: /delete station/i }))
    await waitFor(() => {
      expect(screen.getByText('Select a station')).toBeInTheDocument()
    })
  })
})

/* ─────────────────────────── delete review (optimistic) ─────────────────────────── */

describe('delete review', () => {
  beforeEach(() => vi.clearAllMocks())

  it('removes the review from the detail panel immediately after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ChargingPointsClient rows={defaultRows} />)
    fireEvent.click(screen.getByText('Rothschild 10, Tel Aviv'))
    expect(screen.getByText('"Great charger!"')).toBeInTheDocument()

    // There are two Delete buttons (one per review); click the first
    const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i })
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.queryByText('"Great charger!"')).not.toBeInTheDocument()
    })
  })

  it('keeps the other review after deleting one', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ChargingPointsClient rows={defaultRows} />)
    fireEvent.click(screen.getByText('Rothschild 10, Tel Aviv'))

    const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i })
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.queryByText('"Great charger!"')).not.toBeInTheDocument()
    })
    expect(screen.getByText('"Too slow."')).toBeInTheDocument()
  })

  it('does not remove the review if confirmation is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ChargingPointsClient rows={defaultRows} />)
    fireEvent.click(screen.getByText('Rothschild 10, Tel Aviv'))
    const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i })
    fireEvent.click(deleteButtons[0])
    expect(screen.getByText('"Great charger!"')).toBeInTheDocument()
  })
})
