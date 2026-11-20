import type { AuditLog } from './api'

export const LOGIN_RE = /login|signin|sign_in|auth|otp|2fa|password/i

export const isLoginLog = (l: Pick<AuditLog, 'action' | 'resource_type'>) =>
  LOGIN_RE.test(`${l.action} ${l.resource_type ?? ''}`)

// true for missing/unknown and internal addresses: nothing to attribute a fraud rule to
export function ignoreIp(raw?: string | null): boolean {
  let ip = String(raw ?? '').trim().toLowerCase()
  if (!ip || ip === 'unknown') return true
  if (ip.startsWith('[')) {
    const end = ip.indexOf(']')
    ip = ip.slice(1, end > 0 ? end : undefined)
  }
  ip = ip.replace(/%.*$/, '').replace(/^::ffff:/, '')
  const withPort = ip.match(/^(\d+\.\d+\.\d+\.\d+):\d+$/)
  if (withPort) ip = withPort[1]
  if (ip === '::1' || ip === '::') return true
  if (/^fe[89ab][0-9a-f]:/.test(ip)) return true
  if (/^f[cd][0-9a-f]{2}:/.test(ip)) return true
  const p = ip.split('.').map(Number)
  if (p.length === 4 && p.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
    const [a, b] = p
    return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)
  }
  return false
}
