import { isValidElement } from 'react'
import type { ReactNode } from 'react'

export function withKeys<R extends ReactNode[]>(rows: R[]): { r: R; k: string }[] {
  const seen = new Map<string, number>()
  return rows.map((r) => {
    const base = r
      .map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : isValidElement(c) ? String(c.key ?? '') : ''))
      .join('|')
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    return { r, k: n ? `${base}#${n}` : base }
  })
}
