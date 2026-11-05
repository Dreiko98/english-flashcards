import { beforeAll, describe, expect, it } from 'vitest'
import { addStudyDays, studyDayStart } from './studyDay'

beforeAll(() => {
  process.env.TZ = 'Europe/Madrid'
})

describe('studyDayStart', () => {
  it('belongs to the previous calendar day before dayStartsAtHour', () => {
    const date = new Date(2026, 2, 15, 3, 30) // 15 Mar 2026, 03:30 local
    const start = studyDayStart(date, 4)
    expect(start).toEqual(new Date(2026, 2, 14, 4, 0, 0, 0))
  })

  it('belongs to the same calendar day exactly at dayStartsAtHour', () => {
    const date = new Date(2026, 2, 15, 4, 0, 0, 0)
    const start = studyDayStart(date, 4)
    expect(start).toEqual(new Date(2026, 2, 15, 4, 0, 0, 0))
  })

  it('belongs to the same calendar day after dayStartsAtHour', () => {
    const date = new Date(2026, 2, 15, 23, 0)
    const start = studyDayStart(date, 4)
    expect(start).toEqual(new Date(2026, 2, 15, 4, 0, 0, 0))
  })
})

describe('addStudyDays', () => {
  it('adds whole study days keeping the local boundary hour', () => {
    const date = new Date(2026, 5, 1, 10, 0)
    const result = addStudyDays(date, 5, 4)
    expect(result).toEqual(new Date(2026, 5, 6, 4, 0, 0, 0))
  })

  it('keeps the 04:00 local wall-clock hour across the spring DST transition (Europe/Madrid)', () => {
    // Clocks jump 02:00 -> 03:00 on the last Sunday of March.
    const beforeDst = new Date(2026, 2, 27, 10, 0) // 27 Mar 2026
    const result = addStudyDays(beforeDst, 2, 4) // crosses into 29 Mar
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(2)
    expect(result.getDate()).toBe(29)
    expect(result.getHours()).toBe(4)
  })

  it('keeps the 04:00 local wall-clock hour across the autumn DST transition (Europe/Madrid)', () => {
    // Clocks fall back 03:00 -> 02:00 on the last Sunday of October.
    const beforeDst = new Date(2026, 9, 23, 10, 0) // 23 Oct 2026
    const result = addStudyDays(beforeDst, 3, 4) // crosses into 26 Oct
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(9)
    expect(result.getDate()).toBe(26)
    expect(result.getHours()).toBe(4)
  })
})
