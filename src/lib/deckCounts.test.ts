import { describe, expect, it } from 'vitest'
import { computeDeckCounts, type DeckCountCard } from './deckCounts'

const NOW = new Date(2026, 5, 15, 12, 0, 0, 0)

function card(overrides: Partial<DeckCountCard>): DeckCountCard {
  return { state: 'new', due: NOW, suspended: false, ...overrides }
}

describe('computeDeckCounts', () => {
  it('caps new count by newPerDay minus already studied today', () => {
    const cards = [card({}), card({}), card({})]
    const counts = computeDeckCounts(cards, 1, 2, NOW, 4)
    expect(counts.newCount).toBe(1)
  })

  it('never goes negative when more new cards were studied than the limit allows', () => {
    const cards = [card({})]
    const counts = computeDeckCounts(cards, 5, 2, NOW, 4)
    expect(counts.newCount).toBe(0)
  })

  it('counts learning and relearning cards regardless of due time', () => {
    const cards = [
      card({ state: 'learning', due: new Date(NOW.getTime() + 60_000) }),
      card({ state: 'relearning', due: new Date(NOW.getTime() + 120_000) }),
    ]
    const counts = computeDeckCounts(cards, 0, 10, NOW, 4)
    expect(counts.learningCount).toBe(2)
  })

  it('only counts review cards due by the end of the study day', () => {
    const cards = [
      card({ state: 'review', due: NOW }),
      card({ state: 'review', due: new Date(2026, 5, 16, 3, 0) }), // before next 04:00 boundary
      card({ state: 'review', due: new Date(2026, 5, 16, 5, 0) }), // after next 04:00 boundary
    ]
    const counts = computeDeckCounts(cards, 0, 10, NOW, 4)
    expect(counts.reviewCount).toBe(2)
  })

  it('excludes suspended cards from every bucket', () => {
    const cards = [
      card({ state: 'new', suspended: true }),
      card({ state: 'learning', suspended: true }),
      card({ state: 'review', suspended: true }),
    ]
    const counts = computeDeckCounts(cards, 0, 10, NOW, 4)
    expect(counts).toEqual({ newCount: 0, learningCount: 0, reviewCount: 0 })
  })
})
