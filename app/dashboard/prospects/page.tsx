'use client'

import { useEffect, useState } from 'react'

interface Company {
  id: number
  name: string
  ticker: string | null
  hq_state: string | null
  hq_city: string | null
  source: string
  notes: string | null
  _count: { properties: number; alerts: number }
}

export default function ProspectsPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [state, setState] = useState('')

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (state) params.set('state', state)
    const res = await fetch(`/api/companies?${params}`)
    const data = await res.json()
    setCompanies(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    load()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Prospects</h1>
        <span className="text-gray-500 text-sm">{companies.length} companies</span>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 w-64"
        />
        <input
          type="text"
          placeholder="State (e.g. MN)"
          value={state}
          onChange={(e) => setState(e.target.value.toUpperCase())}
          maxLength={2}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 w-32"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
        >
          Search
        </button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticker</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
              <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Properties</th>
              <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Alerts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading...</td></tr>
            ) : companies.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No prospects found. Run the discovery script to populate.</td></tr>
            ) : (
              companies.map((co) => (
                <tr key={co.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{co.name}</div>
                    {co.notes && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{co.notes}</div>}
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-mono text-sm">{co.ticker || '—'}</td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    {[co.hq_city, co.hq_state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{co.source}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-sm font-medium ${co._count.properties > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {co._count.properties}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-sm font-medium ${co._count.alerts > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {co._count.alerts}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
