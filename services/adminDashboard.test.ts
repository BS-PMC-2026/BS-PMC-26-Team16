import { describe, expect, it } from 'vitest'
import {
  filterStations,
  getTimeGreeting,
  isSendDisabled,
  sortStations,
  sortUsers,
  toggleSetItem,
  type PendingUser,
  type StationWithOwner,
} from './adminDashboardLogic'

/* ── helpers ── */

function makeUser(id: string, createdAt: string): PendingUser {
  return {
    id,
    first_name: 'Test',
    last_name: 'User',
    email: `user${id}@example.com`,
    phone: '0501234567',
    id_number: '111111111',
    user_type: 'customer',
    request_reason: 'reason',
    created_at: createdAt,
  }
}

function makeStation(
  id: string,
  type: 'FAST' | 'SLOW',
  access: 'PRIVATE' | 'PUBLIC'
): StationWithOwner {
  return {
    id,
    address: `Address ${id}`,
    station_type: type,
    lat: 32.0,
    lng: 34.0,
    ownerName: 'Owner',
    ownerPhone: '0501234567',
    access_type: access,
  }
}

/* ─────────────────────────── getTimeGreeting ─────────────────────────── */

describe('getTimeGreeting', () => {
  it('returns "Good morning" for midnight', () => {
    expect(getTimeGreeting(0)).toBe('Good morning')
  })

  it('returns "Good morning" up to hour 11', () => {
    expect(getTimeGreeting(11)).toBe('Good morning')
  })

  it('returns "Good afternoon" at noon', () => {
    expect(getTimeGreeting(12)).toBe('Good afternoon')
  })

  it('returns "Good afternoon" up to hour 16', () => {
    expect(getTimeGreeting(16)).toBe('Good afternoon')
  })

  it('returns "Good evening" at hour 17', () => {
    expect(getTimeGreeting(17)).toBe('Good evening')
  })

  it('returns "Good evening" at hour 23', () => {
    expect(getTimeGreeting(23)).toBe('Good evening')
  })
})

/* ─────────────────────────── sortUsers ─────────────────────────── */

describe('sortUsers', () => {
  const users = [
    makeUser('1', '2026-01-01T00:00:00'),
    makeUser('2', '2026-03-01T00:00:00'),
    makeUser('3', '2026-02-01T00:00:00'),
  ]

  it('sorts newest first', () => {
    expect(sortUsers(users, 'newest').map(u => u.id)).toEqual(['2', '3', '1'])
  })

  it('sorts oldest first', () => {
    expect(sortUsers(users, 'oldest').map(u => u.id)).toEqual(['1', '3', '2'])
  })

  it('does not mutate the original array', () => {
    const snapshot = [...users]
    sortUsers(users, 'oldest')
    expect(users).toEqual(snapshot)
  })

  it('returns a new array reference', () => {
    expect(sortUsers(users, 'newest')).not.toBe(users)
  })
})

/* ─────────────────────────── sortStations ─────────────────────────── */

describe('sortStations', () => {
  const stations = [
    makeStation('1', 'FAST', 'PRIVATE'),
    makeStation('2', 'SLOW', 'PRIVATE'),
    makeStation('3', 'FAST', 'PUBLIC'),
  ]

  it('preserves original order for "newest"', () => {
    expect(sortStations(stations, 'newest').map(s => s.id)).toEqual(['1', '2', '3'])
  })

  it('reverses order for "oldest"', () => {
    expect(sortStations(stations, 'oldest').map(s => s.id)).toEqual(['3', '2', '1'])
  })

  it('does not mutate the original array', () => {
    const snapshot = [...stations]
    sortStations(stations, 'oldest')
    expect(stations).toEqual(snapshot)
  })

  it('returns a new array reference', () => {
    expect(sortStations(stations, 'newest')).not.toBe(stations)
  })
})

/* ─────────────────────────── filterStations ─────────────────────────── */

