import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MapVisitPanel from '../app/map/MapVisitPanel'
import type { CustomerVisit } from '../app/User/CustomerActiveVisitPanel'

/* ── mocks ── */

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const { markArrivedMock, completeVisitMock, cancelVisitMock, submitRatingMock } = vi.hoisted(() => ({
  markArrivedMock: vi.fn(),
  completeVisitMock: vi.fn(),
  cancelVisitMock: vi.fn(),
  submitRatingMock: vi.fn(),
}))

vi.mock('../app/User/actions', () => ({
  markArrived: (...args: unknown[]) => markArrivedMock(...args),
  completeVisit: (...args: unknown[]) => completeVisitMock(...args),
  cancelVisit: (...args: unknown[]) => cancelVisitMock(...args),
  submitRating: (...args: unknown[]) => submitRatingMock(...args),
}))

/* ── fixtures ── */

const onTheWayVisit: CustomerVisit = {
  id: 'visit-1',
  station_address: '42 EV Street, Tel Aviv',
  created_at: new Date().toISOString(),
  status: 'on_the_way',
  already_rated: false,
}

const arrivedVisit: CustomerVisit = {
  ...onTheWayVisit,
  status: 'arrived',
}

const routeInfo = { duration: '8 min', distance: '3.2 km' }

/* ── tests ── */

describe('MapVisitPanel — on_the_way phase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    markArrivedMock.mockResolvedValue({})
    cancelVisitMock.mockResolvedValue({})
  })

  it('renders the station address', () => {
    render(
      <MapVisitPanel
        visit={onTheWayVisit}
        routeInfo={null}
        onStopNavigation={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('42 EV Street, Tel Aviv')).toBeInTheDocument()
  })

  it('shows "on the way" heading', () => {
    render(
      <MapVisitPanel
        visit={onTheWayVisit}
        routeInfo={null}
        onStopNavigation={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText(/you're on your way/i)).toBeInTheDocument()
  })

  it('renders route info card when routeInfo is provided', () => {
    render(
      <MapVisitPanel
        visit={onTheWayVisit}
        routeInfo={routeInfo}
        onStopNavigation={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('8 min')).toBeInTheDocument()
    expect(screen.getByText('3.2 km')).toBeInTheDocument()
  })

  it('does not render route info card when routeInfo is null', () => {
    render(
      <MapVisitPanel
        visit={onTheWayVisit}
        routeInfo={null}
        onStopNavigation={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.queryByText(/route to station/i)).not.toBeInTheDocument()
  })

  it('renders "I\'ve arrived" and cancel buttons', () => {
    render(
      <MapVisitPanel
        visit={onTheWayVisit}
        routeInfo={null}
        onStopNavigation={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /i've arrived/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('calls markArrived with visit id when "I\'ve arrived" is clicked', async () => {
    render(
      <MapVisitPanel
        visit={onTheWayVisit}
        routeInfo={null}
        onStopNavigation={vi.fn()}
        onClose={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /i've arrived/i }))
    await waitFor(() => {
      expect(markArrivedMock).toHaveBeenCalledWith('visit-1')
    })
  })

  it('redirects to /User?tab=status after marking arrived', async () => {
    render(
      <MapVisitPanel
        visit={onTheWayVisit}
        routeInfo={null}
        onStopNavigation={vi.fn()}
        onClose={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /i've arrived/i }))
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/User?tab=status')
    })
  })

  it('shows error text when markArrived returns an error', async () => {
    markArrivedMock.mockResolvedValue({ error: 'Visit already cancelled' })
    render(
      <MapVisitPanel
        visit={onTheWayVisit}
        routeInfo={null}
        onStopNavigation={vi.fn()}
        onClose={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /i've arrived/i }))
    expect(await screen.findByText(/visit already cancelled/i)).toBeInTheDocument()
  })

  it('calls cancelVisit and onClose when cancel button is clicked', async () => {
    const onClose = vi.fn()
    render(
      <MapVisitPanel
        visit={onTheWayVisit}
        routeInfo={null}
        onStopNavigation={vi.fn()}
        onClose={onClose}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /cancel — i'm not coming/i }))
    await waitFor(() => {
      expect(cancelVisitMock).toHaveBeenCalledWith('visit-1')
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('calls cancelVisit and onStopNavigation when "Stop Navigation" is clicked', async () => {
    const onStopNavigation = vi.fn()
    const onClose = vi.fn()
    render(
      <MapVisitPanel
        visit={onTheWayVisit}
        routeInfo={routeInfo}
        onStopNavigation={onStopNavigation}
        onClose={onClose}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /stop navigation/i }))
    await waitFor(() => {
      expect(cancelVisitMock).toHaveBeenCalledWith('visit-1')
    })
    expect(onStopNavigation).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})

describe('MapVisitPanel — arrived phase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    completeVisitMock.mockResolvedValue({})
  })

  it('renders "You\'ve arrived!" heading', () => {
    render(
      <MapVisitPanel
        visit={arrivedVisit}
        routeInfo={null}
        onStopNavigation={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText(/you've arrived/i)).toBeInTheDocument()
  })

  it('renders "Done charging" button', () => {
    render(
      <MapVisitPanel
        visit={arrivedVisit}
        routeInfo={null}
        onStopNavigation={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /done charging/i })).toBeInTheDocument()
  })

  it('calls completeVisit when "Done charging" is clicked', async () => {
    render(
      <MapVisitPanel
        visit={arrivedVisit}
        routeInfo={null}
        onStopNavigation={vi.fn()}
        onClose={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /done charging/i }))
    await waitFor(() => {
      expect(completeVisitMock).toHaveBeenCalledWith('visit-1')
    })
  })

  it('transitions to rating phase after completing the visit', async () => {
    render(
      <MapVisitPanel
        visit={arrivedVisit}
        routeInfo={null}
        onStopNavigation={vi.fn()}
        onClose={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /done charging/i }))
    expect(await screen.findByText(/rate your experience/i)).toBeInTheDocument()
  })

  it('shows error when completeVisit returns an error', async () => {
    completeVisitMock.mockResolvedValue({ error: 'Session expired' })
    render(
      <MapVisitPanel
        visit={arrivedVisit}
        routeInfo={null}
        onStopNavigation={vi.fn()}
        onClose={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /done charging/i }))
    expect(await screen.findByText(/session expired/i)).toBeInTheDocument()
  })
})
