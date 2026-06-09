import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ForgotPasswordPage from '../app/forgot-password/page'

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

const resetPasswordForEmailMock = vi.fn()

vi.mock('@/services/auth', () => ({
  resetPasswordForEmail: (...args: unknown[]) => resetPasswordForEmailMock(...args),
}))

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPasswordForEmailMock.mockResolvedValue({ error: null })
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000' },
      writable: true,
    })
  })

  it('renders the email input and submit button', () => {
    render(<ForgotPasswordPage />)
    expect(screen.getByPlaceholderText(/you@example\.com/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
  })

  it('shows "Email is required" when submitted with empty field', async () => {
    render(<ForgotPasswordPage />)
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
  })

  it('shows invalid email error for malformed email', async () => {
    const { container } = render(<ForgotPasswordPage />)
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), {
      target: { value: 'not-an-email' },
    })
    // fireEvent.submit bypasses browser HTML5 constraint validation on type="email"
    fireEvent.submit(container.querySelector('form')!)
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
  })

  it('shows inline error on blur with invalid email', async () => {
    render(<ForgotPasswordPage />)
    const input = screen.getByPlaceholderText(/you@example\.com/i)
    fireEvent.change(input, { target: { value: 'bad-input' } })
    fireEvent.blur(input)
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
  })

  it('calls resetPasswordForEmail with trimmed lowercase email and correct redirectTo', async () => {
    render(<ForgotPasswordPage />)
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), {
      target: { value: '  ADA@Example.COM  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))
    await waitFor(() => {
      expect(resetPasswordForEmailMock).toHaveBeenCalledWith(
        'ada@example.com',
        'http://localhost:3000/reset-password'
      )
    })
  })

  it('shows success confirmation after email is sent', async () => {
    render(<ForgotPasswordPage />)
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), {
      target: { value: 'ada@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))
    expect(await screen.findByText(/reset email sent/i)).toBeInTheDocument()
  })

  it('hides the form after success and shows only the confirmation', async () => {
    render(<ForgotPasswordPage />)
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), {
      target: { value: 'ada@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))
    await screen.findByText(/reset email sent/i)
    expect(screen.queryByRole('button', { name: /send reset link/i })).not.toBeInTheDocument()
  })

  it('shows error message when the service returns an error', async () => {
    resetPasswordForEmailMock.mockResolvedValue({ error: new Error('Service unavailable') })
    render(<ForgotPasswordPage />)
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), {
      target: { value: 'ada@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument()
  })

  it('shows error message when the service throws unexpectedly', async () => {
    resetPasswordForEmailMock.mockRejectedValue(new Error('Network error'))
    render(<ForgotPasswordPage />)
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), {
      target: { value: 'ada@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument()
  })

  it('disables the submit button while the request is in flight', async () => {
    let resolveReset!: (v: { error: null }) => void
    resetPasswordForEmailMock.mockReturnValue(
      new Promise((resolve) => { resolveReset = resolve })
    )
    render(<ForgotPasswordPage />)
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), {
      target: { value: 'ada@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))
    expect(await screen.findByRole('button', { name: /sending/i })).toBeDisabled()
    await act(async () => { resolveReset({ error: null }) })
  })
})
