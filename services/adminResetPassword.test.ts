import { beforeEach, describe, expect, it, vi } from 'vitest'

const createServerClientMock = vi.fn()

vi.mock('../lib/supabase/server', () => ({
  createClient: () => createServerClientMock(),
}))

import { POST } from '../app/admin/reset-password/route'

function makeRequest(body: object) {
  return new Request('http://localhost/admin/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

type MockOptions = {
  user?: object | null
  authError?: object | null
  profile?: { user_type: string; is_approved: boolean } | null
  resetError?: object | null
}

function makeSupabaseMock({
  user = { id: 'admin-1' },
  authError = null,
  profile = { user_type: 'admin', is_approved: true },
  resetError = null,
}: MockOptions = {}) {
  const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: resetError })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: authError }),
      resetPasswordForEmail,
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: profile, error: null }),
        }),
      }),
    }),
    calls: { resetPasswordForEmail },
  }
}

describe('POST /admin/reset-password', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when email is missing from request body', async () => {
    createServerClientMock.mockResolvedValue(makeSupabaseMock())
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Missing email' })
  })

  it('returns 401 when no user is authenticated', async () => {
    createServerClientMock.mockResolvedValue(
      makeSupabaseMock({ user: null, authError: new Error('Not authenticated') })
    )
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 403 when caller is a customer, not an admin', async () => {
    createServerClientMock.mockResolvedValue(
      makeSupabaseMock({ profile: { user_type: 'customer', is_approved: true } })
    )
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ error: 'Admin access required' })
  })

  it('returns 403 when admin account is not approved', async () => {
    createServerClientMock.mockResolvedValue(
      makeSupabaseMock({ profile: { user_type: 'admin', is_approved: false } })
    )
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(403)
  })

  it('returns 403 when profile is null', async () => {
    createServerClientMock.mockResolvedValue(makeSupabaseMock({ profile: null }))
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(403)
  })

  it('calls resetPasswordForEmail with the correct email and redirectTo', async () => {
    const supabase = makeSupabaseMock()
    createServerClientMock.mockResolvedValue(supabase)
    process.env.NEXT_PUBLIC_APP_URL = 'https://urban-ev.example.com'

    await POST(makeRequest({ email: 'user@example.com' }))

    expect(supabase.calls.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: 'https://urban-ev.example.com/reset-password',
    })
  })

  it('returns 200 with success:true when everything is valid', async () => {
    createServerClientMock.mockResolvedValue(makeSupabaseMock())
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ success: true })
  })

  it('returns 500 when Supabase resetPasswordForEmail returns an error', async () => {
    createServerClientMock.mockResolvedValue(
      makeSupabaseMock({ resetError: { message: 'User not found' } })
    )
    const res = await POST(makeRequest({ email: 'unknown@example.com' }))
    expect(res.status).toBe(500)
  })
})
