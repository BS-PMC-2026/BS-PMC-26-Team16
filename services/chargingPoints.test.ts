import { describe, expect, it } from 'vitest'
import {
  computeFeedbackToken,
  computeStats,
  filterRows,
  isValidFeedbackToken,
  recalcAfterDeleteReview,
  type StationEntry,
} from './chargingPointsLogic'

/* ── helpers ── */

const ALL_SOURCE = new Set<'provider' | 'geo'>(['provider', 'geo'])
const ALL_FAST = new Set<'yes' | 'no'>(['yes', 'no'])
const ALL_REVIEW = new Set<'yes' | 'no'>(['yes', 'no'])

function makeProvider(
  key: string,
  opts: { fast?: boolean; reviews?: number; address?: string } = {}
): StationEntry {
  const count = opts.reviews ?? 0
  return {
    key,
    source: 'provider',
    station_type: opts.fast ? 'FAST' : 'SLOW',
    geoFast: null,
    rating_count: count,
    avg_rating: count > 0 ? 4 : null,
    reviews: Array.from({ length: count }, (_, i) => ({ id: `rv_${key}_${i}`, score: 4 })),
    address: opts.address ?? `${key} Provider St`,
    geoName: null,
    geoOperator: null,
  }
}

function makeGeo(
  key: string,
  opts: { geoFast?: number; reviews?: number; name?: string; operator?: string; address?: string } = {}
): StationEntry {
  const count = opts.reviews ?? 0
  return {
    key,
    source: 'geo',
    station_type: null,
    geoFast: opts.geoFast ?? 0,
    rating_count: count,
    avg_rating: count > 0 ? 3.5 : null,
    reviews: Array.from({ length: count }, (_, i) => ({ id: `rv_${key}_${i}`, score: 3 })),
    address: opts.address ?? `${key} Geo Ave`,
    geoName: opts.name ?? null,
    geoOperator: opts.operator ?? null,
  }
}

const ROWS: StationEntry[] = [
  makeProvider('p1', { fast: true, reviews: 2, address: 'Rothschild 10, Tel Aviv' }),
  makeProvider('p2', { fast: false, reviews: 0, address: 'Dizengoff 50, Tel Aviv' }),
  makeGeo('g1', { geoFast: 3, reviews: 1, name: 'Central Station', operator: 'EV Go' }),
  makeGeo('g2', { geoFast: 0, reviews: 0, name: 'Haifa Port' }),
]

/* ─────────────────────────── filterRows ─────────────────────────── */

