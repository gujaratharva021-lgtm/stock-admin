import { describe, it, expect } from 'vitest'
import { istDay, istToday } from './ist'

describe('istDay', () => {
  it('moves late-UTC timestamps to the next IST date', () => {
    expect(istDay('2026-11-19T20:00:00Z')).toBe('2026-11-20')
  })
  it('keeps IST-evening timestamps on the same date', () => {
    expect(istDay('2026-11-20T10:00:00Z')).toBe('2026-11-20')
  })
  it('passes date-only strings through', () => {
    expect(istDay('2026-11-20')).toBe('2026-11-20')
  })
  it('handles empty and invalid input', () => {
    expect(istDay('')).toBe('')
    expect(istDay(null)).toBe('')
    expect(istDay('garbage-value')).toBe('garbage-va')
  })
  it('istToday returns YYYY-MM-DD', () => {
    expect(istToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
