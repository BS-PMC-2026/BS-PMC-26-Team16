'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import CustomerActiveVisitPanel from './CustomerActiveVisitPanel'
import CustomerProfileForm from './CustomerProfileForm'
import CustomerStationRequestForm from './CustomerStationRequestForm'
import ProviderActiveVisitPanel from './ProviderActiveVisitPanel'
import ProviderNotificationsPanel from './ProviderNotificationsPanel'
import ProviderProfileForm from './ProviderProfileForm'
import ChargingStationForm from './ChargingStationForm'

type UserRole = 'customer' | 'provider'
type Tab = 'profile' | 'station' | 'reviews'

type ChargingStation = {
  id: string
  address: string
  lat: number
  lng: number
  station_type: string
  opening_time: string | null
  closing_time: string | null
  is_approve?: boolean | null
}

type ProviderVisit = {
  id: string
  visitor_name: string | null
  visitor_phone: string | null
  created_at: string
  status: 'on_the_way' | 'arrived'
}

type CustomerVisit = {
  id: string
  station_address: string
  created_at: string
  status: 'on_the_way' | 'arrived' | 'completed'
  already_rated: boolean
}

type Notification = {
  id: string
  message: string
  read: boolean
  created_at: string
}

export type StationReview = {
  id: string
  score: number
  comment: string | null
  created_at: string
  reviewerName: string
}

type Props = {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: UserRole
  roleLabel: string
  statusLabel: string
  chargingStation: ChargingStation | null
  customerStationRequest: ChargingStation | null
  providerActiveVisit: ProviderVisit | null
  customerVisit: CustomerVisit | null
  notifications: Notification[]
  reviews: StationReview[]
}

