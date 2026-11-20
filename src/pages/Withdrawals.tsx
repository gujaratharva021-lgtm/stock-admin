import { askReason } from '../lib/reason'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import PageHeader from '../components/PageHeader'

interface WRow {
  id: string
  user_email: string
  amount: number
  status: string
  reason: string
  created_at: string
  bank_name: string
  account_last4: string
}

export default function Withdrawals() {
  const [rows, setRows] = useState<WRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = () =>
    api
      .get<{ withdrawals: WRow[] }>('/admin/withdrawals')
      .then((r) => setRows(r.withdrawals))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load withdrawals'))

  useEffect(() => {
    load()
  }, [])

  const act = async (r: WRow, approve: boolean) => {
    let reason = ''
    if (approve) {
      if (!window.confirm(`Approve withdrawal of Rs ${r.amount} for ${r.user_email}? Make sure the bank payout is done.`)) return
    } else {
      const x = askReason(`Reject withdrawal of Rs ${r.amount} for ${r.user_email}? The amount is refunded to their wallet. Enter a reason:`)
      if (x === null) return
      reason = x
    }
    setBusy(r.id)
    setError(null)
    try {
      await api.post(`/admin/withdrawals/${r.id}/${approve ? 'approve' : 'reject'}`, { reason })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  const badge = (s: string) =>
    s === 'APPROVED' ? 'bg-brand-tint text-brand-dark' : s === 'REJECTED' ? 'bg-red-tint text-red' : 'bg-amber-tint text-amber'

  return (
    <div>
      <PageHeader title="Withdrawals" subtitle="Review and approve withdrawal requests" />
      <div className="p-6 space-y-4">
        {error && <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">{error}</div>}
        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">User</th>
                <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                <th className="px-4 py-2.5 font-medium">Bank</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Requested</th>
                <th className="px-4 py-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows === null && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted text-xs">Loading...</td></tr>}
              {rows?.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted text-xs">No withdrawal requests.</td></tr>}
              {rows?.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-bg">
                  <td className="px-4 py-2.5 text-muted">{r.user_email}</td>
                  <td className="px-4 py-2.5 text-right tabular text-ink">{(Number(r.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">{r.bank_name ? `${r.bank_name} ****${r.account_last4}` : '-'}</td>
                  <td className="px-4 py-2.5"><span title={r.reason} className={`text-xs px-1.5 py-0.5 rounded ${badge(r.status)}`}>{r.status}</span></td>
                  <td className="px-4 py-2.5 text-muted text-xs">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right space-x-2">
                    {r.status === 'PENDING' && (
                      <>
                        <button disabled={busy === r.id} onClick={() => act(r, true)} className="text-xs px-2.5 py-1 rounded border border-border text-ink disabled:opacity-50">Approve</button>
                        <button disabled={busy === r.id} onClick={() => act(r, false)} className="text-xs px-2.5 py-1 rounded border border-red/30 text-red disabled:opacity-50">Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}