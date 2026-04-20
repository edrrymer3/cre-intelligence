'use client'

import { useEffect, useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface ClientLocation {
  id: number
  property_name: string | null
  city: string
  state: string
  property_type: string
  sqft: number | null
  annual_rent: number | null
  commission_earned: number | null
  lease_expiration: string | null
  landlord: string | null
  notes: string | null
}

interface ClientContact {
  id: number
  name: string
  title: string | null
  email: string | null
  phone: string | null
  linkedin_url: string | null
  primary: boolean
}

interface Client {
  id: number
  name: string
  industry: string | null
  hq_city: string | null
  hq_state: string | null
  employee_count: number | null
  notes: string | null
  added_date: string
  locations: ClientLocation[]
  contacts: ClientContact[]
  _count: { locations: number; contacts: number }
}

function urgencyColor(date: string | null) {
  if (!date) return ''
  const months = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
  if (months < 0) return 'bg-red-100 border-red-300 text-red-700'
  if (months < 12) return 'bg-red-50 border-red-200'
  if (months < 18) return 'bg-yellow-50 border-yellow-200'
  return ''
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [showAddClient, setShowAddClient] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', industry: '', hq_city: '', hq_state: '', employee_count: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const limit = 25

  useEffect(() => { load() }, [page])

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/clients?page=${page}&limit=${limit}`)
    const data = await res.json()
    setClients(data.clients || [])
    setTotal(data.total || 0)
    setLoading(false)
  }

  // Summary stats
  const stats = useMemo(() => {
    let totalSF = 0, totalCommission = 0, expiringSoon = 0
    const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() + 1)
    clients.forEach((c) => c.locations.forEach((l) => {
      totalSF += l.sqft || 0
      totalCommission += l.commission_earned || 0
      if (l.lease_expiration && new Date(l.lease_expiration) <= cutoff) expiringSoon++
    }))
    return { totalSF, totalCommission, expiringSoon }
  }, [clients])

  // Timeline chart
  const chartData = useMemo(() => {
    const years: Record<string, number> = {}
    for (let y = new Date().getFullYear(); y <= new Date().getFullYear() + 4; y++) years[String(y)] = 0
    clients.forEach((c) => c.locations.forEach((l) => {
      if (l.lease_expiration && l.sqft) {
        const y = new Date(l.lease_expiration).getFullYear()
        if (years[String(y)] !== undefined) years[String(y)] += l.sqft
      }
    }))
    return Object.entries(years).map(([year, sf]) => ({ year, sf: Math.round(sf / 1000) }))
  }, [clients])

  const filtered = useMemo(() => {
    if (!search) return clients
    const q = search.toLowerCase()
    return clients.filter((c) => c.name.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q))
  }, [clients, search])

  async function addClient(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newClient, employee_count: newClient.employee_count ? parseInt(newClient.employee_count) : null }),
    })
    setSaving(false)
    setShowAddClient(false)
    setNewClient({ name: '', industry: '', hq_city: '', hq_state: '', employee_count: '', notes: '' })
    load()
  }

  async function addLocation(clientId: number, data: Record<string, string>) {
    await fetch(`/api/clients/${clientId}/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, sqft: data.sqft ? parseInt(data.sqft) : null, annual_rent: data.annual_rent ? parseFloat(data.annual_rent) : null, commission_earned: data.commission_earned ? parseFloat(data.commission_earned) : null }),
    })
    load()
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Client Portfolio</h1>
        <div className="flex gap-3">
          <a href="/api/reports?report=client-portfolio&format=csv"
            className="text-sm border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition">
            ⬇ Export CSV
          </a>
          <button onClick={() => setShowAddClient(!showAddClient)}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            + Add Client
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Clients', value: total },
          { label: 'SF Under Management', value: `${(stats.totalSF / 1000).toFixed(0)}k SF` },
          { label: 'Total Commission Earned', value: `$${stats.totalCommission.toLocaleString()}` },
          { label: 'Leases Expiring < 12 mo', value: stats.expiringSoon, alert: stats.expiringSoon > 0 },
        ].map((s) => (
          <div key={s.label} className={`bg-white rounded-xl border p-5 ${s.alert ? 'border-orange-300' : 'border-gray-200'}`}>
            <div className={`text-2xl font-bold ${s.alert ? 'text-orange-600' : 'text-gray-900'}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Timeline chart */}
      {chartData.some((d) => d.sf > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">Client Lease Expirations (SF, thousands)</h2>
          <ResponsiveContainer width="100%" height={140}>
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

      {/* Add client form */}
      {showAddClient && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <form onSubmit={addClient} className="grid grid-cols-3 gap-4">
            {[['name', 'Client Name *', true], ['industry', 'Industry'], ['hq_city', 'HQ City'], ['hq_state', 'HQ State'], ['employee_count', 'Employees'], ['notes', 'Notes']].map(([key, label, req]) => (
              <div key={key as string}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label as string}</label>
                <input required={!!req} type={key === 'employee_count' ? 'number' : 'text'}
                  value={(newClient as Record<string, string>)[key as string]}
                  onChange={(e) => setNewClient((p) => ({ ...p, [key as string]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            ))}
            <div className="col-span-3 flex gap-3">
              <button type="submit" disabled={saving} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Add Client'}
              </button>
              <button type="button" onClick={() => setShowAddClient(false)} className="border border-gray-300 text-gray-600 px-5 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <input type="text" placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-64 mb-4" />

      {/* Client list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          No clients yet. Add one above to track your existing client relationships.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((client) => {
            const totalSF = client.locations.reduce((s, l) => s + (l.sqft || 0), 0)
            const totalRent = client.locations.reduce((s, l) => s + (l.annual_rent || 0), 0)
            const totalComm = client.locations.reduce((s, l) => s + (l.commission_earned || 0), 0)
            const urgentLocs = client.locations.filter((l) => {
              if (!l.lease_expiration) return false
              const months = (new Date(l.lease_expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
              return months < 18
            })
            const isExpanded = expandedId === client.id

            return (
              <div key={client.id} className={`bg-white rounded-xl border overflow-hidden ${urgentLocs.some((l) => {
                const m = (new Date(l.lease_expiration!).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
                return m < 12
              }) ? 'border-red-200' : urgentLocs.length > 0 ? 'border-yellow-200' : 'border-gray-200'}`}>

                <div onClick={() => setExpandedId(isExpanded ? null : client.id)}
                  className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 transition">
                  <div>
                    <div className="font-semibold text-gray-900">{client.name}</div>
                    <div className="text-sm text-gray-500">{[client.industry, client.hq_city && client.hq_state ? `${client.hq_city}, ${client.hq_state}` : null].filter(Boolean).join(' · ')}</div>
                  </div>
                  <div className="flex items-center gap-8 text-sm">
                    <div className="text-center"><div className="font-semibold">{client._count.locations}</div><div className="text-xs text-gray-400">Locations</div></div>
                    <div className="text-center"><div className="font-semibold">{(totalSF / 1000).toFixed(0)}k</div><div className="text-xs text-gray-400">SF</div></div>
                    <div className="text-center"><div className="font-semibold">{totalRent ? `$${(totalRent / 1000).toFixed(0)}k` : '—'}</div><div className="text-xs text-gray-400">Ann. Rent</div></div>
                    <div className="text-center"><div className={`font-semibold ${totalComm > 0 ? 'text-green-600' : 'text-gray-400'}`}>{totalComm ? `$${totalComm.toLocaleString()}` : '—'}</div><div className="text-xs text-gray-400">Commission</div></div>
                    {urgentLocs.length > 0 && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
                        ⚠️ {urgentLocs.length} expiring
                      </span>
                    )}
                    <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-6 py-5">
                    {/* Contacts */}
                    {client.contacts.length > 0 && (
                      <div className="flex gap-4 mb-4 flex-wrap">
                        {client.contacts.map((c) => (
                          <div key={c.id} className="flex items-center gap-2 text-sm">
                            {c.primary && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Primary</span>}
                            <span className="font-medium">{c.name}</span>
                            {c.title && <span className="text-gray-500">· {c.title}</span>}
                            {c.email && <a href={`mailto:${c.email}`} className="text-blue-600 text-xs">✉</a>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Locations table */}
                    <table className="w-full text-sm mb-4">
                      <thead>
                        <tr className="bg-gray-50 text-xs text-gray-500">
                          <th className="text-left px-3 py-2">Property</th>
                          <th className="text-left px-3 py-2">City / State</th>
                          <th className="text-left px-3 py-2">Type</th>
                          <th className="text-left px-3 py-2">SF</th>
                          <th className="text-left px-3 py-2">Annual Rent</th>
                          <th className="text-left px-3 py-2">Commission</th>
                          <th className="text-left px-3 py-2">Lease Expiration</th>
                          <th className="text-left px-3 py-2">Landlord</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {client.locations.length === 0 ? (
                          <tr><td colSpan={8} className="text-center py-4 text-gray-400 text-sm">No locations. Add one below.</td></tr>
                        ) : (
                          client.locations.map((loc) => {
                            const months = loc.lease_expiration
                              ? (new Date(loc.lease_expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
                              : null
                            return (
                              <tr key={loc.id} className={urgencyColor(loc.lease_expiration)}>
                                <td className="px-3 py-2 font-medium">{loc.property_name || '—'}</td>
                                <td className="px-3 py-2 text-gray-600">{loc.city}, {loc.state}</td>
                                <td className="px-3 py-2"><span className={`text-xs px-1.5 py-0.5 rounded-full ${loc.property_type === 'office' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{loc.property_type}</span></td>
                                <td className="px-3 py-2 text-gray-600">{loc.sqft ? `${loc.sqft.toLocaleString()} SF` : '—'}</td>
                                <td className="px-3 py-2 text-gray-600">{loc.annual_rent ? `$${loc.annual_rent.toLocaleString()}` : '—'}</td>
                                <td className="px-3 py-2 text-green-700 font-medium">{loc.commission_earned ? `$${loc.commission_earned.toLocaleString()}` : '—'}</td>
                                <td className={`px-3 py-2 font-medium ${months !== null && months < 12 ? 'text-red-600' : months !== null && months < 18 ? 'text-yellow-600' : 'text-gray-600'}`}>
                                  {loc.lease_expiration ? new Date(loc.lease_expiration).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                                  {months !== null && months < 18 && <span className="ml-1 text-xs">({Math.round(months)}mo)</span>}
                                </td>
                                <td className="px-3 py-2 text-gray-500">{loc.landlord || '—'}</td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>

                    <AddLocationInline clientId={client.id} onSave={(d) => addLocation(client.id, d)} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">← Prev</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}

function AddLocationInline({ clientId, onSave }: { clientId: number; onSave: (d: Record<string, string>) => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ property_name: '', city: '', state: '', property_type: 'office', sqft: '', annual_rent: '', commission_earned: '', lease_expiration: '', landlord: '' })
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave(form)
    setOpen(false)
    setForm({ property_name: '', city: '', state: '', property_type: 'office', sqft: '', annual_rent: '', commission_earned: '', lease_expiration: '', landlord: '' })
    setSaving(false)
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-4 py-1.5 rounded-lg transition">
      + Add Location
    </button>
  )

  return (
    <form onSubmit={submit} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
      <div className="grid grid-cols-4 gap-3 mb-3">
        {[['property_name', 'Property Name', 'text'], ['city', 'City *', 'text'], ['state', 'State *', 'text'], ['property_type', 'Type', 'select'], ['sqft', 'SF', 'number'], ['annual_rent', 'Annual Rent ($)', 'number'], ['commission_earned', 'Commission ($)', 'number'], ['lease_expiration', 'Lease Expiration', 'date'], ['landlord', 'Landlord', 'text']].map(([key, label, type]) => (
          <div key={key as string}>
            <label className="block text-xs font-medium text-gray-500 mb-1">{label as string}</label>
            {type === 'select' ? (
              <select value={form[key as keyof typeof form]} onChange={(e) => setForm((p) => ({ ...p, [key as string]: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="office">office</option>
                <option value="industrial">industrial</option>
              </select>
            ) : (
              <input type={type as string} required={key === 'city' || key === 'state'} value={form[key as keyof typeof form]}
                onChange={(e) => setForm((p) => ({ ...p, [key as string]: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Add'}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  )
}
