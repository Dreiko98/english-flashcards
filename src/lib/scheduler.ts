import { addStudyDays } from './studyDay'

export type CardState = 'new' | 'learning' | 'review' | 'relearning'

/** 1 = Otra vez, 2 = Difícil, 3 = Bien, 4 = Fácil */
export type Rating = 1 | 2 | 3 | 4

export interface SchedulerConfig {
  learningSteps: number[]
  relearningSteps: number[]
  graduatingInterval: number
  easyInterval: number
  startingEase: number
  minEase: number
  hardMultiplier: number
  easyBonus: number
  lapseMultiplier: number
  maxInterval: number
  dayStartsAtHour: number
}

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  learningSteps: [1, 10],
  relearningSteps: [10],
  graduatingInterval: 1,
  easyInterval: 4,
  startingEase: 2.5,
  minEase: 1.3,
  hardMultiplier: 1.2,
  easyBonus: 1.3,
  lapseMultiplier: 0.5,
  maxInterval: 365,
  dayStartsAtHour: 4,
}

export interface SchedulableCard {
  state: CardState
  due: Date
  intervalDays: number
  ease: number
  /** Index into learningSteps/relearningSteps for new/learning/relearning cards. */
  step: number
  reps: number
  lapses: number
}

export type ScheduleResult = SchedulableCard

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

function roundEase(ease: number): number {
  return Math.round(ease * 100) / 100
}

function clampInterval(days: number, config: SchedulerConfig): number {
  return Math.min(Math.max(1, Math.round(days)), config.maxInterval)
}

/** ±5% random fuzz, only for intervals longer than 2 days, so short intervals stay predictable. */
function applyFuzz(days: number, rng: () => number): number {
  if (days <= 2) return days
  const fuzzRatio = 1 + (rng() * 2 - 1) * 0.05
  return Math.round(days * fuzzRatio)
}

function reviewDue(now: Date, intervalDays: number, config: SchedulerConfig): Date {
  return addStudyDays(now, intervalDays, config.dayStartsAtHour)
}

interface StepOutcome {
  due: Date
  step: number
  graduated: boolean
}

/**
 * Shared step-machine for the 'new'/'learning' and 'relearning' phases. `currentStep` is the
 * index of the delay that would be served next: Again resets it to 0, Hard repeats the delay at
 * (or below) the current index without moving it, and Good serves the delay at the current index
 * and then moves to the next one — or graduates once the index runs past the end of the array.
 * This is what makes a 2-entry `learningSteps` take exactly 3 "Good" presses to graduate
 * (serve step 0, serve step 1, then graduate) instead of skipping the last delay.
 */
function advanceSteps(
  now: Date,
  steps: number[],
  currentStep: number,
  rating: 1 | 2 | 3,
): StepOutcome {
  if (rating === 1) {
    return { due: addMinutes(now, steps[0]), step: 0, graduated: false }
  }
  if (rating === 2) {
    const lastValidStep = Math.min(currentStep, steps.length - 1)
    const minutes =
      currentStep === 0 && steps.length > 1 ? (steps[0] + steps[1]) / 2 : steps[lastValidStep]
    return { due: addMinutes(now, minutes), step: currentStep, graduated: false }
  }
  if (currentStep >= steps.length) {
    return { due: now, step: 0, graduated: true }
  }
  return { due: addMinutes(now, steps[currentStep]), step: currentStep + 1, graduated: false }
}

export function schedule(
  card: SchedulableCard,
  rating: Rating,
  now: Date,
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG,
  rng: () => number = Math.random,
): ScheduleResult {
  const reps = card.reps + 1

  if (card.state === 'new' || card.state === 'learning') {
    if (rating === 4) {
      const intervalDays = clampInterval(config.easyInterval, config)
      return {
        state: 'review',
        due: reviewDue(now, intervalDays, config),
        intervalDays,
        ease: card.ease,
        step: 0,
        reps,
        lapses: card.lapses,
      }
    }

    const outcome = advanceSteps(now, config.learningSteps, card.step, rating)
    if (outcome.graduated) {
      const intervalDays = clampInterval(config.graduatingInterval, config)
      return {
        state: 'review',
        due: reviewDue(now, intervalDays, config),
        intervalDays,
        ease: card.ease,
        step: 0,
        reps,
        lapses: card.lapses,
      }
    }
    return {
      state: 'learning',
      due: outcome.due,
      intervalDays: card.intervalDays,
      ease: card.ease,
      step: outcome.step,
      reps,
      lapses: card.lapses,
    }
  }

  if (card.state === 'review') {
    if (rating === 1) {
      // The post-lapse interval is stashed in intervalDays while the card is in 'relearning',
      // since intervalDays isn't otherwise read until the card is back in 'review' (see README).
      const pendingInterval = clampInterval(
        Math.max(1, Math.round(card.intervalDays * config.lapseMultiplier)),
        config,
      )
      return {
        state: 'relearning',
        due: addMinutes(now, config.relearningSteps[0]),
        intervalDays: pendingInterval,
        ease: roundEase(Math.max(config.minEase, card.ease - 0.2)),
        // Step 0's delay was already served above, so the step machine starts just past it
        // (see advanceSteps) — with the default single relearning step, the next Good graduates.
        step: config.relearningSteps.length,
        reps,
        lapses: card.lapses + 1,
      }
    }
    if (rating === 2) {
      const raw = Math.max(
        card.intervalDays + 1,
        Math.round(card.intervalDays * config.hardMultiplier),
      )
      const intervalDays = clampInterval(applyFuzz(raw, rng), config)
      return {
        state: 'review',
        due: reviewDue(now, intervalDays, config),
        intervalDays,
        ease: roundEase(Math.max(config.minEase, card.ease - 0.15)),
        step: 0,
        reps,
        lapses: card.lapses,
      }
    }
    if (rating === 3) {
      const raw = Math.max(card.intervalDays + 1, Math.round(card.intervalDays * card.ease))
      const intervalDays = clampInterval(applyFuzz(raw, rng), config)
      return {
        state: 'review',
        due: reviewDue(now, intervalDays, config),
        intervalDays,
        ease: card.ease,
        step: 0,
        reps,
        lapses: card.lapses,
      }
    }
    // rating === 4 (Easy)
    const raw = Math.max(
      card.intervalDays + 1,
      Math.round(card.intervalDays * card.ease * config.easyBonus),
    )
    const intervalDays = clampInterval(applyFuzz(raw, rng), config)
    return {
      state: 'review',
      due: reviewDue(now, intervalDays, config),
      intervalDays,
      ease: roundEase(card.ease + 0.15),
      step: 0,
      reps,
      lapses: card.lapses,
    }
  }

  // card.state === 'relearning'
  if (rating === 4) {
    const intervalDays = clampInterval(card.intervalDays + 1, config)
    return {
      state: 'review',
      due: reviewDue(now, intervalDays, config),
      intervalDays,
      ease: card.ease,
      step: 0,
      reps,
      lapses: card.lapses,
    }
  }
  const outcome = advanceSteps(now, config.relearningSteps, card.step, rating)
  if (outcome.graduated) {
    const intervalDays = clampInterval(card.intervalDays, config)
    return {
      state: 'review',
      due: reviewDue(now, intervalDays, config),
      intervalDays,
      ease: card.ease,
      step: 0,
      reps,
      lapses: card.lapses,
    }
  }
  return {
    state: 'relearning',
    due: outcome.due,
    intervalDays: card.intervalDays,
    ease: card.ease,
    step: outcome.step,
    reps,
    lapses: card.lapses,
  }
}
