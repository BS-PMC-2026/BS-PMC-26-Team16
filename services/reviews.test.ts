import { describe, expect, it } from 'vitest'
import {
  REVIEW_WORD_LIMIT,
  getReviewWordCount,
  limitReviewWords,
  validateReviewScore,
  validateWrittenReview,
} from './reviews'

function words(count: number) {
  return Array.from({ length: count }, (_, index) => `word${index + 1}`).join(' ')
}

describe('review helpers', () => {
  it('counts words while ignoring extra whitespace', () => {
    expect(getReviewWordCount('  great   fast\ncharging\tstation  ')).toBe(4)
  })

  it('allows written reviews up to 50 words', () => {
    expect(validateWrittenReview(words(REVIEW_WORD_LIMIT))).toBe(true)
    expect(validateWrittenReview(words(REVIEW_WORD_LIMIT + 1))).toBe(false)
  })

  it('trims reviews longer than the word limit', () => {
    const limited = limitReviewWords(words(REVIEW_WORD_LIMIT + 3))

    expect(getReviewWordCount(limited)).toBe(REVIEW_WORD_LIMIT)
    expect(limited.endsWith('word50')).toBe(true)
  })

  it('validates scores from 1 to 5 only', () => {
    expect(validateReviewScore(1)).toBe(true)
    expect(validateReviewScore(5)).toBe(true)
    expect(validateReviewScore(0)).toBe(false)
    expect(validateReviewScore(6)).toBe(false)
    expect(validateReviewScore(3.5)).toBe(false)
  })
})