describe('filterRows', () => {
  describe('no filters active', () => {
    it('returns all rows when all filter sets are full', () => {
      expect(filterRows(ROWS, '', ALL_SOURCE, ALL_FAST, ALL_REVIEW)).toHaveLength(4)
    })

    it('returns an empty array when input is empty', () => {
      expect(filterRows([], '', ALL_SOURCE, ALL_FAST, ALL_REVIEW)).toHaveLength(0)
    })

    it('returns empty when all filter sets are empty', () => {
      expect(filterRows(ROWS, '', new Set(), ALL_FAST, ALL_REVIEW)).toHaveLength(0)
    })
  })

  describe('source filter', () => {
    it('keeps only provider stations when geo is excluded', () => {
      const result = filterRows(ROWS, '', new Set(['provider']), ALL_FAST, ALL_REVIEW)
      expect(result.every((r) => r.source === 'provider')).toBe(true)
      expect(result).toHaveLength(2)
    })

    it('keeps only geo stations when provider is excluded', () => {
      const result = filterRows(ROWS, '', new Set(['geo']), ALL_FAST, ALL_REVIEW)
      expect(result.every((r) => r.source === 'geo')).toBe(true)
      expect(result).toHaveLength(2)
    })

    it('returns empty when source set is empty', () => {
      expect(filterRows(ROWS, '', new Set(), ALL_FAST, ALL_REVIEW)).toHaveLength(0)
    })
  })

  describe('fast charging filter', () => {
    it('keeps only fast stations when "no" is excluded', () => {
      const result = filterRows(ROWS, '', ALL_SOURCE, new Set(['yes']), ALL_REVIEW)
      // p1 (FAST), g1 (geoFast=3)
      expect(result.map((r) => r.key)).toEqual(['p1', 'g1'])
    })

    it('keeps only non-fast stations when "yes" is excluded', () => {
      const result = filterRows(ROWS, '', ALL_SOURCE, new Set(['no']), ALL_REVIEW)
      // p2 (SLOW), g2 (geoFast=0)
      expect(result.map((r) => r.key)).toEqual(['p2', 'g2'])
    })

    it('returns empty when fast set is empty', () => {
      expect(filterRows(ROWS, '', ALL_SOURCE, new Set(), ALL_REVIEW)).toHaveLength(0)
    })
  })

  describe('review filter', () => {
    it('keeps only stations with reviews when "no" is excluded', () => {
      const result = filterRows(ROWS, '', ALL_SOURCE, ALL_FAST, new Set(['yes']))
      // p1 (2 reviews), g1 (1 review)
      expect(result.map((r) => r.key)).toEqual(['p1', 'g1'])
    })

    it('keeps only stations without reviews when "yes" is excluded', () => {
      const result = filterRows(ROWS, '', ALL_SOURCE, ALL_FAST, new Set(['no']))
      // p2 (0 reviews), g2 (0 reviews)
      expect(result.map((r) => r.key)).toEqual(['p2', 'g2'])
    })
  })

  describe('search', () => {
    it('matches on address (case-insensitive)', () => {
      const result = filterRows(ROWS, 'rothschild', ALL_SOURCE, ALL_FAST, ALL_REVIEW)
      expect(result.map((r) => r.key)).toEqual(['p1'])
    })

    it('matches on geoName (case-insensitive)', () => {
      const result = filterRows(ROWS, 'central station', ALL_SOURCE, ALL_FAST, ALL_REVIEW)
      expect(result.map((r) => r.key)).toEqual(['g1'])
    })

    it('matches on geoOperator (case-insensitive)', () => {
      const result = filterRows(ROWS, 'EV GO', ALL_SOURCE, ALL_FAST, ALL_REVIEW)
      expect(result.map((r) => r.key)).toEqual(['g1'])
    })

    it('returns empty when search matches nothing', () => {
      expect(filterRows(ROWS, 'zzznomatch', ALL_SOURCE, ALL_FAST, ALL_REVIEW)).toHaveLength(0)
    })

    it('empty search string does not filter anything', () => {
      expect(filterRows(ROWS, '  ', ALL_SOURCE, ALL_FAST, ALL_REVIEW)).toHaveLength(4)
    })
  })

  describe('combined filters', () => {
    it('applies source and fast together', () => {
      // Provider + Fast only → p1
      const result = filterRows(ROWS, '', new Set(['provider']), new Set(['yes']), ALL_REVIEW)
      expect(result.map((r) => r.key)).toEqual(['p1'])
    })

    it('applies source, fast, and review together', () => {
      // Geo + no-fast + no-review → g2
      const result = filterRows(
        ROWS,
        '',
        new Set(['geo']),
        new Set(['no']),
        new Set(['no'])
      )
      expect(result.map((r) => r.key)).toEqual(['g2'])
    })
  })
})

/* ─────────────────────────── computeStats ─────────────────────────── */

describe('computeStats', () => {
  it('counts total stations', () => {
    expect(computeStats(ROWS).total).toBe(4)
  })

  it('counts provider stations', () => {
    expect(computeStats(ROWS).providerCount).toBe(2)
  })

  it('counts public (geo) stations', () => {
    expect(computeStats(ROWS).publicCount).toBe(2)
  })

  it('counts stations with at least one review', () => {
    expect(computeStats(ROWS).withReviewCount).toBe(2)
  })

  it('returns all zeros for an empty list', () => {
    expect(computeStats([])).toEqual({ total: 0, providerCount: 0, publicCount: 0, withReviewCount: 0 })
  })
})

