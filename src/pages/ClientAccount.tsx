import { askReason } from '../lib/reason'
import { withKeys } from '../lib/rowKeys'
import { toArr } from '../lib/arr'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, type User, type UserStatus } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

const msg = (x: unknown) => (x instanceof Error ? x.message : 'Failed to load')

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

function useClients() {
  const [users, setUsers] = useState<User[] | null>(null)
  const [st, setSt] = useState<Record<string, UserStatus>>({})
  const [e, setE] = useState<string | null>(null)
  const load = () => {
    const p1 = api.get<unknown>('/auth/admin/all-users').then((d) => setUsers(toArr<User>(d, 'users'))).catch((x) => setE(msg(x)))
    const p2 = api.get<unknown>('/admin/user-statuses').then((d) => setSt(Object.fromEntries(toArr<UserStatus>(d, 'statuses').map((s) => [s.id, s])))).catch(() => {})
    return Promise.all([p1, p2])
  }
  useEffect(() => { load() }, [])
  return { users, st, e, setE, load }
}

function state(u: User, s?: UserStatus) {
  if (s?.is_blocked) return 'Frozen / blocked'
  if (!u.email_verified) return 'Email not verified'
  if ((s?.kyc_status ?? (u.kyc_completed ? 'approved' : 'pending')) !== 'approved') return 'KYC ' + (s?.kyc_status ?? 'pending')
  return 'Active'
}

export function ActivationPage() {
  const { users, st, e } = useClients()
  const rows = users ? users.map((u) => [u.name, u.email, u.email_verified ? 'Yes' : 'No', st[u.id]?.kyc_status ?? (u.kyc_completed ? 'approved' : 'pending'), state(u, st[u.id]), new Date(u.created_at).toLocaleDateString()]) : null
  const n = (s: string) => (users ? String(users.filter((u) => state(u, st[u.id]) === s).length) : '-')
  return (
    <Page title="Account Activation" subtitle="Which accounts are fully activated and what is pending" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active" value={n('Active')} tone="brand" />
        <StatCard label="Email not verified" value={n('Email not verified')} tone="amber" />
        <StatCard label="KYC pending" value={users ? String(users.filter((u) => state(u, st[u.id]).startsWith('KYC')).length) : '-'} tone="amber" />
        <StatCard label="Frozen" value={n('Frozen / blocked')} tone="red" />
      </div>
      <Table cols={['Name', 'Email', 'Email verified', 'KYC', 'Account state', 'Created']} rows={rows} empty="No accounts." />
      <Note t="Active means email verified, KYC approved and not blocked. Approve KYC from the KYC page." />
    </Page>
  )
}

export function FreezePage() {
  const { users, st, e, setE, load } = useClients()
  const [busy, setBusy] = useState<string | null>(null)
  async function toggle(u: User) {
    const blocked = st[u.id]?.is_blocked
    let reason = ''
    if (!blocked) {
      const r = askReason(`Freeze ${u.email}? Enter a reason:`)
      if (r === null) return
      reason = r
    } else if (!window.confirm(`Unfreeze ${u.email}?`)) return
    setBusy(u.id)
    try {
      await api.post(`/admin/users/${u.id}/${blocked ? 'unblock' : 'block'}`, { reason })
      await load()
    } catch (x) {
      setE(msg(x))
    } finally {
      setBusy(null)
    }
  }
  const rows = users ? users.map((u) => {
    const b = st[u.id]?.is_blocked
    return [u.name, u.email, b ? 'Frozen' : 'Active', st[u.id]?.blocked_reason || '-', <button key={u.id} disabled={busy === u.id || u.is_admin} onClick={() => toggle(u)} className={`text-xs px-2.5 py-1 rounded border disabled:opacity-40 ${b ? 'border-border text-ink' : 'border-red/30 text-red'}`}>{b ? 'Unfreeze' : 'Freeze'}</button>]
  }) : null
  return (
    <Page title="Account Status / Freeze" subtitle="Freeze or unfreeze client accounts" e={e}>
      <Table cols={['Name', 'Email', 'Status', 'Reason', 'Action']} rows={rows} empty="No accounts." />
      <Note t="Freeze uses the existing block feature. Admin accounts cannot be frozen from here. Partial freezes (debit-only, trading-only) do not exist in the backend." />
    </Page>
  )
}

export function NominationPage() {
  return (
    <Page title="Nomination" subtitle="Nominee details of clients" e={null}>
      <Note t="Not available. There is no nominee table. The family_members table stores family links, not nominations, and has no admin API. To support it, a nomination table (name, relation, share %, ID) and an admin endpoint have to be built." />
    </Page>
  )
}

export function UccPage() {
  return (
    <Page title="UCC / Client Code" subtitle="Unique Client Code registered with the exchange" e={null}>
      <Note t="Not available. Users have only an internal ID. No UCC or client code is stored, and no exchange UCC registration exists. To support it, a ucc column and registration status have to be added." />
    </Page>
  )
}

export function DdpiPage() {
  return (
    <Page title="DDPI / POA" subtitle="Authorisation to debit securities from the demat account" e={null}>
      <Note t="Not available. There is no demat link, so no DDPI or POA record, signature or status is stored. Nothing is shown rather than made-up statuses." />
    </Page>
  )
}

type W = { user_email?: string; bank_name?: string; account_last4?: string; status?: string }

export function BankMapPage() {
  const [w, setW] = useState<W[] | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<unknown>('/admin/withdrawals').then((d) => setW(toArr<W>(d, 'withdrawals'))).catch((x) => setE(msg(x)))
  }, [])
  const rows = (() => {
    if (!w) return null
    const m = new Map<string, { email: string; bank: string; last4: string; n: number }>()
    w.forEach((x) => {
      const email = x.user_email ?? ''
      const bank = x.bank_name || '-'
      const last4 = x.account_last4 || '-'
      const k = JSON.stringify([email, bank, last4])
      const v = m.get(k) ?? { email, bank, last4, n: 0 }
      v.n++
      m.set(k, v)
    })
    return [...m.values()]
      .sort((a, b) => a.email.localeCompare(b.email) || a.bank.localeCompare(b.bank) || a.last4.localeCompare(b.last4))
      .map((v) => [v.email, v.bank, v.last4 === '-' ? '-' : '****' + v.last4, String(v.n)])
  })()
  return (
    <Page title="Client Bank Mapping" subtitle="Bank accounts clients have used for withdrawals" e={e}>
      <Table cols={['Client email', 'Bank', 'Account', 'Withdrawal requests']} rows={rows} empty="No withdrawal requests yet." />
      <Note t="Built from withdrawal requests only, so a bank account never used for a withdrawal is not listed. The bank_accounts table has no admin endpoint yet. A full mapping (all accounts, primary flag, verification) needs a small read-only backend endpoint. Account numbers are shown masked." />
    </Page>
  )
}