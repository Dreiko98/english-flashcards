import { describe, expect, it } from 'vitest'
import {
  computeAccuracyByMaturity,
  computeForecast,
  computeReviewsPerDay,
  computeStateCounts,
} from './stats'

const NOW = new Date(2026, 5, 15, 12, 0, 0, 0) // 15 Jun 2026, noon

describe('computeReviewsPerDay', () => {
  it('buckets reviews into the last N study-days, including empty days, oldest first', () => {
    const reviewedAt = [
      new Date(2026, 5, 15, 10, 0), // today
      new Date(2026, 5, 15, 11, 0), // today, second review
      new Date(2026, 5, 13, 10, 0), // 2 days ago
    ]
    const result = computeReviewsPerDay(reviewedAt, NOW, 3, 4)
    expect(result).toHaveLength(3)
    expect(result[0].date).toEqual(new Date(2026, 5, 13, 4, 0, 0, 0))
    expect(result[0].count).toBe(1)
    expect(result[1].count).toBe(0) // 14th, no reviews
    expect(result[2].count).toBe(2) // today
  })
})

describe('computeForecast', () => {
  it('counts only non-suspended review-state cards due within each future study-day', () => {
    const cards = [
      { state: 'review' as const, due: new Date(2026, 5, 15, 20, 0), suspended: false }, // today
      { state: 'review' as const, due: new Date(2026, 5, 17, 10, 0), suspended: false }, // +2 days
      { state: 'review' as const, due: new Date(2026, 5, 17, 10, 0), suspended: true }, // suspended, excluded
      { state: 'new' as const, due: NOW, suspended: false }, // not review state, excluded
    ]
    const result = computeForecast(cards, NOW, 3, 4)
    expect(result).toHaveLength(3)
    expect(result[0].count).toBe(1)
    expect(result[1].count).toBe(0)
    expect(result[2].count).toBe(1)
  })
})

describe('computeAccuracyByMaturity', () => {
  it('splits review-state logs into mature (interval >= 21d) and young, computing % correct', () => {
    const logs = [
      { stateBefore: 'review' as const, intervalBefore: 30, rating: 3 as const },
      { stateBefore: 'review' as const, intervalBefore: 25, rating: 1 as const },
      { stateBefore: 'review' as const, intervalBefore: 5, rating: 3 as const },
      { stateBefore: 'review' as const, intervalBefore: 10, rating: 3 as const },
      { stateBefore: 'learning' as const, intervalBefore: 0, rating: 3 as const }, // excluded
    ]
    const result = computeAccuracyByMaturity(logs)
    expect(result.matureTotal).toBe(2)
    expect(result.matureAccuracy).toBe(50)
    expect(result.youngTotal).toBe(2)
    expect(result.youngAccuracy).toBe(100)
  })

  it('returns null accuracy for a group with no logs', () => {
    const result = computeAccuracyByMaturity([])
    expect(result.matureAccuracy).toBeNull()
    expect(result.youngAccuracy).toBeNull()
  })
})

describe('computeStateCounts', () => {
  it('counts non-suspended cards per state', () => {
    const cards = [
      { state: 'new' as const, suspended: false },
      { state: 'new' as const, suspended: false },
      { state: 'learning' as const, suspended: false },
      { state: 'review' as const, suspended: false },
      { state: 'review' as const, suspended: true },
    ]
    expect(computeStateCounts(cards)).toEqual({ new: 2, learning: 1, review: 1, relearning: 0 })
  })
})
