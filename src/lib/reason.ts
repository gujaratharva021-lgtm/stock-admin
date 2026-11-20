export function askReason(message: string): string | null {
  for (;;) {
    const r = window.prompt(message)
    if (r === null) return null
    const t = r.trim()
    if (t) return t
    window.alert('A reason is required.')
  }
}
