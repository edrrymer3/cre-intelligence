'use client'

import { useEffect, useState, useMemo } from 'react'

interface Property {
  id: number
  tenant_name: string | null
  property_type: string
  city: string | null
  state: string | null
  sqft: number | null
  lease_expiration_year: number | null
  percent_of_building: number | null
  occupancy_trend: string | null
  filing_date: string | null
  filing_url: string | null
  notes: string | null
  reit: { name: string; ticker: string | null } | null
}

type SortDir = 'asc' | 'desc'

export default function REITWatchlistPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Filters
  const [propType, setPropType] = useState('')
  const [expYear, setExpYear] = useState('')
  const [reitFilter, setReitFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [sfRange, setSfRange] = useState('')
  const [search, setSearch] = useState('')

  // Sort
  const [sortKey, setSortKey] = useState('lease_expiration_year')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  useEffect(() => {
    const params = new URLSearchParams()
    if (propType) params.set('type', propType)
    if (expYear) params.set('expiringBefore', expYear)
    // Only REIT properties (no company_id, has reit_id)
    fetch(`/api/properties/reits?${params}`)
      .then((r) => r.json())
      .then((data) => { setProperties(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [propType, expYear])

  const reits = useMemo(() => [...new Set(properties.map((p) => p.reit?.name).filter(Boolean))].sort(), [properties])
  const cities = useMemo(() => [...new Set(properties.map((p) => p.city).filter(Boolean))].sort(), [properties])

  const filtered = useMemo(() => {
    let rows = properties
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter((p) => p.tenant_name?.toLowerCase().includes(q) || p.reit?.name?.toLowerCase().includes(q))
    }
    if (reitFilter) rows = rows.filter((p) => p.reit?.name === reitFilter)
    if (cityFilter) rows = rows.filter((p) => p.city === cityFilter)
    if (sfRange === '<50k') rows = rows.filter((p) => p.sqft !== null && p.sqft < 50000)
    if (sfRange === '50-200k') rows = rows.filter((p) => p.sqft !== null && p.sqft >= 50000 && p.sqft <= 200000)
    if (sfRange === '200k+') rows = rows.filter((p) => p.sqft !== null && p.sqft > 200000)

    return [...rows].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey]
      const bv = (b as unknown as Record<string, unknown>)[sortKey]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [properties, search, reitFilter, cityFilter, sfRange, sortKey, sortDir])

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortHeader = ({ label, field }: { label: string; field: string }) => (
    <th
      onClick={() => toggleSort(field)}
      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-800 select-none whitespace-nowrap"
    >
      {label} {sortKey === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )

  const trendColor = (trend: string | null) => {
    if (trend === 'Improving') return 'text-green-600'
    if (trend === 'Declining') return 'text-red-500'
    return 'text-gray-500'
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">REIT Watchlist</h1>
        <span className="text-gray-500 text-sm">{filtered.length} properties</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search tenant / REIT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-52"
        />
        <select value={propType} onChange={(e) => setPropType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
          <option value="">All Types</option>
          <option value="office">Office</option>
          <option value="industrial">Industrial</option>
        </select>
        <select value={expYear} onChange={(e) => setExpYear(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
          <option value="">Any Expiration</option>
          <option value="2025">≤ 2025</option>
          <option value="2026">≤ 2026</option>
          <option value="2027">≤ 2027</option>
          <option value="2028">≤ 2028</option>
        </select>
        {reits.length > 0 && (
          <select value={reitFilter} onChange={(e) => setReitFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 max-w-[200px]">
            <option value="">All REITs</option>
            {reits.map((r) => <option key={r as string} value={r as string}>{r}</option>)}
          </select>
        )}
        {cities.length > 0 && (
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
            <option value="">All Cities</option>
            {cities.map((c) => <option key={c as string} value={c as string}>{c}</option>)}
          </select>
        )}
        <select value={sfRange} onChange={(e) => setSfRange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
          <option value="">Any Size</option>
          <option value="<50k">&lt; 50k SF</option>
          <option value="50-200k">50k – 200k SF</option>
          <option value="200k+">200k+ SF</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <SortHeader label="Tenant" field="tenant_name" />
                <SortHeader label="REIT" field="reit" />
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Property</th>
                <SortHeader label="City" field="city" />
                <SortHeader label="SF" field="sqft" />
                <SortHeader label="Exp. Year" field="lease_expiration_year" />
                <SortHeader label="% of Bldg" field="percent_of_building" />
                <SortHeader label="Occupancy" field="occupancy_trend" />
                <SortHeader label="Filing Date" field="filing_date" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">No REIT properties found. Run the discovery and extraction scripts.</td></tr>
              ) : (
                filtered.map((p) => (
                  <>
                    <tr
                      key={p.id}
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      className="hover:bg-gray-50 cursor-pointer transition"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 text-sm">{p.tenant_name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.reit?.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-[160px] truncate">{p.notes || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.city || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.sqft ? p.sqft.toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.lease_expiration_year || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.percent_of_building ? `${p.percent_of_building}%` : '—'}</td>
                      <td className={`px-4 py-3 text-sm font-medium ${trendColor(p.occupancy_trend)}`}>
                        {p.occupancy_trend || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {p.filing_date ? new Date(p.filing_date).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                    {expandedId === p.id && (
                      <tr key={`${p.id}-exp`} className="bg-blue-50">
                        <td colSpan={9} className="px-6 py-4">
                          <div className="text-sm text-gray-600">
                            {p.notes && <p className="mb-2"><strong>Property:</strong> {p.notes}</p>}
                            {p.filing_url && (
                              <a href={p.filing_url} target="_blank" rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                                onClick={(e) => e.stopPropagation()}>
                                View EDGAR Filing →
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
