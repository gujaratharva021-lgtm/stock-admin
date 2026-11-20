import { askReason } from '../lib/reason'
import { useEffect, useState } from 'react'
import { api, type InstrumentsResponse } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

const PAGE_SIZE = 100
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString()

const inputCls =
  'rounded border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand'

function Empty({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-8 text-center text-muted text-xs">
        {text}
      </td>
    </tr>
  )
}

export default function Market() {
  const [data, setData] = useState<InstrumentsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [exchange, setExchange] = useState('')
  const [sector, setSector] = useState('')
  const [offset, setOffset] = useState(0)
  const [halted, setHalted] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const loadHalted = () =>
    api
      .get<{ halted: { id: string; halt_reason: string | null }[] }>('/admin/halted-instruments')
      .then((r) => setHalted(Object.fromEntries((r.halted ?? []).map((h) => [h.id, h.halt_reason ?? '']))))
      .catch(() => {})

  useEffect(() => {
    loadHalted()
  }, [])

  const toggleHalt = async (id: string, symbol: string) => {
    const isHalted = id in halted
    let reason = ''
    if (!isHalted) {
      const r = askReason(`Halt trading in ${symbol}? Enter a reason:`)
      if (r === null) return
      reason = r
    } else if (!window.confirm(`Resume trading in ${symbol}?`)) {
      return
    }
    setBusy(id)
    try {
      await api.post(`/admin/instruments/${id}/${isHalted ? 'unhalt' : 'halt'}`, { reason })
      await loadHalted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  // debounce the search box
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setOffset(0)
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false
    const key = `${search}|${exchange}|${sector}|${offset}`
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) })
    if (search) params.set('q', search)
    if (exchange) params.set('exchange', exchange)
    if (sector) params.set('sector', sector)
    api
      .get<InstrumentsResponse>(`/admin/instruments?${params.toString()}`)
      .then((r) => {
        if (cancelled) return
        setData(r)
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load instruments')
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(key)
      })
    return () => {
      cancelled = true
    }
  }, [search, exchange, sector, offset])

  const loading = loadedKey !== `${search}|${exchange}|${sector}|${offset}`
  const total = data?.total ?? 0
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + PAGE_SIZE, total)

  const th = 'px-4 py-2.5 font-medium'
  const wrap = 'bg-surface border border-border rounded-md overflow-hidden'
  const head = 'border-b border-border text-left text-xs text-muted'
  const row = 'border-b border-border last:border-0 hover:bg-bg'

  return (
    <div>
      <PageHeader title="Market & Instruments" subtitle="Instrument list from the stocks table" />
      <div className="p-6 space-y-6">
        {error && (
          <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard label="Total instruments" value={data ? (Number(data.totalAll) || 0).toLocaleString('en-IN') : '-'} tone="brand" />
            <StatCard label="Exchanges" value={data ? data.exchanges.length : '-'} />
            <StatCard label="Sectors" value={data ? data.sectors.length : '-'} />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Filters</h2>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search symbol or company..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`${inputCls} w-72`}
            />
            <select
              value={exchange}
              onChange={(e) => {
                setExchange(e.target.value)
                setOffset(0)
              }}
              className={inputCls}
            >
              <option value="">All exchanges</option>
              {data?.exchanges.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <select
              value={sector}
              onChange={(e) => {
                setSector(e.target.value)
                setOffset(0)
              }}
              className={inputCls}
            >
              <option value="">All sectors</option>
              {data?.sectors.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-ink">
              Instruments {data ? `(${from}-${to} of ${total.toLocaleString('en-IN')})` : ''}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0 || loading}
                className="rounded border border-border-strong bg-white px-3 py-1.5 text-xs text-ink hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <button
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= total || loading}
                className="rounded border border-border-strong bg-white px-3 py-1.5 text-xs text-ink hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
          <div className={wrap}>
            <table className="w-full text-sm">
              <thead>
                <tr className={head}>
                  <th className={th}>Symbol</th>
                  <th className={th}>Company name</th>
                  <th className={th}>Sector</th>
                  <th className={th}>Exchange</th>
                  <th className={th}>Added</th>
                  <th className={`${th} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {!data && loading && <Empty cols={6} text="Loading..." />}
                {data?.instruments.length === 0 && <Empty cols={6} text="No instruments match the current filters." />}
                {data?.instruments.map((r) => (
                  <tr key={r.id} className={row}>
                    <td className="px-4 py-2.5 text-ink font-medium">{r.symbol}</td>
                    <td className="px-4 py-2.5 text-ink">{r.company_name}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{r.sector || '-'}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{r.exchange}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-2.5 text-right space-x-2">
                      {r.id in halted && <span title={halted[r.id]} className="text-xs px-1.5 py-0.5 rounded bg-red-tint text-red">Halted</span>}
                      <button
                        disabled={busy === r.id}
                        onClick={() => toggleHalt(r.id, r.symbol)}
                        className={`text-xs px-2.5 py-1 rounded border disabled:opacity-50 ${r.id in halted ? 'border-border text-ink' : 'border-red/30 text-red'}`}
                      >
                        {r.id in halted ? 'Resume' : 'Halt'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-md px-6 py-6 text-center">
          <p className="text-sm text-muted">
            The stocks table only stores symbol, company, sector and exchange. Market status and holidays are under Market Operations, symbol details under Scrip Master and corporate actions under Corporate Actions. Per-instrument circuit limits are not stored here.
          </p>
        </div>
      </div>
    </div>
  )
}