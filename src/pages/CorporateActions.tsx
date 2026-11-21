import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import PageHeader from '../components/PageHeader'

interface Row {
  id: string
  type: string
  symbol: string
  target_symbol: string
  ratio_a: number
  ratio_b: number
  amount: number
  cost_pct: number
  ex_date: string
  status: string
  affected_users: number
  applied_at: string
  created_at: string
}

type Field = { k: string; label: string; num?: boolean }
type Cfg = { type: string; title: string; subtitle: string; note: string; fields: Field[]; types?: string[] }

const inputCls = 'rounded border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand'

function describe(r: Row): string {
  switch (r.type) {
    case 'DIVIDEND': return `Rs ${r.amount} per share`
    case 'BONUS': return `${r.ratio_a} new for every ${r.ratio_b} held`
    case 'SPLIT': return `${r.ratio_a} share becomes ${r.ratio_b}`
    case 'BUYBACK': return `Rs ${r.amount}, accepts ${r.ratio_a} of every ${r.ratio_b} held`
    case 'RIGHTS': return `Rs ${r.amount}, ${r.ratio_a} for every ${r.ratio_b} held (record only)`
    case 'MERGER': return `${r.ratio_a} ${r.target_symbol} for every ${r.ratio_b} held, source removed`
    case 'DEMERGER': return `${r.ratio_a} ${r.target_symbol} for every ${r.ratio_b} held, ${r.cost_pct}% of cost moves, source kept`
    default: return ''
  }
}

function validateAction(body: Record<string, unknown>): string | null {
  const type = String(body.type || '')
  const symbol = String(body.symbol || '').trim().toUpperCase()
  const target = String(body.target_symbol || '').trim().toUpperCase()
  const n = (k: string) => Number(body[k])
  const pos = (k: string) => Number.isFinite(n(k)) && n(k) > 0
  if (!symbol) return 'Symbol is required'
  if (!body.ex_date) return 'Ex date is required'
  switch (type) {
    case 'DIVIDEND':
      if (!pos('amount')) return 'Dividend per share must be greater than 0'
      break
    case 'BONUS':
    case 'SPLIT':
      if (!pos('ratio_a') || !pos('ratio_b')) return 'Both ratio values must be greater than 0'
      break
    case 'BUYBACK':
      if (!pos('amount') || !pos('ratio_a') || !pos('ratio_b')) return 'Buyback price and both ratio values must be greater than 0'
      if (n('ratio_a') > n('ratio_b')) return 'Accepted shares cannot exceed shares held'
      break
    case 'RIGHTS':
      if (!pos('amount') || !pos('ratio_a') || !pos('ratio_b')) return 'Issue price and both ratio values must be greater than 0'
      break
    case 'MERGER':
    case 'DEMERGER':
      if (!target) return 'Target symbol is required'
      if (target === symbol) return 'Target symbol must differ from the source symbol'
      if (!pos('ratio_a') || !pos('ratio_b')) return 'Both ratio values must be greater than 0'
      if (type === 'DEMERGER' && !(n('cost_pct') > 0 && n('cost_pct') < 100)) return 'Cost % moving must be between 0 and 100'
      break
    default:
      return 'Invalid type'
  }
  return null
}

