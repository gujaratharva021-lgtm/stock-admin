import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import PageHeader from '../components/PageHeader'

interface PendingRow {
  id: string
  user_email: string
  symbol: string
  buy_sell: string
  order_type: string
  quantity: number
  trigger_price: number
  status: string
  created_at: string
}

export default function PendingOrders() {
  const [rows, setRows] = useState<PendingRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('PENDING')

  const load = () =>
    api
      .get<{ orders: PendingRow[] }>('/admin/pending-orders')
      .then((r) => setRows(r.orders ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load orders'))

  useEffect(() => {
    load()
  }, [])

  const cancel = async (r: PendingRow) => {
    if (!window.confirm(`Cancel ${r.buy_sell} ${r.quantity} ${r.symbol} for ${r.user_email}?`)) return
    setBusy(r.id)
    try {
      await api.post(`/admin/pending-orders/${r.id}/cancel`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed')
    } finally {
      setBusy(null)
    }
  }

  const q = filter.trim().toLowerCase()
  const shown = rows?.filter((r) => (statusFilter === 'all' || r.status === statusFilter) && (!q || String(r.user_email ?? '').toLowerCase().includes(q) || String(r.symbol ?? '').toLowerCase().includes(q))) ?? null

  return (
    <div>
      <PageHeader title="Pending Orders" subtitle="Limit and stop-loss orders (waiting to trigger by default)" />
      <div className="p-6 space-y-4">
        {error && <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">{error}</div>}
        <input
          type="text"
          placeholder="Filter by user or symbol..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-72 rounded border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-48 rounded border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand">
          <option value="PENDING">Pending (waiting)</option>
          <option value="EXECUTED">Executed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REJECTED">Rejected</option>
          <option value="all">All statuses</option>
        </select>
        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">User</th>
                <th className="px-4 py-2.5 font-medium">Symbol</th>
                <th className="px-4 py-2.5 font-medium">Side</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium text-right">Qty</th>
                <th className="px-4 py-2.5 font-medium text-right">Trigger</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Created</th>
                <th className="px-4 py-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {shown === null && <tr><td colSpan={9} className="px-4 py-6 text-center text-muted text-xs">Loading...</td></tr>}
              {shown?.length === 0 && <tr><td colSpan={9} className="px-4 py-6 text-center text-muted text-xs">No orders.</td></tr>}
              {shown?.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-bg">
                  <td className="px-4 py-2.5 text-muted">{r.user_email}</td>
                  <td className="px-4 py-2.5 text-ink font-medium">{r.symbol}</td>
                  <td className="px-4 py-2.5 text-xs">{r.buy_sell}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">{r.order_type}</td>
                  <td className="px-4 py-2.5 text-right tabular">{r.quantity}</td>
                  <td className="px-4 py-2.5 text-right tabular">{r.trigger_price}</td>
                  <td className="px-4 py-2.5 text-xs">{r.status}</td>
                  <td className="px-4 py-2.5 text-muted text-xs">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right">
                    {r.status === 'PENDING' && (
                      <button disabled={busy === r.id} onClick={() => cancel(r)} className="text-xs px-2.5 py-1 rounded border border-red/30 text-red disabled:opacity-50">
                        Cancel
                      </button>
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