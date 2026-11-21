import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import PageHeader from '../components/PageHeader'

interface TicketRow {
  id: string
  user_email: string
  subject: string
  status: string
  created_at: string
  updated_at: string
  messages: number
}

interface MsgRow {
  id: string
  is_admin: boolean
  body: string
  created_at: string
}

export default function Support() {
  const [rows, setRows] = useState<TicketRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'open' | 'closed' | 'all'>('open')
  const [sel, setSel] = useState<TicketRow | null>(null)
  const [msgs, setMsgs] = useState<MsgRow[]>([])
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () =>
    api
      .get<{ tickets: TicketRow[] }>('/admin/tickets')
      .then((r) => setRows(r.tickets ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load tickets'))

  const openSeq = useRef(0)
  const pick = (t: TicketRow) => {
    if (busy) return
    if (t.id !== sel?.id) {
      setReply('')
      setError(null)
    }
    open(t)
  }
  const open = (t: TicketRow) => {
    const seq = ++openSeq.current
    return api
      .get<{ ticket: TicketRow; messages: MsgRow[] }>(`/admin/tickets/${t.id}`)
      .then((r) => {
        if (seq !== openSeq.current) return
        setSel(r.ticket)
        setMsgs(r.messages)
      })
      .catch((e) => { if (seq === openSeq.current) setError(e instanceof Error ? e.message : 'Failed to load ticket') })
  }

  useEffect(() => {
    load()
  }, [])

  const send = async () => {
    if (!sel || !reply.trim()) return
    setBusy(true)
    setError(null)
    try {
      await api.post(`/admin/tickets/${sel.id}/reply`, { message: reply.trim() })
      setReply('')
      await open(sel)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reply failed')
    } finally {
      setBusy(false)
    }
  }

  const close = async () => {
    if (!sel || !window.confirm('Close this ticket? The user will not be able to reply.')) return
    setBusy(true)
    setError(null)
    try {
      await api.post(`/admin/tickets/${sel.id}/close`)
      await open(sel)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Close failed')
    } finally {
      setBusy(false)
    }
  }

  const shown = rows?.filter((t) => filter === 'all' || t.status === filter.toUpperCase()) ?? null
  const openCount = rows?.filter((t) => t.status === 'OPEN').length ?? 0

  return (
    <div>
      <PageHeader title="Support / Tickets" subtitle="User support tickets and conversations" />
      <div className="p-6 space-y-4">
        {error && <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">{error}</div>}

        <div className="flex gap-1.5">
          {(['open', 'closed', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f)
                if (sel && f !== 'all' && sel.status !== f.toUpperCase()) {
                  openSeq.current++
                  setSel(null)
                  setMsgs([])
                  setReply('')
                }
              }}
              className={`text-xs px-3 py-1.5 rounded border transition-colors capitalize ${
                filter === f ? 'bg-ink text-white border-ink' : 'bg-surface text-muted border-border hover:text-ink'
              }`}
            >
              {f === 'open' ? `Open (${openCount})` : f}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="bg-surface border border-border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-2.5 font-medium">User</th>
                  <th className="px-4 py-2.5 font-medium">Subject</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {shown === null && <tr><td colSpan={4} className="px-4 py-6 text-center text-muted text-xs">Loading...</td></tr>}
                {shown?.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-muted text-xs">No tickets.</td></tr>}
                {shown?.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => pick(t)}
                    className={`border-b border-border last:border-0 hover:bg-bg cursor-pointer ${sel?.id === t.id ? 'bg-bg' : ''}`}
                  >
                    <td className="px-4 py-2.5 text-muted text-xs">{t.user_email}</td>
                    <td className="px-4 py-2.5 text-ink">{t.subject}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${t.status === 'OPEN' ? 'bg-amber-tint text-amber' : 'bg-brand-tint text-brand-dark'}`}>{t.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-muted text-xs">{new Date(t.updated_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-surface border border-border rounded-md p-4 space-y-3">
            {!sel && <p className="text-sm text-muted text-center py-8">Select a ticket to view the conversation.</p>}
            {sel && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-ink">{sel.subject}</div>
                    <div className="text-xs text-muted">{sel.user_email}</div>
                  </div>
                  {sel.status === 'OPEN' && (
                    <button disabled={busy} onClick={close} className="text-xs px-2.5 py-1 rounded border border-red/30 text-red disabled:opacity-50">
                      Close ticket
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {msgs.map((m) => (
                    <div key={m.id} className={`rounded px-3 py-2 text-sm ${m.is_admin ? 'bg-brand-tint ml-8' : 'bg-bg mr-8'}`}>
                      <div className="text-[11px] text-muted mb-0.5">
                        {m.is_admin ? 'Admin' : 'User'} · {new Date(m.created_at).toLocaleString()}
                      </div>
                      <div className="text-ink whitespace-pre-wrap">{m.body}</div>
                    </div>
                  ))}
                </div>
                {sel.status === 'OPEN' ? (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Write a reply..."
                      className="w-full rounded border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                    />
                    <button disabled={busy || !reply.trim()} onClick={send} className="text-sm px-3 py-2 rounded bg-ink text-white disabled:opacity-50">
                      {busy ? 'Sending...' : 'Send reply'}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted">This ticket is closed.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}