export default function UserDashboard({
  firstName,
  lastName,
  email,
  phone,
  role,
  roleLabel,
  statusLabel,
  chargingStation,
  customerStationRequest,
  providerActiveVisit,
  customerVisit,
  notifications,
  reviews,
}: Props) {
  const [tab, setTab] = useState<Tab>('profile')
  const fullName = `${firstName} ${lastName}`.trim() || 'User'
  const stationForDisplay = chargingStation ?? customerStationRequest
  const profilePanelTitle = role === 'provider' ? 'Service Provider Profile' : 'Profile Details'
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.score, 0) / reviews.length
    : null

  return (
    <main className="flex min-h-screen flex-col bg-gray-950 text-white">
      <div className="flex flex-1 flex-col gap-5 p-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/15 text-sm font-bold text-cyan-300">
              {firstName.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">{fullName}</p>
              <p className="mt-0.5 text-sm text-gray-500">{roleLabel}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Stat label="Status" value={statusLabel} color="text-cyan-400" />
            <Stat
              label="Charging point"
              value={stationForDisplay ? (stationForDisplay.is_approve === false ? 'Pending' : 'Registered') : 'None'}
              color={stationForDisplay ? 'text-cyan-400' : 'text-gray-500'}
            />
            <Stat label="Reviews" value={String(reviews.length)} color="text-amber-400" />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 gap-4">
          <aside className="flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-white/6 bg-[#111318]">
            <div className="border-b border-white/6 px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-500">Dashboard</p>
            </div>

            <nav className="flex flex-col p-3">
              <TabButton active={tab === 'profile'} label="Profile Details" onClick={() => setTab('profile')} />
              <TabButton active={tab === 'station'} label="My Charging Point" onClick={() => setTab('station')} />
              <TabButton active={tab === 'reviews'} label="My Charging Point Reviews" onClick={() => setTab('reviews')} />
            </nav>

            <div className="mt-auto border-t border-white/6 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">Overview</p>
              <div className="mt-3 space-y-3">
                <MiniDetail label="Email" value={email} />
                <MiniDetail label="Role" value={roleLabel} />
                {stationForDisplay && <MiniDetail label="Station" value={stationForDisplay.address} />}
              </div>
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/6 bg-[#111318]">
            <div className="flex-1 overflow-y-auto p-7">
              {tab === 'profile' && (
                <Panel title={profilePanelTitle} subtitle="Update your personal details and password.">
                  {role === 'provider' ? (
                    <ProviderProfileForm
                      firstName={firstName}
                      lastName={lastName}
                      email={email}
                      role={roleLabel}
                      phone={phone}
                    />
                  ) : (
                    <CustomerProfileForm
                      firstName={firstName}
                      lastName={lastName}
                      email={email}
                      role={roleLabel}
                    />
                  )}
                </Panel>
              )}

              {tab === 'station' && (
                <Panel
                  title="My Charging Point"
                  subtitle={
                    role === 'provider'
                      ? 'Manage the charging point customers can find on the map.'
                      : 'Request approval for your home charging point.'
                  }
                >
                  {role === 'provider' ? (
                    <>
                      {customerVisit && <CustomerActiveVisitPanel visit={customerVisit} />}
                      <ChargingStationForm existingStation={chargingStation} />
                      {providerActiveVisit && <ProviderActiveVisitPanel visit={providerActiveVisit} />}
                      <ProviderNotificationsPanel notifications={notifications} />
                    </>
                  ) : (
                    <>
                      <CustomerStationRequestForm existingRequest={customerStationRequest} />
                      {customerVisit && <CustomerActiveVisitPanel visit={customerVisit} />}
                    </>
                  )}
                </Panel>
              )}

              {tab === 'reviews' && (
                <Panel
                  title="My Charging Point Reviews"
                  subtitle="See the ratings customers left for your charging point."
                >
                  <ReviewsPanel
                    station={stationForDisplay}
                    reviews={reviews}
                    averageRating={averageRating}
                    role={role}
                  />
                </Panel>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
        active
          ? 'bg-cyan-500/15 text-white ring-1 ring-cyan-500/30'
          : 'text-gray-500 hover:bg-white/[0.04] hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  )
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function ReviewsPanel({
  station,
  reviews,
  averageRating,
  role,
}: {
  station: ChargingStation | null
  reviews: StationReview[]
  averageRating: number | null
  role: UserRole
}) {
  if (!station) {
    return (
      <EmptyState
        title="No charging point yet"
        text={
          role === 'provider'
            ? 'Register your charging point first, then reviews will appear here.'
            : 'After your charging point is approved, reviews will appear here.'
        }
      />
    )
  }

  if (station.is_approve === false) {
    return (
      <EmptyState
        title="Waiting for approval"
        text="Your charging point request is pending admin approval. Reviews will be available after approval."
      />
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/6 bg-black/25 p-5">
          <p className="text-xs text-gray-600">Average rating</p>
          <p className="mt-2 text-2xl font-bold text-amber-300">
            {averageRating == null ? '—' : averageRating.toFixed(1)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/6 bg-black/25 p-5">
          <p className="text-xs text-gray-600">Total reviews</p>
          <p className="mt-2 text-2xl font-bold text-white">{reviews.length}</p>
        </div>
        <div className="rounded-2xl border border-white/6 bg-black/25 p-5">
          <p className="text-xs text-gray-600">Station type</p>
          <p className="mt-2 text-lg font-semibold text-cyan-300">
            {station.station_type === 'FAST' ? 'Fast Charging' : 'Slow Charging'}
          </p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <EmptyState title="No reviews yet" text="Customer reviews will show here after completed visits." />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-white/6 bg-black/25 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">{review.reviewerName}</p>
                  <p className="mt-1 text-xs text-gray-600">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-gray-950">
                  {review.score.toFixed(1)}
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-300">{review.comment?.trim() || 'No written comment.'}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-white/6 bg-black/20 p-8 text-center">
      <p className="text-base font-semibold text-white">{title}</p>
      <p className="mt-2 max-w-md text-sm text-gray-500">{text}</p>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className={`font-bold ${color}`}>{value}</span>
      <span className="text-gray-500">{label}</span>
    </div>
  )
}

function MiniDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-gray-600">{label}</p>
      <p className="mt-1 truncate text-sm text-gray-300">{value || '—'}</p>
    </div>
  )
}
