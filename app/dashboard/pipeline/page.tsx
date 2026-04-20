'use client'

import { useEffect, useState, useMemo } from 'react'

interface PipelineItem {
  id: number
  status: string
  notes: string | null
  contact_name: string | null
  contact_title: string | null
  added_date: string
  last_updated: string
  company: { name: string; ticker: string | null }
}

interface Company {
  id: number
  name: string
  ticker: string | null
}

const STATUSES = ['Contacted', 'Meeting Set', 'Proposal', 'Engaged', 'Closed']

const STATUS_COLORS: Record<string, string> = {
  'Contacted': 'bg-blue-50 border-blue-200 text-blue-700',
  'Meeting Set': 'bg-yellow-50 border-yellow-200 text-yellow-700',
  'Proposal': 'bg-purple-50 border-purple-200 text-purple-700',
  'Engaged': 'bg-orange-50 border-orange-200 text-orange-700',
  'Closed': 'bg-green-50 border-green-200 text-green-700',
}

const STATUS_ROW_COLORS: Record<string, string> = {
  'Contacted': 'border-l-4 border-l-blue-400',
  'Meeting Set': 'border-l-4 border-l-yellow-400',
  'Proposal': 'border-l-4 border-l-purple-400',
  'Engaged': 'border-l-4 border-l-orange-400',
  'Closed': 'border-l-4 border-l-green-400',
}

type SortDir = 'asc' | 'desc'

export default function PipelinePage() {
  const [items, setItems] = useState<PipelineItem[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [editNotes, setEditNotes] = useState<Record<number, string>>({})
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null)
  const [sortKey, setSortKey] = useState('last_updated')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Add form
  const [showAddForm, setShowAddForm] = useState(false)
  const [companySearch, setCompanySearch] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null)
  const [newStatus, setNewStatus] = useState('Contacted')
  const [newContact, setNewContact] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/pipeline').then((r) => r.json()),
      fetch('/api/companies').then((r) => r.json()),
    ]).then(([pipe, cos]) => {
      setItems(Array.isArray(pipe) ? pipe : [])
      setCompanies(Array.isArray(cos) ? cos : [])
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    return [...items].sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[sortKey] ?? '')
      const bv = String((b as unknown as Record<string, unknown>)[sortKey] ?? '')
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [items, sortKey, sortDir])

  const matchedCompanies = useMemo(() => {
    if (!companySearch) return []
    const q = companySearch.toLowerCase()
    return companies.filter((c) => c.name.toLowerCase().includes(q) || c.ticker?.toLowerCase().includes(q)).slice(0, 8)
  }, [companies, companySearch])

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  async function updateStatus(id: number, status: string) {
    await fetch('/api/pipeline', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status } : i))
    setEditingStatusId(null)
  }

  async function saveNotes(id: number) {
    const notes = editNotes[id] ?? ''
    await fetch('/api/pipeline', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, notes }),
    })
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, notes } : i))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCompanyId) return
    setAdding(true)
    const res = await fetch('/api/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: selectedCompanyId,
        status: newStatus,
        contact_name: newContact || null,
        contact_title: newTitle || null,
        notes: newNotes || null,
      }),
    })
    const item = await res.json()
    // Refetch to get company relation
    const updated = await fetch('/api/pipeline').then((r) => r.json())
    setItems(Array.isArray(updated) ? updated : [])
    setShowAddForm(false)
    setCompanySearch('')
    setSelectedCompanyId(null)
    setNewContact('')
    setNewTitle('')
    setNewNotes('')
    setAdding(false)
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
        <h1 className="text-2xl font-bold text-gray-900">My Pipeline</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
        >
          + Add Prospect
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Add Prospect to Pipeline</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-3 gap-4">
            <div className="col-span-3 relative">
              <label className="block text-xs font-medium text-gray-500 mb-1">Company *</label>
              <input
                type="text"
                placeholder="Search companies..."
                value={selectedCompanyId
                  ? companies.find((c) => c.id === selectedCompanyId)?.name || companySearch
                  : companySearch}
                onChange={(e) => { setCompanySearch(e.target.value); setSelectedCompanyId(null) }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
              {matchedCompanies.length > 0 && !selectedCompanyId && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                  {matchedCompanies.map((c) => (
                    <button key={c.id} type="button"
                      onClick={() => { setSelectedCompanyId(c.id); setCompanySearch(c.name) }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      {c.ticker && <span className="text-xs text-gray-400 font-mono">{c.ticker}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Contact Name</label>
              <input type="text" value={newContact} onChange={(e) => setNewContact(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Contact Title</label>
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <input type="text" value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div className="col-span-3 flex gap-3">
              <button type="submit" disabled={!selectedCompanyId || adding}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50">
                {adding ? 'Adding…' : 'Add to Pipeline'}
              </button>
              <button type="button" onClick={() => setShowAddForm(false)}
                className="text-gray-500 px-5 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <SortHeader label="Company" field="company" />
                <SortHeader label="Contact" field="contact_name" />
                <SortHeader label="Title" field="contact_title" />
                <SortHeader label="Status" field="status" />
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
                <SortHeader label="Last Updated" field="last_updated" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No pipeline entries. Add a prospect to get started.</td></tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className={`hover:bg-gray-50 ${STATUS_ROW_COLORS[item.status] || ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-sm">{item.company.name}</div>
                      {item.company.ticker && <div className="text-xs font-mono text-gray-400">{item.company.ticker}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.contact_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.contact_title || '—'}</td>
                    <td className="px-4 py-3">
                      {editingStatusId === item.id ? (
                        <select
                          autoFocus
                          defaultValue={item.status}
                          onBlur={(e) => updateStatus(item.id, e.target.value)}
                          onChange={(e) => updateStatus(item.id, e.target.value)}
                          className="border border-blue-400 rounded-lg px-2 py-1 text-sm focus:outline-none"
                        >
                          {STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingStatusId(item.id)}
                          className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100 border-gray-200 text-gray-600'}`}
                        >
                          {item.status} ✎
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editNotes[item.id] ?? item.notes ?? ''}
                        onChange={(e) => setEditNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        onBlur={() => saveNotes(item.id)}
                        className="w-full text-sm text-gray-600 border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none bg-transparent py-0.5"
                        placeholder="Add notes..."
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(item.last_updated).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
