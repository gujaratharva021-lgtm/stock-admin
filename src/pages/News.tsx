import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import PageHeader from '../components/PageHeader'

interface NewsRow {
  id: string
  title: string
  source: string | null
  published_at: string
}

export default function News() {
  const [rows, setRows] = useState<NewsRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [source, setSource] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = () =>
    api
      .get<{ news: NewsRow[] }>('/news')
      .then((r) => setRows(r.news))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load news'))

  useEffect(() => {
    load()
  }, [])

  const create = async () => {
    if (saving) return
    if (!title.trim()) { setError('Title is required'); return }
    if (!content.trim()) { setError('Content is required'); return }
    setError(null)
    setSaving(true)
    try {
      await api.post('/admin/news', { title: title.trim(), content: content.trim(), source: source.trim() })
      setTitle('')
      setContent('')
      setSource('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post news')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (r: NewsRow) => {
    if (deletingId) return
    if (!window.confirm(`Delete "${r.title}"?`)) return
    setDeletingId(r.id)
    setError(null)
    try {
      await api.delete(`/admin/news/${r.id}`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  const input = 'w-full rounded border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand'

  return (
    <div>
      <PageHeader title="News" subtitle="Post and remove news shown in the app" />
      <div className="p-6 space-y-4">
        {error && <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">{error}</div>}

        <div className="bg-surface border border-border rounded-md p-4 space-y-3 max-w-2xl">
          <input className={input} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className={input} rows={3} placeholder="Content" value={content} onChange={(e) => setContent(e.target.value)} />
          <input className={input} placeholder="Source (optional)" value={source} onChange={(e) => setSource(e.target.value)} />
          <button disabled={saving || !title.trim() || !content.trim()} onClick={create} className="text-sm px-3 py-2 rounded bg-ink text-white disabled:opacity-50">
            {saving ? 'Posting...' : 'Post news'}
          </button>
        </div>

        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">Title</th>
                <th className="px-4 py-2.5 font-medium">Source</th>
                <th className="px-4 py-2.5 font-medium">Published</th>
                <th className="px-4 py-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows === null && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted text-xs">Loading...</td></tr>
              )}
              {rows?.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted text-xs">No news.</td></tr>
              )}
              {rows?.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-bg">
                  <td className="px-4 py-2.5 text-ink">{r.title}</td>
                  <td className="px-4 py-2.5 text-muted text-xs">{r.source ?? '-'}</td>
                  <td className="px-4 py-2.5 text-muted text-xs">{new Date(r.published_at).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button disabled={deletingId !== null} onClick={() => remove(r)} className="text-xs px-2.5 py-1 rounded border border-red/30 text-red disabled:opacity-50">Delete</button>
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