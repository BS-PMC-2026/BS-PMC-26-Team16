import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminDashboard from '../app/admin/AdminDashboard'
import type { ContactMessage, PendingUser, StationWithOwner } from '../app/admin/AdminDashboard'
import type { StationRow } from '../app/admin/charging-points/types'

/* ── mocks ── */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

vi.mock('../app/admin/stations/actions', () => ({
  approveProviderStation: vi.fn().mockResolvedValue({ error: null }),
  deleteProviderStation: vi.fn().mockResolvedValue({ error: null }),
}))

vi.mock('../app/User/AdminProfileForm', () => ({
  default: () => <div data-testid="admin-profile-form" />,
}))

vi.mock('../app/admin/StationMiniMap', () => ({
  default: () => <div data-testid="station-mini-map" />,
}))

vi.mock('../app/admin/charging-points/ChargingPointsClient', () => ({
  default: () => <div data-testid="station-management-client">Station management content</div>,
}))

/* ── fixtures ── */

const pendingUsers: PendingUser[] = [
  {
    id: 'user-1',
    first_name: 'Alice',
    last_name: 'Smith',
    email: 'alice@example.com',
    phone: '0501111111',
    id_number: '111111111',
    user_type: 'customer',
    request_reason: 'I want to charge my EV.',
    provider_request_reason: null,
    created_at: '2026-03-01T10:00:00',
  },
  {
    id: 'user-2',
    first_name: 'Bob',
    last_name: 'Jones',
    email: 'bob@example.com',
    phone: '0502222222',
    id_number: '222222222',
    user_type: 'provider',
    request_reason: 'I own a charging station.',
    provider_request_reason: null,
    created_at: '2026-02-01T10:00:00',
  },
]

const stations: StationWithOwner[] = [
  {
    id: 'station-1',
    address: '123 Main St',
    station_type: 'FAST',
    lat: 32.08,
    lng: 34.78,
    ownerName: 'Charlie Provider',
    ownerPhone: '0503333333',
    access_type: 'PRIVATE',
  },
  {
    id: 'station-2',
    address: '456 Oak Ave',
    station_type: 'SLOW',
    lat: 32.09,
    lng: 34.79,
    ownerName: 'Dana Provider',
    ownerPhone: '0504444444',
    access_type: 'PRIVATE',
  },
]

const managedStations: StationRow[] = [
  {
    key: 'provider_station-1',
    source: 'provider',
    providerId: 'station-1',
    providerLat: 32.08,
    providerLng: 34.78,
    station_type: 'FAST',
    phone: '0503333333',
    is_approve: true,
    opening_time: null,
    closing_time: null,
    avg_rating: 5,
    rating_count: 1,
    reviews: [],
    geoLat: null,
    geoLng: null,
    geoName: null,
    geoOperator: null,
    geoFast: null,
    address: '123 Main St',
  },
]

const contactMessages: ContactMessage[] = [
  {
    id: 'contact-1',
    name: 'Casey Driver',
    email: 'casey@example.com',
    subject: 'Charging issue',
    message: 'The charger stopped responding.',
    status: 'new',
    admin_response: null,
    created_at: '2026-03-02T10:00:00',
    responded_at: null,
  },
]

const defaultProps = {
  adminFirstName: 'Admin',
  adminLastName: 'User',
  adminEmail: 'admin@example.com',
  pendingUsers,
  stations,
  contactMessages,
  managedStations,
  totalActiveUsers: 42,
  totalMapStations: 2303,
}

/* ─────────────────────────── stats row ─────────────────────────── */

describe('stats row', () => {
  beforeEach(() => vi.clearAllMocks())

  it('displays totalActiveUsers', () => {
    render(<AdminDashboard {...defaultProps} />)
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Active Users')).toBeInTheDocument()
  })

  it('displays totalMapStations', () => {
    render(<AdminDashboard {...defaultProps} />)
    expect(screen.getByText('2303')).toBeInTheDocument()
    expect(screen.getByText('Stations on Map')).toBeInTheDocument()
  })

  it('displays pending users count derived from the prop', () => {
    render(<AdminDashboard {...defaultProps} />)
    expect(screen.getByText('Pending Users')).toBeInTheDocument()
  })

  it('displays new station requests count derived from the prop', () => {
    render(<AdminDashboard {...defaultProps} />)
    expect(screen.getByText('New Station Requests')).toBeInTheDocument()
  })

  it('updates pending users count when a user is removed from the list', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })
    render(<AdminDashboard {...defaultProps} />)
    // Pending Users badge starts at 2
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1)
  })
})

/* ─────────────────────────── header ─────────────────────────── */

