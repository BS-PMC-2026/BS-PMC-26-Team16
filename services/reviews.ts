export const REVIEW_WORD_LIMIT = 50

export function getReviewWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean)
}

export function getReviewWordCount(value: string) {
  return getReviewWords(value).length
}

export function limitReviewWords(value: string) {
  const words = getReviewWords(value)
  return words.length > REVIEW_WORD_LIMIT ? words.slice(0, REVIEW_WORD_LIMIT).join(' ') : value
}

export function validateReviewScore(score: number) {
  return Number.isInteger(score) && score >= 1 && score <= 5
}

export function validateWrittenReview(comment: string) {
  return getReviewWordCount(comment) <= REVIEW_WORD_LIMIT
}
