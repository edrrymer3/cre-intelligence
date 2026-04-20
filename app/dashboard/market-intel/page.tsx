'use client'

import { useEffect, useState } from 'react'

interface MarketIntel {
  id: number
  headline: string
  summary: string
  category: string
  relevance_score: number
  source_url: string | null
  published_date: string | null
  added_date: string
  reviewed: boolean
}

const CAT_COLORS: Record<string, string> = {
  office: 'bg-blue-100 text-blue-700',
  industrial: 'bg-orange-100 text-orange-700',
  relocation: 'bg-green-100 text-green-700',
  restructuring: 'bg-red-100 text-red-700',
  investment: 'bg-purple-100 text-purple-700',
}

const SCORE_COLORS: Record<number, string> = {
  5: 'bg-green-100 text-green-800 font-bold',
  4: 'bg-blue-100 text-blue-800 font-semibold',
  3: 'bg-yellow-100 text-yellow-800',
  2: 'bg-gray-100 text-gray-600',
  1: 'bg-gray-50 text-gray-400',
}

export default function MarketIntelPage() {
  const [items, setItems] = useState<MarketIntel[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const limit = 25

  // Filters
  const [category, setCategory] = useState('')
  const [minScore, setMinScore] = useState('')
  const [days, setDays] = useState('')
  const [showReviewed, setShowReviewed] = useState(false)

  useEffect(() => { load() }, [page, category, minScore, days, showReviewed])

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (category) params.set('category', category)
    if (minScore) params.set('minScore', minScore)
    if (days) params.set('days', days)
    if (!showReviewed) params.set('reviewed', '0')
    const res = await fetch(`/api/market-intel?${params}`)
    const data = await res.json()
    setItems(data.items || [])
    setTotal(data.total || 0)
    setLoading(false)
  }

  async function markReviewed(id: number) {
    await fetch('/api/market-intel', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, reviewed: true }),
    })
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Market Intelligence</h1>
        <span className="text-gray-500 text-sm">{total} items</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
          <option value="">All Categories</option>
          {['office', 'industrial', 'relocation', 'restructuring', 'investment'].map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
        <select value={minScore} onChange={(e) => { setMinScore(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
          <option value="">Any Score</option>
          <option value="3">Score 3+</option>
          <option value="4">Score 4+</option>
          <option value="5">Score 5 only</option>
        </select>
        <select value={days} onChange={(e) => { setDays(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
          <option value="">All Time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <button onClick={() => setShowReviewed(!showReviewed)}
          className={`text-sm px-3 py-2 rounded-lg border transition ${showReviewed ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-300 text-gray-600'}`}>
          {showReviewed ? 'All items' : 'Unreviewed only'}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Headline</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Score</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reviewed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">
                No market intel yet. Run the Market Intelligence script from Admin panel.
              </td></tr>
            ) : (
              items.map((item) => (
                <>
                  <tr key={item.id} onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="hover:bg-gray-50 cursor-pointer transition">
                    <td className="px-4 py-3 font-medium text-gray-900 text-sm max-w-md">{item.headline}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${CAT_COLORS[item.category] || 'bg-gray-100 text-gray-600'}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${SCORE_COLORS[item.relevance_score] || 'bg-gray-100'}`}>
                        {item.relevance_score}/5
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {item.published_date ? new Date(item.published_date).toLocaleDateString() : new Date(item.added_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.reviewed ? (
                        <span className="text-xs text-green-600 font-medium">✓</span>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); markReviewed(item.id) }}
                          className="text-xs border border-gray-200 hover:border-green-400 hover:text-green-700 text-gray-500 px-2 py-1 rounded-lg transition">
                          Mark Read
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === item.id && (
                    <tr key={`${item.id}-exp`} className="bg-blue-50">
                      <td colSpan={5} className="px-6 py-4">
                        <p className="text-sm text-gray-700 leading-relaxed mb-2">{item.summary}</p>
                        {item.source_url && (
                          <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline">View Source →</a>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">← Prev</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