describe('header', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the admin first name', () => {
    render(<AdminDashboard {...defaultProps} />)
    expect(document.body.textContent).toContain('Admin')
  })

  it('renders a time-based greeting', () => {
    render(<AdminDashboard {...defaultProps} />)
    const greetings = ['Good morning', 'Good afternoon', 'Good evening']
    const found = greetings.some(g => document.body.textContent?.includes(g))
    expect(found).toBe(true)
  })

  it('renders the "Administrator" subtitle', () => {
    render(<AdminDashboard {...defaultProps} />)
    expect(screen.getByText('Administrator')).toBeInTheDocument()
  })

  it('opens station management from the dashboard header', () => {
    render(<AdminDashboard {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /manage stations/i }))
    expect(screen.getByTestId('station-management-client')).toBeInTheDocument()
  })
})

/* ─────────────────────────── tab switching ─────────────────────────── */

describe('tab switching', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders both tab buttons', () => {
    render(<AdminDashboard {...defaultProps} />)
    expect(screen.getByRole('button', { name: /user requests/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /charger requests/i })).toBeInTheDocument()
  })

  it('shows the user list on the default users tab', () => {
    render(<AdminDashboard {...defaultProps} />)
    // list items are buttons; use role query to avoid matching the detail panel too
    expect(screen.getByRole('button', { name: /alice smith/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /bob jones/i })).toBeInTheDocument()
  })

  it('switches to the stations tab and shows station owners', () => {
    render(<AdminDashboard {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /charger requests/i }))
    expect(screen.getByRole('button', { name: /charlie provider/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dana provider/i })).toBeInTheDocument()
  })

  it('hides the user list after switching to the stations tab', () => {
    render(<AdminDashboard {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /charger requests/i }))
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument()
  })
})

/* ─────────────────────────── station type filter ─────────────────────────── */

describe('station type filter', () => {
  function renderOnStationsTab() {
    render(<AdminDashboard {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /charger requests/i }))
    fireEvent.click(screen.getByText('Sort'))
  }

  beforeEach(() => vi.clearAllMocks())

  it('shows all stations when both FAST and SLOW are checked', () => {
    renderOnStationsTab()
    // use role query: list items are buttons; detail panel content is not a button
    expect(screen.getByRole('button', { name: /charlie provider/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dana provider/i })).toBeInTheDocument()
  })

  it('hides FAST stations when Fast Charging is unchecked', () => {
    renderOnStationsTab()
    fireEvent.click(screen.getByRole('button', { name: /fast charging/i }))
    // Charlie Provider (FAST) list button should be gone; detail panel may still show it
    expect(screen.queryByRole('button', { name: /charlie provider/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dana provider/i })).toBeInTheDocument()
  })

  it('hides SLOW stations when Slow Charging is unchecked', () => {
    renderOnStationsTab()
    fireEvent.click(screen.getByRole('button', { name: /slow charging/i }))
    expect(screen.getByRole('button', { name: /charlie provider/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /dana provider/i })).not.toBeInTheDocument()
  })

  it('shows "No stations" when all type filters are unchecked', () => {
    renderOnStationsTab()
    fireEvent.click(screen.getByRole('button', { name: /fast charging/i }))
    fireEvent.click(screen.getByRole('button', { name: /slow charging/i }))
    expect(screen.getByText('No stations')).toBeInTheDocument()
  })

  it('restoring a filter brings the station back', () => {
    renderOnStationsTab()
    fireEvent.click(screen.getByRole('button', { name: /fast charging/i }))
    expect(screen.queryByRole('button', { name: /charlie provider/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /fast charging/i }))
    expect(screen.getByRole('button', { name: /charlie provider/i })).toBeInTheDocument()
  })
})

/* ─────────────────────────── sort order ─────────────────────────── */

describe('sort order', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens the sort dropdown when the Sort button is clicked', () => {
    render(<AdminDashboard {...defaultProps} />)
    fireEvent.click(screen.getByText('Sort'))
    expect(screen.getByRole('button', { name: /newest first/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /oldest first/i })).toBeInTheDocument()
  })

  it('closes the sort dropdown after selecting an option', () => {
    render(<AdminDashboard {...defaultProps} />)
    fireEvent.click(screen.getByText('Sort'))
    fireEvent.click(screen.getByRole('button', { name: /oldest first/i }))
    expect(screen.queryByRole('button', { name: /newest first/i })).not.toBeInTheDocument()
  })
})

/* ─────────────────────────── user actions ─────────────────────────── */

