import { describe, it, expect } from 'vitest'
import { withKeys } from './rowKeys'

describe('withKeys', () => {
  it('builds keys from cell values', () => {
    expect(withKeys([['a', 'b'], ['c', 1]]).map((x) => x.k)).toEqual(['a|b', 'c|1'])
  })
  it('suffixes duplicate rows so keys stay unique', () => {
    expect(withKeys([['a', 'b'], ['a', 'b'], ['a', 'b']]).map((x) => x.k)).toEqual(['a|b', 'a|b#1', 'a|b#2'])
  })
  it('keeps the original row', () => {
    const rows = [['x']]
    expect(withKeys(rows)[0].r).toBe(rows[0])
  })
})
