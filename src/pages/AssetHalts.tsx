import { askReason } from '../lib/reason'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import PageHeader from '../components/PageHeader'

interface AssetRow {
  kind: string
  id: string
  name: string
  detail: string
  halted: boolean
  halt_reason: string
}

const LABEL: Record<string, string> = { etf: 'ETF', commodity: 'Commodity', mutualfund: 'Mutual fund' }
type Kind = 'all' | 'etf' | 'commodity' | 'mutualfund'

export default function AssetHalts() {
  const [rows, setRows] = useState<AssetRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [kind, setKind] = useState<Kind>('all')
  const [q, setQ] = useState('')

  const load = () =>
    api
      .get<{ assets: AssetRow[] }>('/admin/assets')
      .then((r) => setRows(r.assets ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load assets'))

  useEffect(() => {
    load()
  }, [])

  const toggle = async (a: AssetRow) => {
    let reason = ''
    if (!a.halted) {
      const r = askReason(`Halt trading in ${a.name}? Enter a reason:`)
      if (r === null) return
      reason = r
    } else if (!window.confirm(`Resume trading in ${a.name}?`)) {
      return
    }
    setBusy(a.id)
    setError(null)
    try {
      await api.post(`/admin/assets/${a.kind}/${a.id}/${a.halted ? 'unhalt' : 'halt'}`, { reason })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  const shown = useMemo(() => {
    if (!rows) return null
    const s = q.trim().toLowerCase()
    return rows.filter(
      (a) =>
        (kind === 'all' || a.kind === kind) &&
        (!s || String(a.name ?? '').toLowerCase().includes(s) || String(a.detail ?? '').toLowerCase().includes(s))
    )
  }, [rows, kind, q])

  const haltedCount = rows?.filter((a) => a.halted).length ?? 0

  return (
    <div>
      <PageHeader title="ETF / Commodity / Mutual Funds" subtitle="Halt or resume trading per asset" />
      <div className="p-6 space-y-4">
        {error && <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">{error}</div>}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5">
            {(['all', 'etf', 'commodity', 'mutualfund'] as Kind[]).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                  kind === k ? 'bg-ink text-white border-ink' : 'bg-surface text-muted border-border hover:text-ink'
                }`}
              >
                {k === 'all' ? 'All' : LABEL[k]}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search name..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-64 rounded border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          />
          <span className="text-xs text-muted">Halted: {haltedCount}</span>
        </div>

        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Detail</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {shown === null && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted text-xs">Loading...</td></tr>}
              {shown?.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted text-xs">No assets.</td></tr>}
              {shown?.slice(0, 300).map((a) => (
                <tr key={a.kind + a.id} className="border-b border-border last:border-0 hover:bg-bg">
                  <td className="px-4 py-2.5 text-xs text-muted">{LABEL[a.kind] ?? a.kind}</td>
                  <td className="px-4 py-2.5 text-ink font-medium">{a.name}</td>
                  <td className="px-4 py-2.5 text-muted text-xs">{a.detail}</td>
                  <td className="px-4 py-2.5">
                    {a.halted ? (
                      <span title={a.halt_reason} className="text-xs px-1.5 py-0.5 rounded bg-red-tint text-red">Halted</span>
                    ) : (
                      <span className="text-xs text-muted">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      disabled={busy === a.id}
                      onClick={() => toggle(a)}
                      className={`text-xs px-2.5 py-1 rounded border disabled:opacity-50 ${a.halted ? 'border-border text-ink' : 'border-red/30 text-red'}`}
                    >
                      {a.halted ? 'Resume' : 'Halt'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shown && shown.length > 300 && <p className="text-xs text-muted">Showing the first 300 of {shown.length}. Use search to narrow down.</p>}
      </div>
    </div>
  )
}