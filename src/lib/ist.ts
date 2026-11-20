const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })

export function istDay(s: string | number | Date | null | undefined): string {
  if (s === null || s === undefined || s === '') return ''
  if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = s instanceof Date ? s : new Date(s)
  if (isNaN(d.getTime())) return String(s).slice(0, 10)
  return fmt.format(d)
}

export function istToday(): string {
  return fmt.format(new Date())
}
