import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import PageHeader from '../components/PageHeader'

interface IpoRow {
  id: string
  company_name: string
  price_band_low: number
  price_band_high: number
  lot_size: number
  issue_size: string
  open_date: string
  close_date: string
  status: string
  applications: number
}

const empty = { company_name: '', price_band_low: '', price_band_high: '', lot_size: '', issue_size: '', open_date: '', close_date: '', status: 'upcoming' }

export default function Ipos() {
  const [rows, setRows] = useState<IpoRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  const load = () =>
    api
      .get<{ ipos: IpoRow[] }>('/admin/ipos')
      .then((r) => setRows(r.ipos ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load IPOs'))

  useEffect(() => {
    load()
  }, [])

  const create = async () => {
    setError(null)
    const low = Number(form.price_band_low), high = Number(form.price_band_high), lot = Number(form.lot_size)
    const verr = !form.company_name.trim() ? 'Company name is required'
      : !(low > 0) || !(high > 0) ? 'Price band values must be greater than 0'
      : low > high ? 'Price low cannot be above price high'
      : !(lot > 0) || !Number.isInteger(lot) ? 'Lot size must be a whole number greater than 0'
      : !form.open_date || !form.close_date ? 'Open and close dates are required'
      : form.close_date < form.open_date ? 'Close date cannot be before open date'
      : null
    if (verr) {
      setError(verr)
      return
    }
    setSaving(true)
    try {
      await api.post('/admin/ipos', {
        company_name: form.company_name.trim(),
        price_band_low: Number(form.price_band_low),
        price_band_high: Number(form.price_band_high),
        lot_size: Number(form.lot_size),
        issue_size: form.issue_size,
        open_date: form.open_date,
        close_date: form.close_date,
        status: form.status,
      })
      setForm(empty)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create IPO')
    } finally {
      setSaving(false)
    }
  }

  const [statusBusy, setStatusBusy] = useState<string | null>(null)
  const setStatus = async (id: string, status: string) => {
    if (statusBusy) return
    if (!window.confirm(`Change this IPO status to "${status}"? This is visible to users immediately.`)) return
    setStatusBusy(id)
    setError(null)
    try {
      await api.post(`/admin/ipos/${id}/status`, { status })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status')
    } finally {
      setStatusBusy(null)
    }
  }
  const input = 'rounded border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand'
  const f = (k: keyof typeof empty) => ({ value: form[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value }) })

  return (
    <div>
      <PageHeader title="IPOs" subtitle="Create IPOs and control their status" />
      <div className="p-6 space-y-4">
        {error && <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">{error}</div>}

        <div className="bg-surface border border-border rounded-md p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <input className={input} placeholder="Company name" {...f('company_name')} />
          <input className={input} placeholder="Price low" type="number" {...f('price_band_low')} />
          <input className={input} placeholder="Price high" type="number" {...f('price_band_high')} />
          <input className={input} placeholder="Lot size" type="number" {...f('lot_size')} />
          <input className={input} placeholder="Issue size (e.g. Rs 500 Cr)" {...f('issue_size')} />
          <input className={input} type="date" title="Open date" {...f('open_date')} />
          <input className={input} type="date" title="Close date" {...f('close_date')} />
          <select className={input} {...f('status')}>
            <option value="upcoming">upcoming</option>
            <option value="open">open</option>
            <option value="closed">closed</option>
            <option value="listed">listed</option>
          </select>
          <button disabled={saving} onClick={create} className="text-sm px-3 py-2 rounded bg-ink text-white disabled:opacity-50">
            {saving ? 'Saving...' : 'Create IPO'}
          </button>
        </div>

        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">Company</th>
                <th className="px-4 py-2.5 font-medium">Price band</th>
                <th className="px-4 py-2.5 font-medium">Lot</th>
                <th className="px-4 py-2.5 font-medium">Open</th>
                <th className="px-4 py-2.5 font-medium">Close</th>
                <th className="px-4 py-2.5 font-medium text-right">Applications</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows === null && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-muted text-xs">Loading...</td></tr>
              )}
              {rows?.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-muted text-xs">No IPOs yet.</td></tr>
              )}
              {rows?.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-bg">
                  <td className="px-4 py-2.5 text-ink font-medium">{r.company_name}</td>
                  <td className="px-4 py-2.5 text-muted">{r.price_band_low} - {r.price_band_high}</td>
                  <td className="px-4 py-2.5 text-muted">{r.lot_size}</td>
                  <td className="px-4 py-2.5 text-muted text-xs">{r.open_date}</td>
                  <td className="px-4 py-2.5 text-muted text-xs">{r.close_date}</td>
                  <td className="px-4 py-2.5 text-right tabular">{r.applications}</td>
                  <td className="px-4 py-2.5">
                    <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)} disabled={statusBusy !== null} className="text-xs rounded border border-border px-2 py-1 disabled:opacity-50">
                      <option value="upcoming">upcoming</option>
                      <option value="open">open</option>
                      <option value="closed">closed</option>
                      <option value="listed">listed</option>
                    </select>
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