function CorpPage({ cfg }: { cfg: Cfg }) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({ type: cfg.type })
  const [busy, setBusy] = useState(false)

  const loadSeq = useRef(0)
  const load = useCallback(() => {
    const seq = ++loadSeq.current
    return api
      .get<{ actions: Row[] }>(`/admin/corporate-actions?type=${cfg.type}`)
      .then((r) => { if (seq === loadSeq.current) setRows(r.actions ?? []) })
      .catch((e) => { if (seq === loadSeq.current) setError(e instanceof Error ? e.message : 'Failed to load') })
  }, [cfg.type])

  useEffect(() => {
    load()
  }, [load])

  const set = (k: string, v: string) => setForm({ ...form, [k]: v })

  const create = async () => {
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      const body: Record<string, unknown> = { type: form.type || cfg.type, symbol: form.symbol || '', ex_date: form.ex_date || '' }
      cfg.fields.forEach((f) => {
        body[f.k] = f.num ? Number(form[f.k] || 0) : form[f.k] || ''
      })
      const verr = validateAction(body)
      if (verr) {
        setError(verr)
        return
      }
      await api.post('/admin/corporate-actions', body)
      setForm({ type: cfg.type })
      setInfo('Announced. Review it below and press Apply when ready.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create')
    } finally {
      setBusy(false)
    }
  }

  const applyInner = async (r: Row) => {
    if (!window.confirm(`Apply ${r.type} on ${r.symbol} now? This changes holdings or wallets of all holders and cannot be undone.`)) return
    setError(null)
    setInfo(null)
    try {
      const res = await api.post<{ affected_users: number }>(`/admin/corporate-actions/${r.id}/apply`)
      setInfo(`Applied. ${res.affected_users} holders updated.`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply')
    }
  }

  const cancelInner = async (r: Row) => {
    if (!window.confirm(`Cancel this ${r.type} on ${r.symbol}?`)) return
    try {
      await api.post(`/admin/corporate-actions/${r.id}/cancel`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel')
    }
  }

  const actLock = useRef(false)
  const [actBusy, setActBusy] = useState(false)
  const guarded = async (fn: () => Promise<void>) => {
    if (actLock.current) return
    actLock.current = true
    setActBusy(true)
    try {
      await fn()
    } finally {
      actLock.current = false
      setActBusy(false)
    }
  }
  const apply = (r: Row) => guarded(() => applyInner(r))
  const cancel = (r: Row) => guarded(() => cancelInner(r))

  const th = 'px-4 py-2.5 font-medium'
  return (
    <div>
      <PageHeader title={cfg.title} subtitle={cfg.subtitle} />
      <div className="p-6 space-y-4">
        {error && <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">{error}</div>}
        {info && <div className="text-sm text-brand-dark bg-brand-tint border border-brand/20 rounded px-3 py-2">{info}</div>}

        <div className="bg-surface border border-border rounded-md p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {cfg.types && (
              <select className={inputCls} value={form.type || cfg.type} onChange={(e) => set('type', e.target.value)}>
                {cfg.types.map((t) => <option key={t}>{t}</option>)}
              </select>
            )}
            <input className={inputCls} placeholder="Symbol (e.g. TCS)" value={form.symbol || ''} onChange={(e) => set('symbol', e.target.value)} />
            {cfg.fields.map((f) => (
              <input key={f.k} className={inputCls} placeholder={f.label} type={f.num ? 'number' : 'text'} value={form[f.k] || ''} onChange={(e) => set(f.k, e.target.value)} />
            ))}
            <input className={inputCls} type="date" title="Ex date" value={form.ex_date || ''} onChange={(e) => set('ex_date', e.target.value)} />
            <button disabled={busy} onClick={create} className="text-sm px-3 py-2 rounded bg-ink text-white disabled:opacity-50">
              {busy ? 'Saving...' : 'Announce'}
            </button>
          </div>
          <p className="text-xs text-muted">{cfg.note}</p>
        </div>

        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className={th}>Type</th>
                <th className={th}>Symbol</th>
                <th className={th}>Terms</th>
                <th className={th}>Ex date</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Holders</th>
                <th className={`${th} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows === null && <tr><td colSpan={7} className="px-4 py-6 text-center text-muted text-xs">Loading...</td></tr>}
              {rows?.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-muted text-xs">Nothing announced yet.</td></tr>}
              {rows?.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-bg">
                  <td className="px-4 py-2.5 text-xs">{r.type}</td>
                  <td className="px-4 py-2.5 text-ink font-medium">{r.symbol}</td>
                  <td className="px-4 py-2.5 text-muted text-xs">{describe(r)}</td>
                  <td className="px-4 py-2.5 text-muted text-xs">{r.ex_date || '-'}</td>
                  <td className="px-4 py-2.5 text-xs">{r.status}</td>
                  <td className="px-4 py-2.5 text-right tabular">{r.status === 'APPLIED' ? r.affected_users : '-'}</td>
                  <td className="px-4 py-2.5 text-right space-x-2">
                    {r.status === 'ANNOUNCED' && r.type !== 'RIGHTS' && (
                      <button onClick={() => apply(r)} disabled={actBusy} className="text-xs px-2.5 py-1 rounded border border-border text-ink disabled:opacity-50">Apply</button>
                    )}
                    {r.status === 'ANNOUNCED' && (
                      <button onClick={() => cancel(r)} disabled={actBusy} className="text-xs px-2.5 py-1 rounded border border-red/30 text-red disabled:opacity-50">Cancel</button>
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

const ratio = (a: string, b: string): Field[] => [{ k: 'ratio_a', label: a, num: true }, { k: 'ratio_b', label: b, num: true }]

export const Dividends = () => (
  <CorpPage cfg={{ type: 'DIVIDEND', title: 'Dividends', subtitle: 'Credit dividend to every holder of a stock', note: 'Apply credits quantity x dividend per share to each holder wallet and notifies them. Based on current holdings, not the record date.', fields: [{ k: 'amount', label: 'Dividend per share (INR)', num: true }] }} />
)
export const Bonus = () => (
  <CorpPage cfg={{ type: 'BONUS', title: 'Bonus', subtitle: 'Bonus shares to existing holders', note: 'Example: 1 new for every 2 held. Fractions are dropped. Average price is adjusted so invested value stays the same.', fields: ratio('New shares', 'For every held') }} />
)
export const Splits = () => (
  <CorpPage cfg={{ type: 'SPLIT', title: 'Stock Split', subtitle: 'Split holdings by a ratio', note: 'Example: 1 becomes 5. Quantity is multiplied and average price divided. Fractions are dropped.', fields: ratio('Old (e.g. 1)', 'New (e.g. 5)') }} />
)
export const Buyback = () => (
  <CorpPage cfg={{ type: 'BUYBACK', title: 'Buyback', subtitle: 'Company buys back shares from holders', note: 'Simplified: accepts a fixed share of every holder (e.g. 1 of every 10) at the buyback price and credits the wallet. Holders do not choose to tender.', fields: [{ k: 'amount', label: 'Buyback price (INR)', num: true }, ...ratio('Accepted', 'Out of held')] }} />
)
export const Rights = () => (
  <CorpPage cfg={{ type: 'RIGHTS', title: 'Rights Issue', subtitle: 'Record rights issues', note: 'Record only. Applying is disabled because rights need each holder to subscribe and pay, which the app does not support yet.', fields: [{ k: 'amount', label: 'Issue price (INR)', num: true }, ...ratio('Rights shares', 'For every held')] }} />
)
export const Merger = () => (
  <CorpPage cfg={{ type: 'MERGER', types: ['MERGER', 'DEMERGER'], title: 'Merger / Demerger', subtitle: 'Swap or split holdings into another stock', note: 'Merger: source holding is replaced by target shares and cost carries over. Demerger: source is kept, target shares are added and the given % of cost moves to the target. Fractions are dropped.', fields: [{ k: 'target_symbol', label: 'Target symbol' }, ...ratio('Target shares', 'For every source'), { k: 'cost_pct', label: 'Cost % moving (demerger)', num: true }] }} />
)