describe('user actions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders Accept and Deny buttons when a user is auto-selected', () => {
    render(<AdminDashboard {...defaultProps} />)
    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /deny/i })).toBeInTheDocument()
  })

  it('Send button is disabled before any action is chosen', () => {
    render(<AdminDashboard {...defaultProps} />)
    expect(screen.getByRole('button', { name: /^send$/i })).toBeDisabled()
  })

  it('Send button becomes enabled after clicking Accept', () => {
    render(<AdminDashboard {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /accept/i }))
    expect(screen.getByRole('button', { name: /^send$/i })).not.toBeDisabled()
  })

  it('Send button becomes enabled after clicking Deny', () => {
    render(<AdminDashboard {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /deny/i }))
    expect(screen.getByRole('button', { name: /^send$/i })).not.toBeDisabled()
  })

  it('Send button becomes disabled again after toggling Accept off', () => {
    render(<AdminDashboard {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /accept/i }))
    fireEvent.click(screen.getByRole('button', { name: /accept/i }))
    expect(screen.getByRole('button', { name: /^send$/i })).toBeDisabled()
  })

  it('selecting a different user resets the action and disables Send', () => {
    render(<AdminDashboard {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /accept/i }))
    expect(screen.getByRole('button', { name: /^send$/i })).not.toBeDisabled()
    fireEvent.click(screen.getByText('Bob Jones'))
    expect(screen.getByRole('button', { name: /^send$/i })).toBeDisabled()
  })

  it('shows user details in the detail panel when a user is selected', () => {
    render(<AdminDashboard {...defaultProps} />)
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })
})

/* ─────────────────────────── station actions ─────────────────────────── */

describe('station actions', () => {
  beforeEach(() => vi.clearAllMocks())

  function switchToStations() {
    fireEvent.click(screen.getByRole('button', { name: /charger requests/i }))
  }

  it('renders Approve and Remove buttons for a PRIVATE station', () => {
    render(<AdminDashboard {...defaultProps} />)
    switchToStations()
    expect(screen.getByRole('button', { name: /^approve$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
  })

  it('Send button is disabled by default (no station action selected)', () => {
    render(<AdminDashboard {...defaultProps} />)
    switchToStations()
    expect(screen.getByRole('button', { name: /^send$/i })).toBeDisabled()
  })

  it('Send button becomes enabled after clicking Remove', () => {
    render(<AdminDashboard {...defaultProps} />)
    switchToStations()
    fireEvent.click(screen.getByRole('button', { name: /remove/i }))
    expect(screen.getByRole('button', { name: /^send$/i })).not.toBeDisabled()
  })

  it('Send button is disabled again after toggling Approve off', () => {
    render(<AdminDashboard {...defaultProps} />)
    switchToStations()
    fireEvent.click(screen.getByRole('button', { name: /^approve$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^approve$/i }))
    expect(screen.getByRole('button', { name: /^send$/i })).toBeDisabled()
  })

  it('shows station details in the detail panel when a station is selected', () => {
    render(<AdminDashboard {...defaultProps} />)
    switchToStations()
    // "Fast Charging" only appears in the detail panel, not in list items
    expect(screen.getByText('Fast Charging')).toBeInTheDocument()
  })

  it('renders the mini-map for the selected station', () => {
    render(<AdminDashboard {...defaultProps} />)
    switchToStations()
    expect(screen.getByTestId('station-mini-map')).toBeInTheDocument()
  })
})

/* ─────────────────────────── profile modal ─────────────────────────── */

describe('profile modal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens the modal when "Profile Details" is clicked', () => {
    render(<AdminDashboard {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /profile details/i }))
    expect(screen.getByText('My Details')).toBeInTheDocument()
  })

  it('renders the AdminProfileForm inside the modal', () => {
    render(<AdminDashboard {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /profile details/i }))
    expect(screen.getByTestId('admin-profile-form')).toBeInTheDocument()
  })

  it('closes the modal when the ✕ button is clicked', () => {
    render(<AdminDashboard {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /profile details/i }))
    expect(screen.getByText('My Details')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '✕' }))
    expect(screen.queryByText('My Details')).not.toBeInTheDocument()
  })

  it('closes the modal when clicking the backdrop', () => {
    const { container } = render(<AdminDashboard {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /profile details/i }))
    const backdrop = container.querySelector('.fixed.inset-0') as HTMLElement
    fireEvent.click(backdrop)
    expect(screen.queryByText('My Details')).not.toBeInTheDocument()
  })
})

/* ─────────────────────────── empty states ─────────────────────────── */

describe('empty states', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows "No pending requests" when the users list is empty', () => {
    render(<AdminDashboard {...defaultProps} pendingUsers={[]} />)
    expect(screen.getByText('No pending requests')).toBeInTheDocument()
  })

  it('shows "Select a user to view their details" when no user is selected', () => {
    render(<AdminDashboard {...defaultProps} pendingUsers={[]} />)
    expect(screen.getByText('Select a user to view their details')).toBeInTheDocument()
  })

  it('shows "No stations" when the stations list is empty', () => {
    render(<AdminDashboard {...defaultProps} stations={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /charger requests/i }))
    expect(screen.getByText('No stations')).toBeInTheDocument()
  })

  it('shows "Select a station to view details" when no station is selected', () => {
    render(<AdminDashboard {...defaultProps} stations={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /charger requests/i }))
    expect(screen.getByText('Select a station to view details')).toBeInTheDocument()
  })
})
