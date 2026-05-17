// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  completeVisitAsProvider,
  requestChargingStation,
  updateAdminProfile,
  updateCustomerProfile,
  updateProviderProfile,
  upsertChargingStation,
} from './actions'

const createClientMock = vi.fn()
const refreshMock = vi.fn()
const revalidatePathMock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}))

vi.mock('next/cache', () => ({
  refresh: () => refreshMock(),
  revalidatePath: (path: string) => revalidatePathMock(path),
}))

type TableResult = { data?: unknown; error?: { message: string } | null }
type TableHandler = (operation: string, payload?: unknown) => TableResult

class QueryMock {
  private operation = ''
  private payload: unknown

  constructor(private handler: TableHandler) {}

  select(value: string) {
    this.operation = `select:${value}`
    return this
  }

  update(value: unknown) {
    this.operation = 'update'
    this.payload = value
    return this
  }

  insert(value: unknown) {
    this.operation = 'insert'
    this.payload = value
    return this
  }

  eq() {
    return this
  }

  maybeSingle() {
    return Promise.resolve(this.handler(`${this.operation}:maybeSingle`, this.payload))
  }

  single() {
    return Promise.resolve(this.handler(`${this.operation}:single`, this.payload))
  }

  then(resolve: (value: TableResult) => void, reject?: (reason?: unknown) => void) {
    return Promise.resolve(this.handler(this.operation, this.payload)).then(resolve, reject)
  }
}

function form(values: Record<string, string>) {
  const data = new FormData()
  Object.entries(values).forEach(([key, value]) => data.set(key, value))
  return data
}

function profileForm(overrides: Record<string, string> = {}) {
  return form({
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    currentEmail: 'ada@example.com',
    password: '',
    confirmPassword: '',
    ...overrides,
  })
}

function stationForm() {
  return form({
    address: '123 Main Street',
    lat: '32.0853',
    lng: '34.7818',
    station_type: 'FAST',
    opening_time: '08:00',
    closing_time: '22:00',
  })
}

function supabaseForRole(role: 'admin' | 'customer' | 'provider') {
  const updates: unknown[] = []
  const updateUser = vi.fn().mockResolvedValue({ error: null })

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'old@example.com' } }, error: null }),
      updateUser,
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return new QueryMock((operation, payload) => {
          if (operation.startsWith('select:')) {
            return { data: { user_type: role, is_approved: true }, error: null }
          }
          if (operation === 'update') {
            updates.push(payload)
            return { error: null }
          }
          return { data: null, error: null }
        })
      }
      return new QueryMock(() => ({ data: null, error: null }))
    }),
    updates,
  }

  createClientMock.mockReturnValue(supabase)
  return supabase
}

describe('profile update actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows an admin profile to update only an admin account', async () => {
    const supabase = supabaseForRole('admin')

    const result = await updateAdminProfile({ errors: {}, message: '', success: false }, profileForm())

    expect(result.success).toBe(true)
    expect(supabase.updates).toContainEqual({
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@example.com',
    })
  })

  it('rejects a customer profile update when the signed-in account is not a customer', async () => {
    supabaseForRole('provider')

    const result = await updateCustomerProfile({ errors: {}, message: '', success: false }, profileForm())

    expect(result).toMatchObject({
      success: false,
      message: 'Only customers can update this profile.',
    })
  })

  it('saves provider phone number and updates auth email when the provider email changes', async () => {
    const supabase = supabaseForRole('provider')

    const result = await updateProviderProfile(
      { errors: {}, message: '', success: false },
      profileForm({
        email: 'new-provider@example.com',
        currentEmail: 'provider@example.com',
        phone: '0501234567',
      })
    )

    expect(result.success).toBe(true)
    expect(supabase.updates).toContainEqual({
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'new-provider@example.com',
      phone: '0501234567',
    })
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ email: 'new-provider@example.com' })
  })
})

describe('charging station profile flows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lets a customer request a station that waits for admin approval', async () => {
    const inserts: unknown[] = []
    const supabase = supabaseForRole('customer')
    supabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return new QueryMock(() => ({ data: { user_type: 'customer' }, error: null }))
      }
      if (table === 'charging_stations') {
        return new QueryMock((operation, payload) => {
          if (operation.startsWith('select:')) return { data: null, error: null }
          if (operation === 'insert') {
            inserts.push(payload)
            return { error: null }
          }
          return { data: null, error: null }
        })
      }
      return new QueryMock(() => ({ data: null, error: null }))
    })

    const result = await requestChargingStation({ errors: {}, message: '', success: false }, stationForm())

    expect(result.success).toBe(true)
    expect(inserts).toContainEqual({
      user_id: 'user-1',
      address: '123 Main Street',
      lat: 32.0853,
      lng: 34.7818,
      station_type: 'FAST',
      opening_time: '08:00',
      closing_time: '22:00',
      is_approve: false,
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin')
  })

  it('lets only providers register an immediately approved station', async () => {
    const inserts: unknown[] = []
    const supabase = supabaseForRole('provider')
    supabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return new QueryMock(() => ({ data: { user_type: 'provider' }, error: null }))
      }
      if (table === 'charging_stations') {
        return new QueryMock((operation, payload) => {
          if (operation.startsWith('select:')) return { data: null, error: null }
          if (operation === 'insert') {
            inserts.push(payload)
            return { error: null }
          }
          return { data: null, error: null }
        })
      }
      return new QueryMock(() => ({ data: null, error: null }))
    })

    const result = await upsertChargingStation({ errors: {}, message: '', success: false }, stationForm())

    expect(result.success).toBe(true)
    expect(inserts).toContainEqual({
      user_id: 'user-1',
      address: '123 Main Street',
      lat: 32.0853,
      lng: 34.7818,
      station_type: 'FAST',
      opening_time: '08:00',
      closing_time: '22:00',
      is_approve: true,
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/map')
  })
})

describe('provider charging session actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows the station owner provider to finish an arrived charging session', async () => {
    const updates: unknown[] = []
    const supabase = supabaseForRole('provider')
    supabase.from.mockImplementation((table: string) => {
      if (table === 'station_visits') {
        return new QueryMock((operation, payload) => {
          if (operation.startsWith('select:')) return { data: { station_id: 'station-1' }, error: null }
          if (operation === 'update') {
            updates.push(payload)
            return { error: null }
          }
          return { data: null, error: null }
        })
      }
      if (table === 'charging_stations') {
        return new QueryMock(() => ({ data: { user_id: 'user-1' }, error: null }))
      }
      return new QueryMock(() => ({ data: null, error: null }))
    })

    const result = await completeVisitAsProvider('visit-1')

    expect(result).toEqual({})
    expect(updates).toContainEqual({ status: 'completed' })
    expect(revalidatePathMock).toHaveBeenCalledWith('/User')
    expect(revalidatePathMock).toHaveBeenCalledWith('/map')
  })

  it('blocks a provider from finishing a charging session at someone else station', async () => {
    const supabase = supabaseForRole('provider')
    supabase.from.mockImplementation((table: string) => {
      if (table === 'station_visits') {
        return new QueryMock(() => ({ data: { station_id: 'station-1' }, error: null }))
      }
      if (table === 'charging_stations') {
        return new QueryMock(() => ({ data: { user_id: 'other-user' }, error: null }))
      }
      return new QueryMock(() => ({ data: null, error: null }))
    })

    const result = await completeVisitAsProvider('visit-1')

    expect(result).toEqual({ error: 'Only the station owner can finish this charging session.' })
  })
})
