import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CustomerActiveVisitPanel, { type CustomerVisit } from './CustomerActiveVisitPanel'

const { submitRatingMock } = vi.hoisted(() => ({
  submitRatingMock: vi.fn(),
}))

vi.mock('./actions', () => ({
  markArrived: vi.fn(),
  completeVisit: vi.fn(),
  cancelVisit: vi.fn(),
  submitRating: (...args: unknown[]) => submitRatingMock(...args),
}))

const completedVisit: CustomerVisit = {
  id: 'visit-1',
  station_address: '123 Review Street',
  created_at: new Date().toISOString(),
  status: 'completed',
  already_rated: false,
}

function words(count: number) {
  return Array.from({ length: count }, (_, index) => `word${index + 1}`).join(' ')
}

describe('CustomerActiveVisitPanel review flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    submitRatingMock.mockResolvedValue({})
  })

  it('limits written reviews to 50 words before submitting the rating', async () => {
    render(<CustomerActiveVisitPanel visit={completedVisit} />)

    fireEvent.click(screen.getAllByRole('button')[0])
    fireEvent.change(screen.getByLabelText(/written review/i), {
      target: { value: words(55) },
    })

    expect(screen.getByText('50/50 words')).toBeInTheDocument()
    expect(screen.getByLabelText(/written review/i)).toHaveValue(words(50))

    fireEvent.click(screen.getByRole('button', { name: /submit rating/i }))

    await waitFor(() => {
      expect(submitRatingMock).toHaveBeenCalledWith('visit-1', 1, words(50))
    })
  })
})
