'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'

interface PortfolioLocation {
  id: number
  property_name: string | null
  address: string | null
  city: string | null
  state: string | null
  property_type: string | null
  sqft: number | null
  annual_rent: number | null
  lease_expiration_date: string | null
  lease_type: string | null
  landlord: string | null
  notes: string | null
  company: { name: string; ticker: string | null } | null
}

interface PortfolioClient {
  id: number
  name: string
  industry: string | null
  primary_contact: string | null
  contact_email: string | null
  contact_phone: string | null
  notes: string | null
  added_date: string
  locations: PortfolioLocation[]
  _count: { locations: number }
}

const EXPIRY_COLORS: Record<string, string> = {
  '2025': '#ef4444',
  '2026': '#f97316',
  '2027': '#eab308',
  '2028': '#22c55e',
  '2029': '#3b82f6',
  '2030': '#8b5cf6',
}

const LOC_FIELDS = [
  { key: 'property_name', label: 'Property Name', type: 'text' },
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'state', label: 'State', type: 'text' },
  { key: 'property_type', label: 'Type', type: 'select', options: ['office', 'industrial'] },
  { key: 'sqft', label: 'SF', type: 'number' },
  { key: 'annual_rent', label: 'Annual Rent ($)', type: 'number' },
  { key: 'lease_expiration_date', label: 'Lease Expiration', type: 'date' },
  { key: 'lease_type', label: 'Lease Type', type: 'text' },
  { key: 'landlord', label: 'Landlord', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'text' },
]