describe('filterStations', () => {
  const stations = [
    makeStation('1', 'FAST', 'PRIVATE'),
    makeStation('2', 'SLOW', 'PRIVATE'),
    makeStation('3', 'FAST', 'PUBLIC'),
    makeStation('4', 'SLOW', 'PUBLIC'),
  ]

  it('returns all stations when both type and access filters are fully active', () => {
    const result = filterStations(stations, new Set(['FAST', 'SLOW']), new Set(['PRIVATE', 'PUBLIC']))
    expect(result).toHaveLength(4)
  })

  it('shows only FAST stations when SLOW is unchecked', () => {
    const result = filterStations(stations, new Set(['FAST']), new Set(['PRIVATE', 'PUBLIC']))
    expect(result.map(s => s.id)).toEqual(['1', '3'])
  })

  it('shows only SLOW stations when FAST is unchecked', () => {
    const result = filterStations(stations, new Set(['SLOW']), new Set(['PRIVATE', 'PUBLIC']))
    expect(result.map(s => s.id)).toEqual(['2', '4'])
  })

  it('shows only PRIVATE stations when PUBLIC is unchecked', () => {
    const result = filterStations(stations, new Set(['FAST', 'SLOW']), new Set(['PRIVATE']))
    expect(result.map(s => s.id)).toEqual(['1', '2'])
  })

  it('shows only PUBLIC stations when PRIVATE is unchecked', () => {
    const result = filterStations(stations, new Set(['FAST', 'SLOW']), new Set(['PUBLIC']))
    expect(result.map(s => s.id)).toEqual(['3', '4'])
  })

  it('applies both type and access filters simultaneously', () => {
    const result = filterStations(stations, new Set(['FAST']), new Set(['PRIVATE']))
    expect(result.map(s => s.id)).toEqual(['1'])
  })

  it('returns an empty array when no filters are active', () => {
    const result = filterStations(stations, new Set(), new Set())
    expect(result).toHaveLength(0)
  })

  it('returns an empty array when the input list is empty', () => {
    const result = filterStations([], new Set(['FAST', 'SLOW']), new Set(['PRIVATE', 'PUBLIC']))
    expect(result).toHaveLength(0)
  })
})

/* ─────────────────────────── isSendDisabled ─────────────────────────── */

describe('isSendDisabled', () => {
  const base = { isPending: false }

  describe('users tab', () => {
    it('disabled when no user action is selected', () => {
      expect(isSendDisabled({
        ...base, tab: 'users',
        userAction: null, selectedUser: {},
        stationAction: null, selectedStation: null,
      })).toBe(true)
    })

    it('disabled when no user is selected', () => {
      expect(isSendDisabled({
        ...base, tab: 'users',
        userAction: 'accept', selectedUser: null,
        stationAction: null, selectedStation: null,
      })).toBe(true)
    })

    it('enabled when action is "accept" and a user is selected', () => {
      expect(isSendDisabled({
        ...base, tab: 'users',
        userAction: 'accept', selectedUser: { id: 'u1' },
        stationAction: null, selectedStation: null,
      })).toBe(false)
    })

    it('enabled when action is "deny" and a user is selected', () => {
      expect(isSendDisabled({
        ...base, tab: 'users',
        userAction: 'deny', selectedUser: { id: 'u1' },
        stationAction: null, selectedStation: null,
      })).toBe(false)
    })
  })

  describe('stations tab', () => {
    it('disabled when stationAction is null (default / keep)', () => {
      expect(isSendDisabled({
        ...base, tab: 'stations',
        userAction: null, selectedUser: null,
        stationAction: null, selectedStation: { id: 's1' },
      })).toBe(true)
    })

    it('disabled when no station is selected', () => {
      expect(isSendDisabled({
        ...base, tab: 'stations',
        userAction: null, selectedUser: null,
        stationAction: 'remove', selectedStation: null,
      })).toBe(true)
    })

    it('enabled when action is "remove" and a station is selected', () => {
      expect(isSendDisabled({
        ...base, tab: 'stations',
        userAction: null, selectedUser: null,
        stationAction: 'remove', selectedStation: { id: 's1' },
      })).toBe(false)
    })
  })

  it('always disabled while isPending is true', () => {
    expect(isSendDisabled({
      isPending: true, tab: 'users',
      userAction: 'accept', selectedUser: { id: 'u1' },
      stationAction: null, selectedStation: null,
    })).toBe(true)
  })
})

/* ─────────────────────────── toggleSetItem ─────────────────────────── */

describe('toggleSetItem', () => {
  it('adds an item that is not yet in the set', () => {
    const result = toggleSetItem(new Set(['FAST']), 'SLOW')
    expect(result.has('SLOW')).toBe(true)
    expect(result.has('FAST')).toBe(true)
    expect(result.size).toBe(2)
  })

  it('removes an item that is already in the set', () => {
    const result = toggleSetItem(new Set(['FAST', 'SLOW']), 'FAST')
    expect(result.has('FAST')).toBe(false)
    expect(result.has('SLOW')).toBe(true)
    expect(result.size).toBe(1)
  })

  it('does not mutate the original set', () => {
    const original = new Set(['FAST'])
    toggleSetItem(original, 'SLOW')
    expect(original.size).toBe(1)
    expect(original.has('SLOW')).toBe(false)
  })

  it('returns a new Set reference', () => {
    const original = new Set(['FAST'])
    expect(toggleSetItem(original, 'SLOW')).not.toBe(original)
  })

  it('results in an empty set when the only item is removed', () => {
    const result = toggleSetItem(new Set(['FAST']), 'FAST')
    expect(result.size).toBe(0)
  })
})
