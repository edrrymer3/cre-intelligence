'use client'

import { useEffect, useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface Contact {
  id: number
  name: string | null
  title: string | null
  linkedin_url: string | null
  email: string | null
  confidence: string | null
}

interface OutreachEmail {
  id: number
  subject: string | null
  body: string
  generated_date: string
  contact: { name: string | null; title: string | null } | null
}

interface Property {
  id: number
  company_id: number | null
  tenant_name: string | null
  property_type: string
  city: string | null
  state: string | null
  sqft: number | null
  lease_expiration_year: number | null
  lease_type: string | null
  opportunity_score: number | null
  trigger_events: string[]
  recommended_action: string | null
  filing_date: string | null
  filing_url: string | null
  notes: string | null
  contacted: boolean
  real_estate_strategy: string | null
  company: { name: string; ticker: string | null } | null
}

type SortKey = keyof Property
type SortDir = 'asc' | 'desc'

const SCORE_COLORS: Record<number, string> = {
  5: 'bg-green-100 text-green-800',
  4: 'bg-blue-100 text-blue-800',
  3: 'bg-yellow-100 text-yellow-800',
  2: 'bg-gray-100 text-gray-600',
  1: 'bg-gray-100 text-gray-400',
}

export default function ProspectsPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [editNotes, setEditNotes] = useState<Record<number, string>>({})
  const [contacts, setContacts] = useState<Record<number, Contact[]>>({})
  const [loadingContacts, setLoadingContacts] = useState<number | null>(null)
  const [outreachEmails, setOutreachEmails] = useState<Record<number, OutreachEmail[]>>({})
  const [generatingOutreach, setGeneratingOutreach] = useState<number | null>(null)
  const [outreachDraft, setOutreachDraft] = useState<Record<number, { subject: string; body: string }>>({})
  const [researchingId, setResearchingId] = useState<number | null>(null)
  const [researchReports, setResearchReports] = useState<Record<number, { report_text: string; opportunity_rating: string; generated_date: string }[]>>({})
  const [linkedinDraft, setLinkedinDraft] = useState<Record<number, { connectionRequest: string; followUp: string }>>({})
  const [generatingLinkedin, setGeneratingLinkedin] = useState<number | null>(null)
  const [priorityScores, setPriorityScores] = useState<Record<number, { score: number; breakdown: string }>>({})

  // Filters
  const [propType, setPropType] = useState('')
  const [expYear, setExpYear] = useState('')
  const [minScore, setMinScore] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [search, setSearch] = useState('')
  const [triggerFilter, setTriggerFilter] = useState('')
  const [hasDocument, setHasDocument] = useState(false)

  // Sort
  const [sortKey, setSortKey] = useState<string>('opportunity_score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    const params = new URLSearchParams()
    if (propType) params.set('type', propType)
    if (minScore) params.set('minScore', minScore)
    if (expYear) params.set('expiringBefore', expYear)
    if (hasDocument) params.set('hasDocument', '1')
    fetch(`/api/properties?${params}`)
      .then((r) => r.json())
      .then((data) => { setProperties(data); setLoading(false) })
  }, [propType, minScore, expYear, hasDocument])

  const allTriggers = useMemo(() => {
    const set = new Set<string>()
    properties.forEach((p) => p.trigger_events?.forEach((t) => set.add(t)))
    return [...set].slice(0, 20)
  }, [properties])

  const allCities = useMemo(() => {
    const set = new Set<string>()
    properties.forEach((p) => { if (p.city) set.add(p.city) })
    return [...set].sort()
  }, [properties])

  const filtered = useMemo(() => {
    let rows = properties
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter((p) =>
        p.company?.name?.toLowerCase().includes(q) ||
        p.tenant_name?.toLowerCase().includes(q)
      )
    }
    if (cityFilter) rows = rows.filter((p) => p.city === cityFilter)
    if (triggerFilter) rows = rows.filter((p) => p.trigger_events?.includes(triggerFilter))
    return [...rows].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey]
      const bv = (b as unknown as Record<string, unknown>)[sortKey]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [properties, search, cityFilter, triggerFilter, sortKey, sortDir])

  // SF expiring by year chart data
  const chartData = useMemo(() => {
    const years: Record<number, number> = {}
    for (let y = 2025; y <= 2030; y++) years[y] = 0
    properties.forEach((p) => {
      const y = p.lease_expiration_year
      if (y && y >= 2025 && y <= 2030) years[y] += p.sqft || 0
    })
    return Object.entries(years).map(([year, sf]) => ({ year, sf: Math.round(sf / 1000) }))
  }, [properties])

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  async function saveNotes(id: number, notes: string) {
    await fetch(`/api/properties/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    setProperties((prev) => prev.map((p) => p.id === id ? { ...p, notes } : p))
  }

  async function toggleContacted(id: number, current: boolean) {
    await fetch(`/api/properties/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacted: !current }),
    })
    setProperties((prev) => prev.map((p) => p.id === id ? { ...p, contacted: !current } : p))
  }

  async function loadContacts(companyId: number) {
    const res = await fetch(`/api/contacts/${companyId}`)
    const data = await res.json()
    setContacts((prev) => ({ ...prev, [companyId]: Array.isArray(data) ? data : [] }))
  }

  async function findContacts(companyId: number) {
    setLoadingContacts(companyId)
    const res = await fetch(`/api/contacts/${companyId}`, { method: 'POST' })
    const data = await res.json()
    setContacts((prev) => ({ ...prev, [companyId]: data.contacts || [] }))
    setLoadingContacts(null)
  }

  async function runDeepResearch(companyId: number) {
    setResearchingId(companyId)
    const res = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId }),
    })
    const data = await res.json()
    setResearchReports((prev) => ({ ...prev, [companyId]: [data, ...(prev[companyId] || [])] }))
    setResearchingId(null)
  }

  async function generateLinkedin(companyId: number, propertyId: number) {
    setGeneratingLinkedin(companyId)
    const res = await fetch('/api/linkedin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId, property_id: propertyId }),
    })
    const data = await res.json()
    setLinkedinDraft((prev) => ({ ...prev, [companyId]: { connectionRequest: data.connectionRequest, followUp: data.followUp } }))
    setGeneratingLinkedin(null)
  }

  async function generateOutreach(companyId: number, propertyId: number) {
    setGeneratingOutreach(companyId)
    const res = await fetch('/api/outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId, property_id: propertyId }),
    })
    const data = await res.json()
    setOutreachDraft((prev) => ({ ...prev, [companyId]: { subject: data.subject || '', body: data.body || '' } }))
    // Reload history
    const hist = await fetch(`/api/outreach?company_id=${companyId}`).then((r) => r.json())
    setOutreachEmails((prev) => ({ ...prev, [companyId]: Array.isArray(hist) ? hist : [] }))
    setGeneratingOutreach(null)
  }

  const SortHeader = ({ label, field }: { label: string; field: string }) => (
    <th
      onClick={() => toggleSort(field)}
      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-800 select-none whitespace-nowrap"
    >
      {label} {sortKey === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Tenant Prospects</h1>
        <span className="text-gray-500 text-sm">{filtered.length} properties</span>
      </div>

      {/* Chart */}
      {chartData.some((d) => d.sf > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">SF Expiring by Year (thousands)</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${v}k SF`, 'Expiring']} />
              <Bar dataKey="sf" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-52"
        />
        <select
          value={propType}
          onChange={(e) => setPropType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">All Types</option>
          <option value="office">Office</option>
          <option value="industrial">Industrial</option>
        </select>
        <select
          value={expYear}
          onChange={(e) => setExpYear(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">Any Expiration</option>
          <option value="2025">Expiring ≤ 2025</option>
          <option value="2026">Expiring ≤ 2026</option>
          <option value="2027">Expiring ≤ 2027</option>
          <option value="2028">Expiring ≤ 2028</option>
        </select>
        <select
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">Any Score</option>
          <option value="3">Score 3+</option>
          <option value="4">Score 4+</option>
          <option value="5">Score 5 only</option>
        </select>
        {allCities.length > 0 && (
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">All Cities</option>
            {allCities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {allTriggers.length > 0 && (
          <select
            value={triggerFilter}
            onChange={(e) => setTriggerFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">All Triggers</option>
            {allTriggers.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <button
          onClick={() => setHasDocument((v) => !v)}
          className={`text-sm px-3 py-2 rounded-lg border transition font-medium ${
            hasDocument
              ? 'bg-blue-600 text-white border-blue-600'
              : 'border-gray-300 text-gray-600 hover:border-blue-400'
          }`}
        >
          📄 Has OM / Rent Roll
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <SortHeader label="Company" field="tenant_name" />
                <SortHeader label="Ticker" field="company" />
                <SortHeader label="Type" field="property_type" />
                <SortHeader label="City" field="city" />
                <SortHeader label="SF" field="sqft" />
                <SortHeader label="Exp. Year" field="lease_expiration_year" />
                <SortHeader label="Score" field="opportunity_score" />
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Triggers</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                <SortHeader label="Filing Date" field="filing_date" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">No properties found. Run the extraction script to populate.</td></tr>
              ) : (
                filtered.map((p) => (
                  <>
                    <tr
                      key={p.id}
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      className={`hover:bg-gray-50 cursor-pointer transition ${p.contacted ? 'opacity-60' : ''}`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 text-sm">
                        {p.company?.name || p.tenant_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{p.company?.ticker || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.property_type === 'office' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {p.property_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.city || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.sqft ? p.sqft.toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.lease_expiration_year || '—'}</td>
                      <td className="px-4 py-3">
                        {p.opportunity_score ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${SCORE_COLORS[p.opportunity_score] || 'bg-gray-100 text-gray-600'}`}>
                            {p.opportunity_score}/5
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {p.trigger_events?.slice(0, 2).map((t, i) => (
                            <span key={i} className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded">
                              {t.length > 25 ? t.slice(0, 25) + '…' : t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate">{p.recommended_action || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {p.filing_date ? new Date(p.filing_date).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                    {expandedId === p.id && (
                      <tr key={`${p.id}-expanded`} className="bg-blue-50 border-b border-blue-100">
                        <td colSpan={10} className="px-6 py-5">
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <h3 className="text-sm font-semibold text-gray-700 mb-2">AI Summary</h3>
                              <p className="text-sm text-gray-600">{p.real_estate_strategy || 'No summary available.'}</p>
                              {p.trigger_events?.length > 0 && (
                                <div className="mt-3">
                                  <span className="text-xs font-semibold text-gray-500 uppercase">Trigger Events</span>
                                  <ul className="mt-1 space-y-1">
                                    {p.trigger_events.map((t, i) => (
                                      <li key={i} className="text-sm text-gray-600">• {t}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {p.filing_url && (
                                <a
                                  href={p.filing_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-3 inline-block text-sm text-blue-600 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View EDGAR Filing →
                                </a>
                              )}
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
                              <textarea
                                value={editNotes[p.id] ?? p.notes ?? ''}
                                onChange={(e) => setEditNotes((prev) => ({ ...prev, [p.id]: e.target.value }))}
                                onClick={(e) => e.stopPropagation()}
                                rows={3}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                                placeholder="Add notes..."
                              />
                              <div className="flex items-center gap-3 mt-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); saveNotes(p.id, editNotes[p.id] ?? p.notes ?? '') }}
                                  className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
                                >
                                  Save Notes
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleContacted(p.id, p.contacted) }}
                                  className={`text-sm px-3 py-1.5 rounded-lg border transition ${
                                    p.contacted
                                      ? 'border-green-400 text-green-700 bg-green-50'
                                      : 'border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700'
                                  }`}
                                >
                                  {p.contacted ? '✓ Contacted' : 'Mark as Contacted'}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Priority Score */}
                          {p.company_id && priorityScores[p.company_id] && (
                            <div className="mt-3 mb-1">
                              <span className="text-xs text-gray-500">Priority Score: </span>
                              <span className="text-sm font-bold text-blue-700">{priorityScores[p.company_id].score}/100</span>
                              <span className="text-xs text-gray-400 ml-2">{priorityScores[p.company_id].breakdown}</span>
                            </div>
                          )}

                          {/* Contacts + Outreach section */}
                          {p.company_id && (
                            <div className="mt-5 pt-5 border-t border-blue-200">
                              <div className="grid grid-cols-2 gap-6">
                                {/* Contacts */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-gray-700">Contacts</h3>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); if (!contacts[p.company_id!]) loadContacts(p.company_id!); findContacts(p.company_id!) }}
                                      disabled={loadingContacts === p.company_id}
                                      className="text-xs border border-blue-300 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50 transition disabled:opacity-50"
                                    >
                                      {loadingContacts === p.company_id ? '⏳ Finding…' : '🔎 Find Contacts'}
                                    </button>
                                  </div>
                                  {contacts[p.company_id!]?.length > 0 ? (
                                    <div className="space-y-2">
                                      {contacts[p.company_id!].map((c) => (
                                        <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-3">
                                          <div className="font-medium text-gray-900 text-sm">{c.name || '—'}</div>
                                          <div className="text-xs text-gray-500 mb-1">{c.title}</div>
                                          <div className="flex gap-3 text-xs">
                                            {c.email && <span className="text-blue-600">{c.email}</span>}
                                            {c.linkedin_url && (
                                              <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-blue-500 hover:underline">LinkedIn →</a>
                                            )}
                                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                                              c.confidence === 'high' ? 'bg-green-100 text-green-700' :
                                              c.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                              'bg-gray-100 text-gray-500'
                                            }`}>{c.confidence}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-400">No contacts yet. Click Find Contacts.</p>
                                  )}
                                </div>

                                {/* Outreach Generator */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-gray-700">Generate Outreach</h3>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); generateOutreach(p.company_id!, p.id) }}
                                      disabled={generatingOutreach === p.company_id}
                                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                                    >
                                      {generatingOutreach === p.company_id ? '🤖 Writing…' : '✍️ Generate'}
                                    </button>
                                  </div>
                                  {outreachDraft[p.company_id!] && (
                                    <div className="space-y-2">
                                      <input
                                        type="text"
                                        value={outreachDraft[p.company_id!].subject}
                                        onChange={(e) => setOutreachDraft((prev) => ({ ...prev, [p.company_id!]: { ...prev[p.company_id!], subject: e.target.value } }))}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-medium"
                                        placeholder="Subject line"
                                      />
                                      <textarea
                                        value={outreachDraft[p.company_id!].body}
                                        onChange={(e) => setOutreachDraft((prev) => ({ ...prev, [p.company_id!]: { ...prev[p.company_id!], body: e.target.value } }))}
                                        onClick={(e) => e.stopPropagation()}
                                        rows={5}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 resize-none"
                                      />
                                      <button
                                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(outreachDraft[p.company_id!].body) }}
                                        className="text-xs border border-gray-300 text-gray-600 px-3 py-1 rounded-lg hover:border-blue-400 hover:text-blue-600 transition"
                                      >
                                        Copy Body
                                      </button>
                                    </div>
                                  )}
                                  {outreachEmails[p.company_id!]?.length > 0 && (
                                    <div className="mt-3">
                                      <p className="text-xs text-gray-400 mb-1">Previous emails ({outreachEmails[p.company_id!].length})</p>
                                      {outreachEmails[p.company_id!].slice(0, 2).map((e) => (
                                        <div key={e.id} className="text-xs text-gray-500 bg-gray-50 rounded p-2 mt-1">
                                          <span className="font-medium">{new Date(e.generated_date).toLocaleDateString()}</span>
                                          {e.contact && <span className="ml-2">→ {e.contact.name}</span>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* LinkedIn Messages */}
                              <div className="mt-5 pt-4 border-t border-blue-200">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="text-sm font-semibold text-gray-700">💼 LinkedIn Messages</h3>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); generateLinkedin(p.company_id!, p.id) }}
                                    disabled={generatingLinkedin === p.company_id}
                                    className="text-xs bg-blue-700 text-white px-2 py-1 rounded-lg hover:bg-blue-800 transition disabled:opacity-50"
                                  >
                                    {generatingLinkedin === p.company_id ? '⏳ Generating…' : 'Generate LinkedIn'}
                                  </button>
                                </div>
                                {linkedinDraft[p.company_id!] && (
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <p className="text-xs font-medium text-gray-500 mb-1">Connection Request (300 char max)</p>
                                      <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs resize-none"
                                        value={linkedinDraft[p.company_id!].connectionRequest}
                                        onChange={(e) => setLinkedinDraft((prev) => ({ ...prev, [p.company_id!]: { ...prev[p.company_id!], connectionRequest: e.target.value } }))}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(linkedinDraft[p.company_id!].connectionRequest) }}
                                        className="text-xs border border-gray-300 text-gray-600 px-2 py-1 rounded-lg hover:border-blue-400 transition mt-1">Copy</button>
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-gray-500 mb-1">Follow-up Message (500 char max)</p>
                                      <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs resize-none"
                                        value={linkedinDraft[p.company_id!].followUp}
                                        onChange={(e) => setLinkedinDraft((prev) => ({ ...prev, [p.company_id!]: { ...prev[p.company_id!], followUp: e.target.value } }))}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(linkedinDraft[p.company_id!].followUp) }}
                                        className="text-xs border border-gray-300 text-gray-600 px-2 py-1 rounded-lg hover:border-blue-400 transition mt-1">Copy</button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Deep Research */}
                              <div className="mt-4 pt-4 border-t border-blue-200">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="text-sm font-semibold text-gray-700">🔬 Deep Research</h3>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); runDeepResearch(p.company_id!) }}
                                    disabled={researchingId === p.company_id}
                                    className="text-xs bg-gray-800 text-white px-2 py-1 rounded-lg hover:bg-gray-900 transition disabled:opacity-50"
                                  >
                                    {researchingId === p.company_id ? '⏳ Researching…' : '🔬 Run Research'}
                                  </button>
                                </div>
                                {researchReports[p.company_id!]?.map((r) => (
                                  <div key={r.generated_date} className="bg-white rounded-lg border border-gray-200 p-3 mb-2">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                        r.opportunity_rating === 'Hot' ? 'bg-red-100 text-red-700' :
                                        r.opportunity_rating === 'Warm' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-blue-100 text-blue-700'
                                      }`}>{r.opportunity_rating}</span>
                                      <span className="text-xs text-gray-400">{new Date(r.generated_date).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-6">{r.report_text}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
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