export default function PortfolioPage() {
  const [clients, setClients] = useState<PortfolioClient[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  // Add client form
  const [showAddClient, setShowAddClient] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', industry: '', primary_contact: '', contact_email: '', contact_phone: '', notes: '' })
  const [savingClient, setSavingClient] = useState(false)

  // Add location form state per client
  const [addingLocFor, setAddingLocFor] = useState<number | null>(null)
  const [newLoc, setNewLoc] = useState<Record<string, string>>({})
  const [savingLoc, setSavingLoc] = useState(false)

  // Edit location inline
  const [editingLocId, setEditingLocId] = useState<number | null>(null)
  const [editLocData, setEditLocData] = useState<Record<string, string>>({})

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    setLoading(true)
    const data = await fetch('/api/portfolio').then((r) => r.json())
    setClients(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    if (!search) return clients
    const q = search.toLowerCase()
    return clients.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.industry?.toLowerCase().includes(q) ||
      c.primary_contact?.toLowerCase().includes(q)
    )
  }, [clients, search])

  // Timeline chart: SF expiring by year across all clients
  const timelineData = useMemo(() => {
    const years: Record<string, number> = {}
    for (let y = 2025; y <= 2030; y++) years[String(y)] = 0
    clients.forEach((c) =>
      c.locations.forEach((l) => {
        if (l.lease_expiration_date && l.sqft) {
          const y = new Date(l.lease_expiration_date).getFullYear()
          if (y >= 2025 && y <= 2030) years[String(y)] += l.sqft
        }
      })
    )
    return Object.entries(years).map(([year, sf]) => ({ year, sf: Math.round(sf / 1000) }))
  }, [clients])

  // Summary stats
  const stats = useMemo(() => {
    let totalSF = 0, totalRent = 0, totalLocations = 0
    const expiringSoon: PortfolioLocation[] = []
    const cutoff = new Date()
    cutoff.setFullYear(cutoff.getFullYear() + 1)

    clients.forEach((c) =>
      c.locations.forEach((l) => {
        totalLocations++
        totalSF += l.sqft || 0
        totalRent += l.annual_rent || 0
        if (l.lease_expiration_date && new Date(l.lease_expiration_date) <= cutoff) {
          expiringSoon.push(l)
        }
      })
    )
    return { totalSF, totalRent, totalLocations, expiringSoon: expiringSoon.length }
  }, [clients])

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault()
    setSavingClient(true)
    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClient),
    })
    await res.json()
    setShowAddClient(false)
    setNewClient({ name: '', industry: '', primary_contact: '', contact_email: '', contact_phone: '', notes: '' })
    setSavingClient(false)
    loadClients()
  }

  async function handleAddLocation(clientId: number) {
    setSavingLoc(true)
    const payload: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(newLoc)) {
      if (v === '') continue
      if (k === 'sqft' || k === 'annual_rent') payload[k] = parseFloat(v)
      else payload[k] = v
    }
    await fetch(`/api/portfolio/${clientId}/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setAddingLocFor(null)
    setNewLoc({})
    setSavingLoc(false)
    loadClients()
  }

  async function handleSaveLocEdit(clientId: number, locId: number) {
    const payload: Record<string, unknown> = { locId }
    for (const [k, v] of Object.entries(editLocData)) {
      if (k === 'sqft' || k === 'annual_rent') payload[k] = v ? parseFloat(v) : null
      else payload[k] = v || null
    }
    await fetch(`/api/portfolio/${clientId}/locations`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setEditingLocId(null)
    setEditLocData({})
    loadClients()
  }

  async function handleDeleteLocation(clientId: number, locId: number) {
    if (!confirm('Remove this location?')) return
    await fetch(`/api/portfolio/${clientId}/locations`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locId }),
    })
    loadClients()
  }

  async function handleDeleteClient(clientId: number) {
    if (!confirm('Delete this client and all their locations?')) return
    await fetch(`/api/portfolio/${clientId}`, { method: 'DELETE' })
    loadClients()
  }

  function leaseUrgency(dateStr: string | null): string {
    if (!dateStr) return 'text-gray-400'
    const months = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
    if (months < 6) return 'text-red-600 font-semibold'
    if (months < 12) return 'text-orange-500 font-medium'
    if (months < 24) return 'text-yellow-600'
    return 'text-gray-600'
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Portfolio Command Center</h1>
        <div className="flex gap-3">
          <a
            href="/api/portfolio/export"
            className="text-sm border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            ⬇ Export to HubSpot CSV
          </a>
          <button
            onClick={() => setShowAddClient(!showAddClient)}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            + Add Client
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Clients', value: clients.length },
          { label: 'Total Locations', value: stats.totalLocations },
          { label: 'Total SF', value: `${(stats.totalSF / 1000).toFixed(0)}k` },
          { label: 'Expiring < 12 mo', value: stats.expiringSoon, alert: stats.expiringSoon > 0 },
        ].map((s) => (
          <div key={s.label} className={`bg-white rounded-xl border p-5 ${s.alert ? 'border-orange-300' : 'border-gray-200'}`}>
            <div className={`text-2xl font-bold ${s.alert ? 'text-orange-600' : 'text-gray-900'}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Timeline chart */}
      {timelineData.some((d) => d.sf > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">Lease Expirations by Year (SF, thousands)</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${v}k SF`, 'Expiring']} />
              <Bar dataKey="sf" radius={[4, 4, 0, 0]}>
                {timelineData.map((entry) => (
                  <Cell key={entry.year} fill={EXPIRY_COLORS[entry.year] || '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Add client form */}
      {showAddClient && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">New Client</h2>
          <form onSubmit={handleAddClient} className="grid grid-cols-3 gap-4">
            {[
              { key: 'name', label: 'Client Name *', required: true },
              { key: 'industry', label: 'Industry' },
              { key: 'primary_contact', label: 'Primary Contact' },
              { key: 'contact_email', label: 'Email' },
              { key: 'contact_phone', label: 'Phone' },
              { key: 'notes', label: 'Notes' },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                <input
                  required={f.required}
                  type="text"
                  value={(newClient as Record<string, string>)[f.key]}
                  onChange={(e) => setNewClient((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
            <div className="col-span-3 flex gap-3">
              <button type="submit" disabled={savingClient}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50">
                {savingClient ? 'Saving…' : 'Add Client'}
              </button>
              <button type="button" onClick={() => setShowAddClient(false)}
                className="border border-gray-300 text-gray-600 px-5 py-2 rounded-lg text-sm hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <input type="text" placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-64 mb-4" />

      {/* Client list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          No clients yet. Add one above.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((client) => {
            const totalSF = client.locations.reduce((s, l) => s + (l.sqft || 0), 0)
            const totalRent = client.locations.reduce((s, l) => s + (l.annual_rent || 0), 0)
            const isExpanded = expandedClientId === client.id

            return (
              <div key={client.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Client header */}
                <div
                  onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                  className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-semibold text-gray-900">{client.name}</div>
                      <div className="text-sm text-gray-500">
                        {[client.industry, client.primary_contact].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">{client.locations.length}</div>
                      <div className="text-xs text-gray-400">Locations</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">{(totalSF / 1000).toFixed(0)}k</div>
                      <div className="text-xs text-gray-400">Total SF</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">
                        {totalRent ? `$${(totalRent / 1000).toFixed(0)}k` : '—'}
                      </div>
                      <div className="text-xs text-gray-400">Annual Rent</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id) }}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded border border-transparent hover:border-red-200 transition"
                      >
                        Delete
                      </button>
                      <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                </div>

                {/* Expanded: location table */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-6 py-5">
                    {/* Contact info */}
                    {(client.contact_email || client.contact_phone) && (
                      <div className="flex gap-6 mb-4 text-sm text-gray-500">
                        {client.contact_email && <span>✉ {client.contact_email}</span>}
                        {client.contact_phone && <span>📞 {client.contact_phone}</span>}
                      </div>
                    )}

                    {/* Locations table */}
                    <table className="w-full text-sm mb-4">
                      <thead>
                        <tr className="bg-gray-50 border border-gray-200 rounded-lg">
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Property</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">City / State</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Type</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">SF</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Annual Rent</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Lease Expiration</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Landlord</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {client.locations.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-6 text-gray-400 text-sm">
                              No locations yet.
                            </td>
                          </tr>
                        ) : (
                          client.locations.map((loc) => (
                            <>
                              <tr key={loc.id} className="hover:bg-gray-50">
                                {editingLocId === loc.id ? (
                                  // Inline edit mode
                                  <>
                                    <td className="px-3 py-2">
                                      <input value={editLocData.property_name ?? loc.property_name ?? ''}
                                        onChange={(e) => setEditLocData((p) => ({ ...p, property_name: e.target.value }))}
                                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs" />
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex gap-1">
                                        <input value={editLocData.city ?? loc.city ?? ''} placeholder="City"
                                          onChange={(e) => setEditLocData((p) => ({ ...p, city: e.target.value }))}
                                          className="w-20 border border-gray-300 rounded px-2 py-1 text-xs" />
                                        <input value={editLocData.state ?? loc.state ?? ''} placeholder="ST" maxLength={2}
                                          onChange={(e) => setEditLocData((p) => ({ ...p, state: e.target.value }))}
                                          className="w-10 border border-gray-300 rounded px-2 py-1 text-xs" />
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <select value={editLocData.property_type ?? loc.property_type ?? ''}
                                        onChange={(e) => setEditLocData((p) => ({ ...p, property_type: e.target.value }))}
                                        className="border border-gray-300 rounded px-2 py-1 text-xs">
                                        <option value="">—</option>
                                        <option value="office">office</option>
                                        <option value="industrial">industrial</option>
                                      </select>
                                    </td>
                                    <td className="px-3 py-2">
                                      <input type="number" value={editLocData.sqft ?? (loc.sqft ? String(loc.sqft) : '')}
                                        onChange={(e) => setEditLocData((p) => ({ ...p, sqft: e.target.value }))}
                                        className="w-20 border border-gray-300 rounded px-2 py-1 text-xs" />
                                    </td>
                                    <td className="px-3 py-2">
                                      <input type="number" value={editLocData.annual_rent ?? (loc.annual_rent ? String(loc.annual_rent) : '')}
                                        onChange={(e) => setEditLocData((p) => ({ ...p, annual_rent: e.target.value }))}
                                        className="w-24 border border-gray-300 rounded px-2 py-1 text-xs" />
                                    </td>
                                    <td className="px-3 py-2">
                                      <input type="date" value={editLocData.lease_expiration_date ?? (loc.lease_expiration_date ? loc.lease_expiration_date.split('T')[0] : '')}
                                        onChange={(e) => setEditLocData((p) => ({ ...p, lease_expiration_date: e.target.value }))}
                                        className="border border-gray-300 rounded px-2 py-1 text-xs" />
                                    </td>
                                    <td className="px-3 py-2">
                                      <input value={editLocData.landlord ?? loc.landlord ?? ''}
                                        onChange={(e) => setEditLocData((p) => ({ ...p, landlord: e.target.value }))}
                                        className="w-24 border border-gray-300 rounded px-2 py-1 text-xs" />
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex gap-1">
                                        <button onClick={() => handleSaveLocEdit(client.id, loc.id)}
                                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Save</button>
                                        <button onClick={() => { setEditingLocId(null); setEditLocData({}) }}
                                          className="text-xs text-gray-500 px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">Cancel</button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  // Read mode
                                  <>
                                    <td className="px-3 py-2 font-medium text-gray-900">{loc.property_name || '—'}</td>
                                    <td className="px-3 py-2 text-gray-600">{[loc.city, loc.state].filter(Boolean).join(', ') || '—'}</td>
                                    <td className="px-3 py-2">
                                      {loc.property_type && (
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${loc.property_type === 'office' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                          {loc.property_type}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-gray-600">{loc.sqft ? loc.sqft.toLocaleString() : '—'}</td>
                                    <td className="px-3 py-2 text-gray-600">
                                      {loc.annual_rent ? `$${loc.annual_rent.toLocaleString()}` : '—'}
                                    </td>
                                    <td className={`px-3 py-2 ${leaseUrgency(loc.lease_expiration_date)}`}>
                                      {loc.lease_expiration_date
                                        ? new Date(loc.lease_expiration_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                        : '—'}
                                    </td>
                                    <td className="px-3 py-2 text-gray-500">{loc.landlord || '—'}</td>
                                    <td className="px-3 py-2">
                                      <div className="flex gap-1">
                                        <button onClick={() => { setEditingLocId(loc.id); setEditLocData({}) }}
                                          className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-200 hover:border-blue-400 transition">
                                          Edit
                                        </button>
                                        <button onClick={() => handleDeleteLocation(client.id, loc.id)}
                                          className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded border border-transparent hover:border-red-200 transition">
                                          ✕
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            </>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* Add location */}
                    {addingLocFor === client.id ? (
                      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Location</h3>
                        <div className="grid grid-cols-4 gap-3 mb-3">
                          {LOC_FIELDS.map((f) => (
                            <div key={f.key}>
                              <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                              {f.type === 'select' ? (
                                <select value={newLoc[f.key] || ''} onChange={(e) => setNewLoc((p) => ({ ...p, [f.key]: e.target.value }))}
                                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500">
                                  <option value="">—</option>
                                  {f.options?.map((o) => <option key={o}>{o}</option>)}
                                </select>
                              ) : (
                                <input type={f.type} value={newLoc[f.key] || ''}
                                  onChange={(e) => setNewLoc((p) => ({ ...p, [f.key]: e.target.value }))}
                                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleAddLocation(client.id)} disabled={savingLoc}
                            className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                            {savingLoc ? 'Saving…' : 'Add Location'}
                          </button>
                          <button onClick={() => { setAddingLocFor(null); setNewLoc({}) }}
                            className="text-sm border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg hover:bg-gray-50 transition">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setAddingLocFor(client.id); setNewLoc({}) }}
                        className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-4 py-1.5 rounded-lg transition">
                        + Add Location
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
