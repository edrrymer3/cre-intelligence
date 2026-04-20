'use client'

import { useEffect, useState, useMemo } from 'react'

interface Company {
  id: number
  name: string
  ticker: string | null
  cik: string
  source: string
  hq_state: string | null
  hq_city: string | null
  active: boolean
  include_override: boolean
  override_reason: string | null
  notes: string | null
}

export default function WatchlistPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [overrideReasons, setOverrideReasons] = useState<Record<number, string>>({})
  const [savingId, setSavingId] = useState<number | null>(null)

  // Manual add form
  const [form, setForm] = useState({ name: '', ticker: '', cik: '', notes: '', added_by: '' })
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Sort
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/companies?all=1')
      .then((r) => r.json())
      .then((data) => {
        setCompanies(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let rows = companies
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter((c) => c.name.toLowerCase().includes(q) || c.ticker?.toLowerCase().includes(q))
    }
    return [...rows].sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[sortKey] ?? '')
      const bv = String((b as unknown as Record<string, unknown>)[sortKey] ?? '')
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [companies, search, sortKey, sortDir])

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  async function toggleActive(id: number, current: boolean) {
    await fetch(`/api/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !current }),
    })
    setCompanies((prev) => prev.map((c) => c.id === id ? { ...c, active: !current } : c))
  }

  async function saveOverrideReason(id: number) {
    setSavingId(id)
    const reason = overrideReasons[id] ?? ''
    await fetch(`/api/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ override_reason: reason }),
    })
    setCompanies((prev) => prev.map((c) => c.id === id ? { ...c, override_reason: reason } : c))
    setSavingId(null)
  }

  async function handleManualAdd(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    setSubmitting(true)

    try {
      // If no CIK, try EDGAR lookup
      let cik = form.cik.trim()
      if (!cik && form.ticker) {
        const res = await fetch(`https://efts.sec.gov/LATEST/search-index?q="${form.name}"&forms=10-K`, {
          headers: { 'User-Agent': 'CRE Intelligence cre@example.com' }
        })
        const data = await res.json()
        const hit = data.hits?.hits?.[0]
        if (hit?._source?.entity_id) {
          cik = String(hit._source.entity_id).padStart(10, '0')
        }
      }

      if (!cik) {
        setFormError('Could not find CIK. Please enter it manually.')
        setSubmitting(false)
        return
      }

      // Verify against EDGAR
      const edgar = await fetch(`https://data.sec.gov/submissions/CIK${cik.padStart(10, '0')}.json`, {
        headers: { 'User-Agent': 'CRE Intelligence cre@example.com' }
      })
      if (!edgar.ok) {
        setFormError('CIK not found on EDGAR. Please verify.')
        setSubmitting(false)
        return
      }
      const edgarData = await edgar.json()
      const filings = edgarData.filings?.recent
      const hasActiveFilings = filings?.filingDate?.length > 0 &&
        new Date(filings.filingDate[0]) >= new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          ticker: form.ticker || null,
          cik: cik.padStart(10, '0'),
          source: 'manual',
          notes: form.notes || null,
          added_by: form.added_by || null,
          active: true,
          hq_state: edgarData.addresses?.business?.stateOrCountry || null,
          hq_city: edgarData.addresses?.business?.city || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setFormError(err.error || 'Failed to save company.')
        setSubmitting(false)
        return
      }

      const saved = await res.json()
      setCompanies((prev) => [saved, ...prev])
      setForm({ name: '', ticker: '', cik: '', notes: '', added_by: '' })
      setFormSuccess(`${saved.name} added successfully.${!hasActiveFilings ? ' ⚠️ No active filings found in past 12 months.' : ''}`)
    } catch (err) {
      setFormError(`Error: ${err}`)
    }
    setSubmitting(false)
  }

  const SortHeader = ({ label, field }: { label: string; field: string }) => (
    <th onClick={() => toggleSort(field)}
      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-800 select-none whitespace-nowrap">
      {label} {sortKey === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Watchlist Manager</h1>

      {/* Section 1 — Auto-Discovered */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-700">Auto-Discovered Companies</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{companies.length} total</span>
            <input type="text" placeholder="Search..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 w-48" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <SortHeader label="Company" field="name" />
                  <SortHeader label="Ticker" field="ticker" />
                  <SortHeader label="CIK" field="cik" />
                  <SortHeader label="Source" field="source" />
                  <SortHeader label="HQ State" field="hq_state" />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Include</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">No companies. Run discovery script.</td></tr>
                ) : (
                  filtered.map((co) => (
                    <>
                      <tr key={co.id} className={`hover:bg-gray-50 transition ${!co.active ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 text-sm">{co.name}</span>
                            {co.include_override && (
                              <span
                                title={co.override_reason || ''}
                                className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-300 px-1.5 py-0.5 rounded cursor-help font-medium"
                              >
                                Manual Override
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{co.ticker || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">{co.cik}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{co.source}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{co.hq_state || '—'}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleActive(co.id, co.active)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${co.active ? 'bg-blue-600' : 'bg-gray-300'}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${co.active ? 'translate-x-4' : 'translate-x-1'}`} />
                          </button>
                        </td>
                      </tr>
                      {co.include_override && (
                        <tr key={`${co.id}-reason`} className="bg-yellow-50">
                          <td colSpan={6} className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-yellow-700 font-medium">Override reason:</span>
                              <input
                                type="text"
                                value={overrideReasons[co.id] ?? co.override_reason ?? ''}
                                onChange={(e) => setOverrideReasons((prev) => ({ ...prev, [co.id]: e.target.value }))}
                                className="flex-1 text-xs border border-yellow-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-yellow-500"
                              />
                              <button
                                onClick={() => saveOverrideReason(co.id)}
                                disabled={savingId === co.id}
                                className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700 transition disabled:opacity-50"
                              >
                                {savingId === co.id ? 'Saving…' : 'Save'}
                              </button>
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

      {/* Section 2 — Manual Add */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Add Company Manually</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <form onSubmit={handleManualAdd} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Company Name *</label>
              <input required type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Ticker</label>
              <input type="text" value={form.ticker} onChange={(e) => setForm((p) => ({ ...p, ticker: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">CIK (auto-lookup if blank)</label>
              <input type="text" value={form.cik} onChange={(e) => setForm((p) => ({ ...p, cik: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Added By</label>
              <input type="text" value={form.added_by} onChange={(e) => setForm((p) => ({ ...p, added_by: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <input type="text" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            {formError && (
              <div className="col-span-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{formError}</div>
            )}
            {formSuccess && (
              <div className="col-span-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-2">{formSuccess}</div>
            )}
            <div className="col-span-2">
              <button type="submit" disabled={submitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50">
                {submitting ? 'Adding…' : 'Add Company'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
