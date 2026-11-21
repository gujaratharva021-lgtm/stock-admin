import { isLoginLog } from '../lib/loginLog'
import { withKeys } from '../lib/rowKeys'
import { toArr } from '../lib/arr'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, type AuditLog, type User, type UserStatus } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

const msg = (x: unknown) => (x instanceof Error ? x.message : 'Failed to load')
const inputCls = 'rounded border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand'


function Page({ title, subtitle, e, children }: { title: string; subtitle: string; e: string | null; children: ReactNode }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="p-6 space-y-6">
        {e && <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">{e}</div>}
        {children}
      </div>
    </div>
  )
}

function Note({ t }: { t: string }) {
  return <div className="bg-surface border border-border rounded-md px-6 py-4 text-sm text-muted">{t}</div>
}

function Table({ cols, rows, empty }: { cols: string[]; rows: ReactNode[][] | null; empty: string }) {
  return (
    <div className="bg-surface border border-border rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            {cols.map((c) => <th key={c} className="px-4 py-2.5 font-medium">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows === null && <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-muted text-xs">Loading...</td></tr>}
          {rows?.length === 0 && <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-muted text-xs">{empty}</td></tr>}
          {rows && withKeys(rows).map(({ r, k }) => (
            <tr key={k} className="border-b border-border last:border-0 hover:bg-bg">
              {r.map((v, j) => <td key={j} className="px-4 py-2.5 text-ink">{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function useSec() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null)
  const [users, setUsers] = useState<User[] | null>(null)
  const [st, setSt] = useState<UserStatus[] | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<unknown>('/admin/audit-logs').then((d) => setLogs(toArr<AuditLog>(d, 'logs'))).catch((x) => setE(msg(x)))
    api.get<unknown>('/auth/admin/all-users').then((d) => setUsers(toArr<User>(d, 'users'))).catch((x) => setE(msg(x)))
    api.get<unknown>('/admin/user-statuses').then((d) => setSt(toArr<UserStatus>(d, 'statuses'))).catch(() => setSt([]))
  }, [])
  return { logs, users, st, e }
}

const isLogin = (l: AuditLog) => isLoginLog(l)
const wh = (l: AuditLog) => new Date(l.created_at).toLocaleString()

export function CsDashboardPage() {
  const { logs, users, st, e } = useSec()
  const blocked = st ? st.filter((s) => s.is_blocked).length : null
  const admins = users ? users.filter((x) => x.is_admin).length : null
  const unv = users ? users.filter((x) => !x.email_verified).length : null
  const fails = logs ? logs.filter((l) => l.result === 'FAILURE').length : null
  const lf = logs ? logs.filter((l) => isLogin(l) && l.result === 'FAILURE').length : null
  return (
    <Page title="Security Dashboard" subtitle="Security signals from users and audit data" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Blocked clients" value={blocked === null ? '-' : String(blocked)} tone={blocked ? 'amber' : 'default'} />
        <StatCard label="Admin accounts" value={admins === null ? '-' : String(admins)} />
        <StatCard label="Email not verified" value={unv === null ? '-' : String(unv)} tone={unv ? 'amber' : 'default'} />
        <StatCard label="Failed audit entries" value={fails === null ? '-' : String(fails)} tone={fails ? 'red' : 'brand'} />
        <StatCard label="Failed login-type entries" value={lf === null ? '-' : String(lf)} tone={lf ? 'red' : 'brand'} />
      </div>
      <Note t="Counts cover the latest rows the audit API returns. Admin 2FA is managed on the Security (2FA) page. Device, session and IP data are not available, so there is no geo, device or active-session view yet." />
    </Page>
  )
}

export function CsLoginPage() {
  const { logs, e } = useSec()
  const rows = logs ? logs.filter(isLogin) : null
  const ok = rows ? rows.filter((l) => l.result === 'SUCCESS').length : null
  const bad = rows ? rows.filter((l) => l.result === 'FAILURE').length : null
  return (
    <Page title="Login Monitoring" subtitle="Login, OTP, 2FA and password entries from the audit log" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Entries" value={rows ? String(rows.length) : '-'} />
        <StatCard label="Success" value={ok === null ? '-' : String(ok)} tone="brand" />
        <StatCard label="Failure" value={bad === null ? '-' : String(bad)} tone={bad ? 'red' : 'default'} />
      </div>
      <Table
        cols={['Time', 'Action', 'Resource', 'User ID', 'Result']}
        rows={rows ? rows.slice(0, 200).map((l) => [wh(l), l.action, `${l.resource_type ?? ''} ${l.resource_id ?? ''}`.trim(), l.user_id ?? '-', l.result]) : null}
        empty="No login-type entries found."
      />
      <Note t="Entries are picked by words in the action name (login, auth, otp, 2fa, password). If the backend does not audit client logins, this list will be short or empty. IP address and device are not shown because they are not exposed." />
    </Page>
  )
}

export function CsDevicePage() {
  return (
    <Page title="Device Management" subtitle="Devices used by clients" e={null}>
      <Note t="Not available. No device ID, user-agent or trusted-device record is exposed to the admin API. To support it, devices have to be stored at login and a read-only admin endpoint added. Nothing is shown rather than made-up data." />
    </Page>
  )
}

type WebSess = { id: string; code: string; user_email: string | null; status: string; created_at: string; linked_at: string | null; expires_at: string }

export function CsSessionPage() {
  const [s, setS] = useState<WebSess[] | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<unknown>('/admin/web-sessions').then((d) => setS(toArr<WebSess>(d, 'sessions'))).catch((x) => setE(msg(x)))
  }, [])
  const [now] = useState(() => Date.now())
  const eff = (x: WebSess) => (x.status === 'pending' && new Date(x.expires_at).getTime() < now ? 'expired' : x.status)
  const n = (k: string) => (s ? String(s.filter((x) => eff(x) === k).length) : '-')
  return (
    <Page title="Session Management" subtitle="Web login link history (QR / code flow)" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pending" value={n('pending')} tone="amber" />
        <StatCard label="Linked (waiting)" value={n('linked')} />
        <StatCard label="Used" value={n('used')} tone="brand" />
        <StatCard label="Expired" value={n('expired')} />
      </div>
      <Table
        cols={['Created', 'Code', 'User', 'Status', 'Linked at', 'Expires']}
        rows={s ? s.map((x) => [new Date(x.created_at).toLocaleString(), x.code, x.user_email ?? '-', eff(x), x.linked_at ? new Date(x.linked_at).toLocaleString() : '-', new Date(x.expires_at).toLocaleString()]) : null}
        empty="No web sessions yet."
      />
      <Note t="This is the history of web logins linked from the mobile app (latest 200), not a list of active sessions. The login token is never shown and the code is masked. Forced logout is not offered: the web app keeps a normal JWT that this table does not control. Real active sessions need a user_sessions table checked on every request." />
    </Page>
  )
}
export function CsSuspiciousPage() {
  const { logs, users, e } = useSec()
  const rows = (() => {
    if (!logs) return null
    const m = new Map<string, { n: number; last: string }>()
    logs.filter((l) => isLogin(l) && l.result === 'FAILURE' && (l.user_id || l.resource_id)).forEach((l) => {
      const k = String(l.user_id || l.resource_id)
      const v = m.get(k) ?? { n: 0, last: l.created_at }
      v.n++
      if (l.created_at > v.last) v.last = l.created_at
      m.set(k, v)
    })
    const em = new Map((users ?? []).map((x) => [x.id, x.email]))
    return [...m.entries()].filter(([, v]) => v.n >= 3).sort((a, b) => b[1].n - a[1].n).map(([id, v]) => [em.get(id) ?? id, String(v.n), new Date(v.last).toLocaleString()])
  })()
  return (
    <Page title="Suspicious Login" subtitle="Users with repeated failed login-type entries" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Users flagged" value={rows ? String(rows.length) : '-'} tone={rows && rows.length > 0 ? 'red' : 'brand'} />
      </div>
      <Table cols={['User', 'Failed entries', 'Last failure']} rows={rows} empty="No user has 3 or more failed login-type entries." />
      <Note t="Simple rule: 3 or more failures in the loaded rows. It cannot see new device, new location, impossible travel or IP reputation, because IP and device are not stored. Treat a flag as a reason to look, not as proof." />
    </Page>
  )
}

export function CsBlockPage() {
  const { users, st, e } = useSec()
  const um = new Map((users ?? []).map((x) => [x.id, x]))
  const rows = st ? st.filter((s) => s.is_blocked).map((s) => [um.get(s.id)?.name ?? '-', um.get(s.id)?.email ?? s.id, s.blocked_reason || '-']) : null
  return (
    <Page title="IP / Device Blocking" subtitle="Blocks that exist today are account blocks only" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Blocked accounts" value={rows ? String(rows.length) : '-'} tone={rows && rows.length > 0 ? 'amber' : 'default'} />
      </div>
      <Table cols={['Name', 'Email', 'Reason']} rows={rows} empty="No accounts are blocked." />
      <Note t="IP and device blocking are not built: there is no block list and no check at login. Only whole-account block exists. Block or unblock from Users or Account Status / Freeze. To support IP blocking, a block table and a middleware check on every request have to be added." />
    </Page>
  )
}

export function CsIncidentPage() {
  return (
    <Page title="Security Incidents" subtitle="Recorded incidents and their handling" e={null}>
      <Note t="Not available. There is no incident table, severity, owner or status workflow. Use Security Dashboard, Suspicious Login and Access Logs to spot problems, and keep incident notes outside the app for now. To support it, an incidents table and admin endpoints have to be built." />
    </Page>
  )
}

export function CsAccessPage() {
  const { logs, e } = useSec()
  const [q, setQ] = useState('')
  const s = q.trim().toLowerCase()
  const rows = logs ? logs.filter((l) => !s || `${l.action} ${l.resource_type ?? ''} ${l.resource_id ?? ''} ${l.user_id ?? ''} ${l.result}`.toLowerCase().includes(s)) : null
  return (
    <Page title="Access Logs" subtitle="Audit log entries, newest first as returned by the API" e={e}>
      <input type="text" placeholder="Filter by action, user ID, result..." value={q} onChange={(ev) => setQ(ev.target.value)} className={`${inputCls} w-72`} />
      <Table
        cols={['Time', 'Action', 'Resource', 'User ID', 'Result']}
        rows={rows ? rows.slice(0, 200).map((l) => [wh(l), l.action, `${l.resource_type ?? ''} ${l.resource_id ?? ''}`.trim(), l.user_id ?? '-', l.result]) : null}
        empty="No entries."
      />
      <Note t="This is the audit log, a record of recorded actions, not a web server access log. Showing the first 200 matches of the rows the API returns. IP address and user agent are not shown." />
    </Page>
  )
}