import { describe, it, expect } from 'vitest'
import { toArr } from './arr'

describe('toArr', () => {
  it('returns an array as-is', () => {
    expect(toArr<number>([1, 2], 'x')).toEqual([1, 2])
  })
  it('reads the named key from an object', () => {
    expect(toArr<number>({ orders: [1, 2], other: [9] }, 'orders')).toEqual([1, 2])
  })
  it('returns [] when the key is missing or not an array', () => {
    expect(toArr<number>({ orders: 'nope' }, 'orders')).toEqual([])
    expect(toArr<number>({}, 'orders')).toEqual([])
  })
  it('returns [] for null and undefined', () => {
    expect(toArr<number>(null, 'x')).toEqual([])
    expect(toArr<number>(undefined, 'x')).toEqual([])
  })
})
