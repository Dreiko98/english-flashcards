import { describe, expect, it } from 'vitest'
import { computeMaxStreak, computeStreak } from './streak'

const NOW = new Date(2026, 5, 15, 20, 0, 0, 0) // 15 Jun 2026, 20:00

describe('computeStreak', () => {
  it('is 0 with no review history', () => {
    expect(computeStreak([], NOW, 4)).toBe(0)
  })

  it('counts today plus consecutive previous days', () => {
    const reviewedAt = [
      new Date(2026, 5, 15, 10, 0), // today
      new Date(2026, 5, 14, 10, 0), // yesterday
      new Date(2026, 5, 13, 10, 0), // day before
    ]
    expect(computeStreak(reviewedAt, NOW, 4)).toBe(3)
  })

  it('does not break the streak if today has not been studied yet, counting from yesterday', () => {
    const reviewedAt = [new Date(2026, 5, 14, 10, 0), new Date(2026, 5, 13, 10, 0)]
    expect(computeStreak(reviewedAt, NOW, 4)).toBe(2)
  })

  it('resets to 0 if neither today nor yesterday were studied', () => {
    const reviewedAt = [new Date(2026, 5, 10, 10, 0)]
    expect(computeStreak(reviewedAt, NOW, 4)).toBe(0)
  })

  it('stops at the first gap', () => {
    const reviewedAt = [
      new Date(2026, 5, 15, 10, 0),
      new Date(2026, 5, 14, 10, 0),
      // gap on the 13th
      new Date(2026, 5, 12, 10, 0),
    ]
    expect(computeStreak(reviewedAt, NOW, 4)).toBe(2)
  })

  it('treats a review just after the study-day boundary (04:00) as the next day', () => {
    const justAfterBoundary = new Date(2026, 5, 15, 4, 1)
    expect(computeStreak([justAfterBoundary], NOW, 4)).toBe(1)
  })
})

describe('computeMaxStreak', () => {
  it('is 0 with no history', () => {
    expect(computeMaxStreak([], 4)).toBe(0)
  })

  it('finds the longest run anywhere in the history, not just the most recent', () => {
    const reviewedAt = [
      // a 4-day run, long ago
      new Date(2026, 4, 1, 10, 0),
      new Date(2026, 4, 2, 10, 0),
      new Date(2026, 4, 3, 10, 0),
      new Date(2026, 4, 4, 10, 0),
      // a 2-day run, recent
      new Date(2026, 5, 14, 10, 0),
      new Date(2026, 5, 15, 10, 0),
    ]
    expect(computeMaxStreak(reviewedAt, 4)).toBe(4)
  })

  it('is 1 for a single scattered day', () => {
    expect(computeMaxStreak([new Date(2026, 5, 1, 10, 0)], 4)).toBe(1)
  })
})
