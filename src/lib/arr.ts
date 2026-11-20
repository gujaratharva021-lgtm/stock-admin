export function toArr<T>(d: unknown, key: string): T[] {
  if (Array.isArray(d)) return d as T[]
  if (d && typeof d === 'object') {
    const v = (d as Record<string, unknown>)[key]
    if (Array.isArray(v)) return v as T[]
  }
  return []
}
