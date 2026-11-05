import { beforeAll, describe, expect, it } from 'vitest'
import { DEFAULT_SCHEDULER_CONFIG, schedule, type SchedulableCard } from './scheduler'

beforeAll(() => {
  process.env.TZ = 'Europe/Madrid'
})

const NOW = new Date(2026, 5, 15, 12, 0, 0, 0) // 15 Jun 2026, noon
const noRng = () => 0.5 // neutral fuzz (ratio 1, i.e. no change)

function newCard(overrides: Partial<SchedulableCard> = {}): SchedulableCard {
  return {
    state: 'new',
    due: NOW,
    intervalDays: 0,
    ease: 2.5,
    step: 0,
    reps: 0,
    lapses: 0,
    ...overrides,
  }
}

function minutesAfter(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000)
}

describe('schedule: new/learning cards', () => {
  it('Again resets to the first learning step', () => {
    const card = newCard({ state: 'learning', step: 1 })
    const result = schedule(card, 1, NOW)
    expect(result.state).toBe('learning')
    expect(result.step).toBe(0)
    expect(result.due).toEqual(minutesAfter(NOW, 1))
    expect(result.reps).toBe(1)
  })

  it('Hard on the first step uses the average of the first two steps', () => {
    const card = newCard()
    const result = schedule(card, 2, NOW)
    expect(result.state).toBe('learning')
    expect(result.step).toBe(0)
    expect(result.due).toEqual(minutesAfter(NOW, 5.5))
  })

  it('Hard on a later step repeats that step duration', () => {
    const card = newCard({ state: 'learning', step: 1 })
    const result = schedule(card, 2, NOW)
    expect(result.state).toBe('learning')
    expect(result.step).toBe(1)
    expect(result.due).toEqual(minutesAfter(NOW, 10))
  })

  it('Good walks through 1 min -> 10 min -> graduates at 1 day', () => {
    const afterFirstGood = schedule(newCard(), 3, NOW)
    expect(afterFirstGood.state).toBe('learning')
    expect(afterFirstGood.step).toBe(1)
    expect(afterFirstGood.due).toEqual(minutesAfter(NOW, 1))

    const secondNow = afterFirstGood.due
    const afterSecondGood = schedule(afterFirstGood, 3, secondNow)
    expect(afterSecondGood.state).toBe('learning')
    expect(afterSecondGood.step).toBe(2)
    expect(afterSecondGood.due).toEqual(minutesAfter(secondNow, 10))

    const thirdNow = afterSecondGood.due
    const graduated = schedule(afterSecondGood, 3, thirdNow)
    expect(graduated.state).toBe('review')
    expect(graduated.intervalDays).toBe(1)
  })

  it('Easy graduates directly to the easy interval (4 days)', () => {
    const result = schedule(newCard(), 4, NOW)
    expect(result.state).toBe('review')
    expect(result.intervalDays).toBe(4)
  })

  it('increments reps but leaves lapses untouched', () => {
    const result = schedule(newCard({ reps: 3, lapses: 2 }), 1, NOW)
    expect(result.reps).toBe(4)
    expect(result.lapses).toBe(2)
  })
})

