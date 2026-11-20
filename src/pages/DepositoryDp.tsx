import { withKeys } from '../lib/rowKeys'
import { toArr } from '../lib/arr'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, type User, type UserStatus, type PortfolioOverview } from '../lib/api'
import { kycLabel } from '../lib/kyc'
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

function Table({ cols, rows, empty }: { cols: string[]; rows: string[][] | null; empty: string }) {
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

export function CdslPage() {
  return (
    <Page title="CDSL" subtitle="Central Depository Services (India) Limited" e={null}>
      <Note t="Not connected. The backend has no CDSL integration, no DP ID, no BO ID storage and no depository API calls. A real connection needs DP registration with CDSL and their API access, then a gateway service in the backend. Nothing is shown rather than made-up data." />
    </Page>
  )
}

export function NsdlPage() {
  return (
    <Page title="NSDL" subtitle="National Securities Depository Limited" e={null}>
      <Note t="Not connected. The backend has no NSDL integration, no DP ID, no client ID storage and no depository API calls. A real connection needs DP registration with NSDL and their API access, then a gateway service in the backend. Nothing is shown rather than made-up data." />
    </Page>
  )
}

export function EdisPage() {
  return (
    <Page title="eDIS" subtitle="Electronic Delivery Instruction Slip for selling holdings" e={null}>
      <Note t="Not available. eDIS authorisation (TPIN and OTP through the depository) is not built, and holdings here are platform records, not demat shares. There is no authorisation log, so no eDIS status can be shown." />
    </Page>
  )
}

export function MappingPage() {
  const [u, setU] = useState<User[] | null>(null)
  const [st, setSt] = useState<Record<string, UserStatus>>({})
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<unknown>('/auth/admin/all-users').then((d) => setU(toArr<User>(d, 'users'))).catch((x) => setE(msg(x)))
    api.get<unknown>('/admin/user-statuses').then((d) => setSt(Object.fromEntries(toArr<UserStatus>(d, 'statuses').map((s) => [s.id, s])))).catch(() => {})
  }, [])
  return (
    <Page title="Demat Account Mapping" subtitle="Link between each client and a demat account (DP ID and BO ID)" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Clients" value={u ? String(u.length) : '-'} />
        <StatCard label="Demat accounts linked" value="0" tone="amber" />
      </div>
      <Table
        cols={['Name', 'Email', 'KYC', 'DP ID', 'BO / Client ID', 'Mapping status']}
        rows={u ? u.map((x) => [x.name, x.email, kycLabel(x, st[x.id]), '-', '-', 'Not linked']) : null}
        empty="No clients."
      />
      <Note t="No demat account is stored for any client. To support mapping, columns for DP ID and BO ID (and a link status) have to be added." />
    </Page>
  )
}

export function RepledgePage() {
  return (
    <Page title="Pledge / Re-pledge" subtitle="Pledge of securities to the broker or clearing member" e={null}>
      <Note t="Not available. There is no pledge table, no depository pledge request or confirmation, and no margin credit against shares. A re-pledge to the clearing member also needs depository connectivity. Nothing is shown rather than made-up records." />
    </Page>
  )
}

export function DpReconPage() {
  const [p, setP] = useState<PortfolioOverview | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<PortfolioOverview>('/admin/portfolio-overview').then(setP).catch((x) => setE(msg(x)))
  }, [])
  const rows = (() => {
    if (!p) return null
    const m = new Map<string, { q: number; u: Set<string> }>()
    p.holdings.forEach((h) => {
      const v = m.get(h.symbol) ?? { q: 0, u: new Set<string>() }
      v.q += Number(h.quantity) || 0
      v.u.add(h.user_id)
      m.set(h.symbol, v)
    })
    return [...m.entries()].sort((a, b) => b[1].q - a[1].q).map(([s, v]) => [s, String(v.u.size), String(v.q), 'Not connected', '-'])
  })()
  return (
    <Page title="DP Reconciliation" subtitle="Platform holdings compared with the depository" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Symbols held" value={rows ? String(rows.length) : '-'} />
        <StatCard label="Holdings rows" value={p ? String(p.summary.totalHoldings) : '-'} />
        <StatCard label="Depository data" value="None" tone="amber" />
      </div>
      <Table cols={['Symbol', 'Clients', 'Platform quantity', 'Depository quantity', 'Difference']} rows={rows} empty="No holdings." />
      <Note t="Only the platform side exists. Without a CDSL or NSDL feed there is no depository quantity, so no break can be calculated. Platform quantities cover the latest rows the API returns." />
    </Page>
  )
}