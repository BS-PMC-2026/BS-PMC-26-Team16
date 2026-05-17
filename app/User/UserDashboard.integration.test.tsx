// @vitest-environment node

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import UserDashboard from './UserDashboard'

vi.mock('./CustomerProfileForm', () => ({
  default: () => <div data-testid="customer-profile-form">Customer profile form</div>,
}))

vi.mock('./ProviderProfileForm', () => ({
  default: () => <div data-testid="provider-profile-form">Provider profile form</div>,
}))

vi.mock('./CustomerStationRequestForm', () => ({
  default: () => <div data-testid="customer-station-request-form">Customer station request form</div>,
}))

vi.mock('./ChargingStationForm', () => ({
  default: () => <div data-testid="charging-station-form">Charging station form</div>,
}))

vi.mock('./CustomerActiveVisitPanel', () => ({
  default: () => <div data-testid="customer-active-visit-panel">Customer active visit panel</div>,
}))

vi.mock('./ProviderActiveVisitPanel', () => ({
  default: () => <div data-testid="provider-active-visit-panel">Provider active visit panel</div>,
}))

vi.mock('./ProviderNotificationsPanel', () => ({
  default: () => <div data-testid="provider-notifications-panel">Provider notifications panel</div>,
}))

const baseProps = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '0501234567',
  statusLabel: 'Approved',
  providerActiveVisit: null,
  customerVisit: null,
  notifications: [],
  reviews: [],
}

describe('UserDashboard profile integration', () => {
  it('renders the customer profile flow with station request access', () => {
    const html = renderToStaticMarkup(
      <UserDashboard
        {...baseProps}
        role="customer"
        roleLabel="Customer"
        chargingStation={null}
        customerStationRequest={{
          id: 'station-request-1',
          address: 'Customer Home',
          lat: 32,
          lng: 34,
          station_type: 'SLOW',
          opening_time: '08:00',
          closing_time: '22:00',
          is_approve: false,
        }}
      />
    )

    expect(html).toContain('data-testid="customer-profile-form"')
    expect(html).not.toContain('data-testid="provider-profile-form"')
    expect(html).toContain('Customer')
    expect(html).toContain('Pending')
    expect(html).toContain('Profile Details')
    expect(html).toContain('My Charging Point')
    expect(html).toContain('My Charging Point Reviews')
  })

  it('renders the provider profile flow with station management and reviews summary', () => {
    const html = renderToStaticMarkup(
      <UserDashboard
        {...baseProps}
        role="provider"
        roleLabel="Service Provider"
        chargingStation={{
          id: 'station-1',
          address: 'Provider Station',
          lat: 32,
          lng: 34,
          station_type: 'FAST',
          opening_time: '08:00',
          closing_time: '22:00',
          is_approve: true,
        }}
        customerStationRequest={null}
        providerActiveVisit={{
          id: 'visit-owner-1',
          visitor_name: 'Customer One',
          visitor_phone: '0501111111',
          created_at: '2026-05-17T10:00:00.000Z',
          status: 'arrived',
        }}
        customerVisit={{
          id: 'visit-customer-1',
          station_address: 'Other Station',
          created_at: '2026-05-17T09:00:00.000Z',
          status: 'arrived',
          already_rated: false,
        }}
        notifications={[
          {
            id: 'notification-1',
            message: 'Customer is on the way',
            read: false,
            created_at: '2026-05-17T09:00:00.000Z',
          },
        ]}
        reviews={[
          {
            id: 'review-1',
            score: 5,
            comment: 'Great charger',
            created_at: '2026-05-17T09:00:00.000Z',
            reviewerName: 'Customer One',
          },
          {
            id: 'review-2',
            score: 3,
            comment: null,
            created_at: '2026-05-17T09:30:00.000Z',
            reviewerName: 'Customer Two',
          },
        ]}
      />
    )

    expect(html).toContain('data-testid="provider-profile-form"')
    expect(html).not.toContain('data-testid="customer-profile-form"')
    expect(html).toContain('Service Provider')
    expect(html).toContain('Registered')
    expect(html).toContain('2')
    expect(html).toContain('Profile Details')
    expect(html).toContain('My Charging Point')
    expect(html).toContain('My Charging Point Reviews')
  })
})