describe('schedule: review cards', () => {
  function reviewCard(overrides: Partial<SchedulableCard> = {}): SchedulableCard {
    return {
      state: 'review',
      due: NOW,
      intervalDays: 10,
      ease: 2.5,
      step: 0,
      reps: 5,
      lapses: 0,
      ...overrides,
    }
  }

  it('Again lowers ease, adds a lapse, and enters relearning', () => {
    const result = schedule(reviewCard(), 1, NOW)
    expect(result.state).toBe('relearning')
    expect(result.lapses).toBe(1)
    expect(result.ease).toBeCloseTo(2.3)
    expect(result.due).toEqual(minutesAfter(NOW, 10))
    // Post-lapse interval (max(1, round(10 * 0.5)) = 5) is stashed in intervalDays.
    expect(result.intervalDays).toBe(5)
    // The single relearning step's delay was already served above, so step points past it.
    expect(result.step).toBe(1)
  })

  it('never drops ease below minEase', () => {
    const result = schedule(reviewCard({ ease: 1.35 }), 1, NOW)
    expect(result.ease).toBe(DEFAULT_SCHEDULER_CONFIG.minEase)
  })

  it('Hard grows the interval by at least +1 day and lowers ease slightly', () => {
    const result = schedule(reviewCard(), 2, NOW, DEFAULT_SCHEDULER_CONFIG, noRng)
    expect(result.state).toBe('review')
    expect(result.intervalDays).toBe(12) // max(11, round(10*1.2)) = 12
    expect(result.ease).toBeCloseTo(2.35)
  })

  it('Good grows the interval by ease and keeps ease unchanged', () => {
    const result = schedule(reviewCard(), 3, NOW, DEFAULT_SCHEDULER_CONFIG, noRng)
    expect(result.intervalDays).toBe(25) // max(11, round(10*2.5)) = 25
    expect(result.ease).toBe(2.5)
  })

  it('Easy grows the interval with the easy bonus and raises ease', () => {
    const result = schedule(reviewCard(), 4, NOW, DEFAULT_SCHEDULER_CONFIG, noRng)
    expect(result.intervalDays).toBe(33) // max(11, round(10*2.5*1.3)) = 33
    expect(result.ease).toBeCloseTo(2.65)
  })

  it('applies no fuzz when the interval is 2 days or less', () => {
    const card = reviewCard({ intervalDays: 1, ease: 2.0 })
    const alwaysMax = () => 0.999
    const result = schedule(card, 3, NOW, DEFAULT_SCHEDULER_CONFIG, alwaysMax)
    expect(result.intervalDays).toBe(2) // max(2, round(1*2)) = 2, no fuzz since <= 2
  })

  it('applies up to +-5% fuzz when the interval is longer than 2 days', () => {
    const card = reviewCard({ intervalDays: 100, ease: 2.5 })
    const rngHigh = () => 1 // fuzzRatio = 1.05
    const result = schedule(card, 3, NOW, DEFAULT_SCHEDULER_CONFIG, rngHigh)
    // raw = max(101, round(100*2.5)) = 250; fuzzed = round(250 * 1.05) = 263
    expect(result.intervalDays).toBe(263)
  })

  it('clamps the interval to maxInterval', () => {
    const card = reviewCard({ intervalDays: 300, ease: 2.5 })
    const result = schedule(card, 4, NOW, DEFAULT_SCHEDULER_CONFIG, noRng)
    expect(result.intervalDays).toBe(DEFAULT_SCHEDULER_CONFIG.maxInterval)
  })
})

describe('schedule: relearning cards', () => {
  // step: 1 is the natural post-lapse state for a single-step config (see the lapse test above):
  // the one relearning step's delay was already served, so the next Good graduates immediately.
  function relearningCard(overrides: Partial<SchedulableCard> = {}): SchedulableCard {
    return {
      state: 'relearning',
      due: NOW,
      intervalDays: 5, // stashed post-lapse interval
      ease: 2.3,
      step: 1,
      reps: 6,
      lapses: 1,
      ...overrides,
    }
  }

  it('Again resets back to step 0 and re-serves the first relearning step', () => {
    const result = schedule(relearningCard(), 1, NOW)
    expect(result.state).toBe('relearning')
    expect(result.step).toBe(0)
    expect(result.due).toEqual(minutesAfter(NOW, 10))
  })

  it('Good graduates back to review once the relearning step is already served', () => {
    const result = schedule(relearningCard({ step: 1 }), 3, NOW)
    expect(result.state).toBe('review')
    expect(result.intervalDays).toBe(5)
    expect(result.ease).toBeCloseTo(2.3)
  })

  it('Good does not graduate yet if Again was pressed first (step reset to 0)', () => {
    const result = schedule(relearningCard({ step: 0 }), 3, NOW)
    expect(result.state).toBe('relearning')
    expect(result.step).toBe(1)
    expect(result.due).toEqual(minutesAfter(NOW, 10))
  })

  it('Easy graduates back to review using the stashed interval plus one day, regardless of step', () => {
    const result = schedule(relearningCard({ step: 0 }), 4, NOW)
    expect(result.state).toBe('review')
    expect(result.intervalDays).toBe(6)
  })
})
