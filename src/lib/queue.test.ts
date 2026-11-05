import { describe, expect, it } from 'vitest'
import { buildStudyQueue, countNewStudiedToday, type QueueCard, type QueueReviewLog } from './queue'

const NOW = new Date(2026, 5, 15, 12, 0, 0, 0) // 15 Jun 2026, noon
const STUDY_BOUNDARY = new Date(2026, 5, 15, 4, 0, 0, 0)

function card(overrides: Partial<QueueCard>): QueueCard {
  return {
    id: 'card-1',
    deckId: 'deck-1',
    state: 'new',
    due: NOW,
    suspended: false,
    createdAt: NOW,
    ...overrides,
  }
}

describe('countNewStudiedToday', () => {
  it('counts only new-state logs for the given deck since the study day boundary', () => {
    const logs: QueueReviewLog[] = [
      { cardId: 'a', deckId: 'deck-1', stateBefore: 'new', reviewedAt: new Date(2026, 5, 15, 5) },
      {
        cardId: 'b',
        deckId: 'deck-1',
        stateBefore: 'review',
        reviewedAt: new Date(2026, 5, 15, 6),
      },
      { cardId: 'c', deckId: 'deck-2', stateBefore: 'new', reviewedAt: new Date(2026, 5, 15, 7) },
      { cardId: 'd', deckId: 'deck-1', stateBefore: 'new', reviewedAt: new Date(2026, 5, 15, 3) },
    ]
    expect(countNewStudiedToday(logs, 'deck-1', STUDY_BOUNDARY)).toBe(1)
  })
})

describe('buildStudyQueue', () => {
  it('excludes suspended cards', () => {
    const cards = [
      card({ id: 'suspended', state: 'review', due: NOW, suspended: true }),
      card({ id: 'active', state: 'review', due: NOW, suspended: false }),
    ]
    const queue = buildStudyQueue(cards, [], [{ deckId: 'deck-1', newPerDay: 10 }], {
      now: NOW,
      dayStartsAtHour: 4,
    })
    expect(queue.map((c) => c.id)).toEqual(['active'])
  })

  it('puts overdue learning/relearning cards first', () => {
    const cards = [
      card({ id: 'review-due', state: 'review', due: NOW }),
      card({ id: 'learning-due', state: 'learning', due: new Date(NOW.getTime() - 60_000) }),
    ]
    const queue = buildStudyQueue(cards, [], [{ deckId: 'deck-1', newPerDay: 10 }], {
      now: NOW,
      dayStartsAtHour: 4,
    })
    expect(queue[0].id).toBe('learning-due')
  })

  it('does not include learning/relearning cards that are not due yet when other work remains', () => {
    const cards = [
      card({ id: 'review-due', state: 'review', due: NOW }),
      card({ id: 'learning-not-due', state: 'learning', due: new Date(NOW.getTime() + 60_000) }),
    ]
    const queue = buildStudyQueue(cards, [], [{ deckId: 'deck-1', newPerDay: 10 }], {
      now: NOW,
      dayStartsAtHour: 4,
    })
    expect(queue.map((c) => c.id)).toEqual(['review-due'])
  })

  it('surfaces not-yet-due learning cards early when nothing else is left', () => {
    const cards = [
      card({ id: 'learning-later', state: 'learning', due: new Date(NOW.getTime() + 60_000) }),
    ]
    const queue = buildStudyQueue(cards, [], [{ deckId: 'deck-1', newPerDay: 10 }], {
      now: NOW,
      dayStartsAtHour: 4,
    })
    expect(queue.map((c) => c.id)).toEqual(['learning-later'])
  })

  it('caps new cards per deck by new_per_day minus new cards already studied today', () => {
    const cards = [
      card({ id: 'new-1', state: 'new', createdAt: new Date(2026, 5, 15, 1) }),
      card({ id: 'new-2', state: 'new', createdAt: new Date(2026, 5, 15, 2) }),
      card({ id: 'new-3', state: 'new', createdAt: new Date(2026, 5, 15, 3) }),
    ]
    const logs: QueueReviewLog[] = [
      {
        cardId: 'studied',
        deckId: 'deck-1',
        stateBefore: 'new',
        reviewedAt: new Date(2026, 5, 15, 5),
      },
    ]
    const queue = buildStudyQueue(cards, logs, [{ deckId: 'deck-1', newPerDay: 2 }], {
      now: NOW,
      dayStartsAtHour: 4,
    })
    // limit 2, already studied 1 today -> only 1 more new card allowed
    expect(queue.map((c) => c.id)).toEqual(['new-1'])
  })

  it('excludes decks with no configured limit', () => {
    const cards = [card({ id: 'new-1', state: 'new', deckId: 'unconfigured-deck' })]
    const queue = buildStudyQueue(cards, [], [], { now: NOW, dayStartsAtHour: 4 })
    expect(queue).toEqual([])
  })

  it('interleaves new cards among due reviews at the given ratio', () => {
    const reviews = Array.from({ length: 6 }, (_, i) =>
      card({ id: `review-${i}`, state: 'review', due: NOW }),
    )
    const news = Array.from({ length: 2 }, (_, i) =>
      card({ id: `new-${i}`, state: 'new', createdAt: new Date(NOW.getTime() + i) }),
    )
    const queue = buildStudyQueue(
      [...reviews, ...news],
      [],
      [{ deckId: 'deck-1', newPerDay: 10 }],
      { now: NOW, dayStartsAtHour: 4, newEveryNReviews: 3, rng: () => 0 },
    )
    const ids = queue.map((c) => c.id)
    expect(ids[3]).toBe('new-0')
    expect(ids[7]).toBe('new-1')
  })

  it('returns an empty queue when there is nothing to study', () => {
    const queue = buildStudyQueue([], [], [{ deckId: 'deck-1', newPerDay: 10 }], {
      now: NOW,
      dayStartsAtHour: 4,
    })
    expect(queue).toEqual([])
  })
})