/* ─────────────────────────── recalcAfterDeleteReview ─────────────────────────── */

describe('recalcAfterDeleteReview', () => {
  const rows = [
    {
      key: 's1',
      reviews: [
        { id: 'rv1', score: 5 },
        { id: 'rv2', score: 3 },
      ],
      rating_count: 2,
      avg_rating: 4,
    },
    {
      key: 's2',
      reviews: [{ id: 'rv3', score: 2 }],
      rating_count: 1,
      avg_rating: 2,
    },
  ]

  it('removes the deleted review from the target station', () => {
    const result = recalcAfterDeleteReview(rows, 's1', 'rv1')
    expect(result[0].reviews.map((r) => r.id)).toEqual(['rv2'])
  })

  it('decrements rating_count by 1', () => {
    const result = recalcAfterDeleteReview(rows, 's1', 'rv1')
    expect(result[0].rating_count).toBe(1)
  })

  it('recalculates avg_rating correctly after removal', () => {
    const result = recalcAfterDeleteReview(rows, 's1', 'rv1')
    expect(result[0].avg_rating).toBe(3)
  })

  it('sets avg_rating to null when the last review is removed', () => {
    const result = recalcAfterDeleteReview(rows, 's2', 'rv3')
    expect(result[1].avg_rating).toBeNull()
    expect(result[1].rating_count).toBe(0)
  })

  it('does not modify other stations', () => {
    const result = recalcAfterDeleteReview(rows, 's1', 'rv1')
    expect(result[1]).toEqual(rows[1])
  })

  it('does not mutate the original rows', () => {
    const snapshot = JSON.stringify(rows)
    recalcAfterDeleteReview(rows, 's1', 'rv1')
    expect(JSON.stringify(rows)).toBe(snapshot)
  })

  it('correctly averages multiple remaining reviews', () => {
    const multiRows = [
      {
        key: 's3',
        reviews: [
          { id: 'a', score: 5 },
          { id: 'b', score: 3 },
          { id: 'c', score: 1 },
        ],
        rating_count: 3,
        avg_rating: 3,
      },
    ]
    // remove 'a' (score 5) → remaining: 3+1 = 4, avg = 2
    const result = recalcAfterDeleteReview(multiRows, 's3', 'a')
    expect(result[0].avg_rating).toBeCloseTo(2)
    expect(result[0].rating_count).toBe(2)
  })
})

/* ─────────────────────────── computeFeedbackToken ─────────────────────────── */

describe('computeFeedbackToken', () => {
  it('produces a base64url-encoded token for the given ratingId', () => {
    const id = 'test-rating-id'
    const token = computeFeedbackToken(id)
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    expect(decoded).toBe(`${id}:smartev2026`)
  })

  it('produces different tokens for different ratingIds', () => {
    expect(computeFeedbackToken('id-1')).not.toBe(computeFeedbackToken('id-2'))
  })

  it('is deterministic: same input always produces the same token', () => {
    const id = 'stable-id'
    expect(computeFeedbackToken(id)).toBe(computeFeedbackToken(id))
  })
})

/* ─────────────────────────── isValidFeedbackToken ─────────────────────────── */

describe('isValidFeedbackToken', () => {
  const id = 'my-rating-uuid'
  const valid = computeFeedbackToken(id)

  it('returns true for a matching token', () => {
    expect(isValidFeedbackToken(id, valid)).toBe(true)
  })

  it('returns false for a tampered token', () => {
    expect(isValidFeedbackToken(id, valid + 'x')).toBe(false)
  })

  it('returns false when ratingId is empty', () => {
    expect(isValidFeedbackToken('', valid)).toBe(false)
  })

  it('returns false when token is empty', () => {
    expect(isValidFeedbackToken(id, '')).toBe(false)
  })

  it('returns false for a token generated with a different ratingId', () => {
    const wrongToken = computeFeedbackToken('other-id')
    expect(isValidFeedbackToken(id, wrongToken)).toBe(false)
  })
})
