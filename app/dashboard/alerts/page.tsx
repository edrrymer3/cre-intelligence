'use client'

import { useEffect, useState, useMemo } from 'react'

interface Alert {
  id: number
  alert_type: string
  summary: string
  filing_date: string
  filing_url: string | null
  reviewed: boolean
  company: { name: string; ticker: string | null }
}

type SortDir = 'asc' | 'desc'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateRange, setDateRange] = useState('')
  const [sortKey, setSortKey] = useState('filing_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    fetch('/api/alerts')
      .then((r) => r.json())
      .then((data) => { setAlerts(data); setLoading(false) })
  }, [])

  const alertTypes = useMemo(() => [...new Set(alerts.map((a) => a.alert_type))].sort(), [alerts])

  const filtered = useMemo(() => {
    let rows = alerts
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter((a) => a.company.name.toLowerCase().includes(q))
    }
    if (typeFilter) rows = rows.filter((a) => a.alert_type === typeFilter)
    if (dateRange) {
      const days = parseInt(dateRange)
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)
      rows = rows.filter((a) => new Date(a.filing_date) >= cutoff)
    }
    return [...rows].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey]
      const bv = (b as unknown as Record<string, unknown>)[sortKey]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      const cmp = String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [alerts, search, typeFilter, dateRange, sortKey, sortDir])

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  async function markReviewed(id: number) {
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  const SortHeader = ({ label, field }: { label: string; field: string }) => (
    <th onClick={() => toggleSort(field)}
      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-800 select-none whitespace-nowrap">
      {label} {sortKey === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">8-K Alerts</h1>
        <span className="text-gray-500 text-sm">{filtered.length} unreviewed</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input type="text" placeholder="Search company..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-52" />
        {alertTypes.length > 0 && (
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
            <option value="">All Types</option>
            {alertTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
          <option value="">All Dates</option>
          <option value="30">Last 30 days</option>
          <option value="60">Last 60 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <SortHeader label="Company" field="company" />
              <SortHeader label="Alert Type" field="alert_type" />
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Summary</th>
              <SortHeader label="Filing Date" field="filing_date" />
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reviewed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">
                {alerts.length === 0 ? 'No alerts yet. Run the extraction script to populate.' : 'No alerts match your filters.'}
              </td></tr>
            ) : (
              filtered.map((alert) => (
                <tr key={alert.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 text-sm">{alert.company.name}</div>
                    {alert.company.ticker && <div className="text-xs font-mono text-gray-400">{alert.company.ticker}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      {alert.alert_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-sm">
                    <p className="line-clamp-2">{alert.summary}</p>
                    {alert.filing_url && (
                      <a href={alert.filing_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline mt-1 inline-block">
                        View Filing →
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(alert.filing_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => markReviewed(alert.id)}
                      className="text-xs border border-gray-300 hover:border-green-400 hover:text-green-700 text-gray-500 px-3 py-1.5 rounded-lg transition">
                      Mark Reviewed
                    </button>
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
