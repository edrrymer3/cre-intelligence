'use client'

import { useEffect, useState, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

interface DealMilestone { id: number; milestone: string; due_date: string | null; completed: boolean; deal_id: number }
interface DealSpace { id: number; building_name: string | null; address: string | null; city: string | null; state: string | null; floor: string | null; sqft: number | null; asking_rate_psf: number | null; concessions: string | null; term_years: number | null; status: string | null; notes: string | null }
interface Deal {
  id: number; deal_name: string; status: string; property_type: string | null; target_city: string | null; target_state: string | null
  target_sf_min: number | null; target_sf_max: number | null; estimated_value_sf: number | null; estimated_commission: number | null
  probability: number | null; assigned_to: string | null; notes: string | null; created_date: string; last_updated: string
  company: { name: string; ticker: string | null } | null; client: { name: string } | null
  milestones: DealMilestone[]; spaces: DealSpace[]
  _count: { milestones: number; spaces: number }
}

const STATUSES = ['Prospecting', 'RFP', 'Touring', 'Negotiating', 'LOI', 'Lease Execution', 'Closed', 'Lost']
const STATUS_COLORS: Record<string, string> = {
  'Prospecting': 'bg-gray-100', 'RFP': 'bg-blue-50', 'Touring': 'bg-yellow-50',
  'Negotiating': 'bg-orange-50', 'LOI': 'bg-purple-50', 'Lease Execution': 'bg-green-50',
  'Closed': 'bg-green-100', 'Lost': 'bg-red-50',
}
const STATUS_HEADER: Record<string, string> = {
  'Prospecting': 'text-gray-600 bg-gray-200', 'RFP': 'text-blue-700 bg-blue-100', 'Touring': 'text-yellow-700 bg-yellow-100',
  'Negotiating': 'text-orange-700 bg-orange-100', 'LOI': 'text-purple-700 bg-purple-100',
  'Lease Execution': 'text-green-700 bg-green-100', 'Closed': 'text-green-800 bg-green-200', 'Lost': 'text-red-700 bg-red-100',
}

function daysSince(date: string) { return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)) }

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showAddDeal, setShowAddDeal] = useState(false)
  const [selectedSpaces, setSelectedSpaces] = useState<number[]>([])
  const [comparing, setComparing] = useState<{ dealId: number; analysis: string; spaces: DealSpace[] } | null>(null)
  const [comparingLoading, setComparingLoading] = useState(false)

  // Stats
  const stats = useMemo(() => {
    const active = deals.filter((d) => !['Closed', 'Lost'].includes(d.status))
    const closed = deals.filter((d) => d.status === 'Closed')
    const pipeline = active.reduce((s, d) => s + (d.estimated_commission || 0), 0)
    const weighted = active.reduce((s, d) => s + (d.estimated_commission || 0) * ((d.probability || 50) / 100), 0)
    const closedComm = closed.reduce((s, d) => s + (d.estimated_commission || 0), 0)
    return { active: active.length, pipeline, weighted, closedComm }
  }, [deals])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/deals')
    const data = await res.json()
    setDeals(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return
    const dealId = parseInt(result.draggableId)
    const newStatus = result.destination.droppableId
    setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, status: newStatus } : d))
    await fetch(`/api/deals/${dealId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  async function toggleMilestone(dealId: number, milestoneId: number, completed: boolean) {
    await fetch(`/api/deals/${dealId}/milestones`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestoneId, completed }),
    })
    setDeals((prev) => prev.map((d) => d.id === dealId
      ? { ...d, milestones: d.milestones.map((m) => m.id === milestoneId ? { ...m, completed } : m) }
      : d
    ))
  }

  async function runComparison(dealId: number) {
    if (selectedSpaces.length < 2) return
    setComparingLoading(true)
    const res = await fetch(`/api/deals/${dealId}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ space_ids: selectedSpaces }),
    })
    const data = await res.json()
    setComparing({ dealId, analysis: data.ai_analysis || '', spaces: data.spaces || [] })
    setComparingLoading(false)
    setSelectedSpaces([])
  }

  const byStatus = (status: string) => deals.filter((d) => d.status === status)

  // New deal form
  function NewDealForm() {
    const [form, setForm] = useState({ deal_name: '', status: 'Prospecting', property_type: 'office', target_city: '', target_state: 'MN', target_sf_min: '', target_sf_max: '', estimated_value_sf: '', probability: '50', assigned_to: '', notes: '' })
    const [saving, setSaving] = useState(false)
    async function submit(e: React.FormEvent) {
      e.preventDefault()
      setSaving(true)
      await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          target_sf_min: form.target_sf_min ? parseInt(form.target_sf_min) : null,
          target_sf_max: form.target_sf_max ? parseInt(form.target_sf_max) : null,
          estimated_value_sf: form.estimated_value_sf ? parseFloat(form.estimated_value_sf) : null,
          probability: parseInt(form.probability),
        }),
      })
      setSaving(false)
      setShowAddDeal(false)
      load()
    }
    return (
      <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">New Deal</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[['deal_name', 'Deal Name *', 'text', true], ['target_city', 'Target City', 'text'], ['target_state', 'State', 'text'], ['target_sf_min', 'Min SF', 'number'], ['target_sf_max', 'Max SF', 'number'], ['estimated_value_sf', 'Est. Rate PSF', 'number'], ['probability', 'Probability %', 'number'], ['assigned_to', 'Assigned To', 'text'], ['notes', 'Notes', 'text']].map(([k, l, t, req]) => (
            <div key={k as string}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{l as string}</label>
              <input type={t as string} required={!!req} value={(form as Record<string, string>)[k as string]}
                onChange={(e) => setForm((p) => ({ ...p, [k as string]: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Property Type</label>
            <select value={form.property_type} onChange={(e) => setForm((p) => ({ ...p, property_type: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
              <option value="office">Office</option>
              <option value="industrial">Industrial</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Create Deal'}</button>
          <button type="button" onClick={() => setShowAddDeal(false)} className="border border-gray-300 text-gray-600 px-5 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
        </div>
      </form>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Deal Tracker</h1>
        <div className="flex gap-3">
          <div className="flex border border-gray-300 rounded-lg overflow-hidden text-sm">
            <button onClick={() => setViewMode('kanban')} className={`px-4 py-2 transition ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Kanban</button>
            <button onClick={() => setViewMode('list')} className={`px-4 py-2 transition ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>List</button>
          </div>
          <button onClick={() => setShowAddDeal(!showAddDeal)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">+ New Deal</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active Deals', value: stats.active },
          { label: 'Pipeline Value', value: `$${(stats.pipeline / 1000).toFixed(0)}k` },
          { label: 'Weighted Pipeline', value: `$${(stats.weighted / 1000).toFixed(0)}k` },
          { label: 'Closed This Year', value: `$${(stats.closedComm / 1000).toFixed(0)}k`, green: true },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`text-2xl font-bold ${s.green ? 'text-green-600' : 'text-gray-900'}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {showAddDeal && <NewDealForm />}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading deals...</div>
      ) : viewMode === 'kanban' ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STATUSES.map((status) => {
              const statusDeals = byStatus(status)
              return (
                <div key={status} className="flex-shrink-0 w-52">
                  <div className={`text-xs font-semibold px-3 py-2 rounded-lg text-center mb-2 ${STATUS_HEADER[status]}`}>
                    {status} <span className="opacity-60">({statusDeals.length})</span>
                  </div>
                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}
                        className={`min-h-[120px] rounded-xl p-2 transition ${snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : 'bg-gray-50'}`}>
                        {statusDeals.map((deal, index) => (
                          <Draggable key={deal.id} draggableId={String(deal.id)} index={index}>
                            {(prov, snap) => (
                              <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                                onClick={() => setExpandedId(expandedId === deal.id ? null : deal.id)}
                                className={`bg-white rounded-xl border p-3 mb-2 cursor-pointer select-none transition shadow-sm ${snap.isDragging ? 'shadow-lg border-blue-400' : 'border-gray-200 hover:border-blue-200'} ${STATUS_COLORS[deal.status]}`}>
                                <div className="font-semibold text-gray-900 text-sm leading-tight mb-1">
                                  {deal.company?.name || deal.deal_name}
                                </div>
                                {deal.property_type && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${deal.property_type === 'office' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{deal.property_type}</span>
                                )}
                                {deal.target_city && <div className="text-xs text-gray-500 mt-1">{deal.target_city}, {deal.target_state}</div>}
                                {deal.target_sf_max && <div className="text-xs text-gray-500">Up to {deal.target_sf_max.toLocaleString()} SF</div>}
                                {deal.estimated_commission && <div className="text-xs text-green-600 font-medium mt-1">${deal.estimated_commission.toLocaleString()} est.</div>}
                                {deal.probability && <div className="text-xs text-gray-400">{deal.probability}% probability</div>}
                                {deal.assigned_to && <div className="text-xs text-blue-600 mt-1">→ {deal.assigned_to}</div>}
                                <div className="text-xs text-gray-300 mt-1">{daysSince(deal.last_updated)}d ago</div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      ) : (
        /* List view */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['Deal', 'Status', 'Type', 'City', 'SF Range', 'Commission', 'Probability', 'Assigned', 'Updated'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {deals.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">No deals yet. Create one above.</td></tr>
              ) : deals.map((deal) => (
                <tr key={deal.id} onClick={() => setExpandedId(expandedId === deal.id ? null : deal.id)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3 font-medium text-gray-900">{deal.company?.name || deal.deal_name}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_HEADER[deal.status]}`}>{deal.status}</span></td>
                  <td className="px-4 py-3 text-gray-600">{deal.property_type || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{deal.target_city || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{deal.target_sf_min ? `${deal.target_sf_min.toLocaleString()}–${(deal.target_sf_max || 0).toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-green-700 font-medium">{deal.estimated_commission ? `$${deal.estimated_commission.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{deal.probability ? `${deal.probability}%` : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{deal.assigned_to || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{daysSince(deal.last_updated)}d ago</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Expanded deal detail */}
      {expandedId && (() => {
        const deal = deals.find((d) => d.id === expandedId)
        if (!deal) return null
        const annualRent = deal.target_sf_max && deal.estimated_value_sf ? deal.target_sf_max * deal.estimated_value_sf : null
        const commission = annualRent && deal.probability ? annualRent * ((deal.probability / 100)) * 0.04 : null

        return (
          <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setExpandedId(null)}>
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative w-[640px] bg-white shadow-2xl overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">{deal.company?.name || deal.deal_name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_HEADER[deal.status]}`}>{deal.status}</span>
                    {deal.property_type && <span className="text-xs text-gray-500">{deal.property_type}</span>}
                    {deal.target_city && <span className="text-xs text-gray-500">• {deal.target_city}, {deal.target_state}</span>}
                  </div>
                </div>
                <button onClick={() => setExpandedId(null)} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
              </div>

              <div className="px-6 py-5 space-y-6">
                {/* Deal info */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {[
                    ['Target SF', deal.target_sf_min ? `${deal.target_sf_min.toLocaleString()}–${(deal.target_sf_max || 0).toLocaleString()} SF` : '—'],
                    ['Est. Rate PSF', deal.estimated_value_sf ? `$${deal.estimated_value_sf}/SF` : '—'],
                    ['Annual Rent', annualRent ? `$${annualRent.toLocaleString()}` : '—'],
                    ['Est. Commission', deal.estimated_commission ? `$${deal.estimated_commission.toLocaleString()}` : commission ? `$${Math.round(commission).toLocaleString()}` : '—'],
                    ['Probability', deal.probability ? `${deal.probability}%` : '—'],
                    ['Assigned To', deal.assigned_to || '—'],
                  ].map(([k, v]) => (
                    <div key={k}><p className="text-xs text-gray-400">{k}</p><p className="font-medium text-gray-900">{v}</p></div>
                  ))}
                </div>

                {/* Milestones */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Milestones</h3>
                  {deal.milestones.length === 0 ? (
                    <p className="text-sm text-gray-400">No milestones added.</p>
                  ) : (
                    <div className="space-y-2">
                      {deal.milestones.map((m) => (
                        <div key={m.id} className="flex items-center gap-3">
                          <button onClick={() => toggleMilestone(deal.id, m.id, !m.completed)}
                            className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition ${m.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400'}`}>
                            {m.completed && '✓'}
                          </button>
                          <span className={`text-sm flex-1 ${m.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{m.milestone}</span>
                          {m.due_date && <span className="text-xs text-gray-400">{new Date(m.due_date).toLocaleDateString()}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Spaces */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Spaces ({deal.spaces.length})
                    {selectedSpaces.length >= 2 && (
                      <button onClick={() => runComparison(deal.id)} disabled={comparingLoading}
                        className="ml-3 text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {comparingLoading ? '⏳ Analyzing…' : `🔍 Compare Selected (${selectedSpaces.length})`}
                      </button>
                    )}
                  </h3>
                  {deal.spaces.length === 0 ? (
                    <p className="text-sm text-gray-400">No spaces tracked yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {deal.spaces.map((s) => (
                        <div key={s.id} className={`flex items-start gap-3 p-3 rounded-lg border transition ${selectedSpaces.includes(s.id) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <input type="checkbox" checked={selectedSpaces.includes(s.id)}
                            onChange={(e) => setSelectedSpaces((prev) => e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id))}
                            className="mt-1 flex-shrink-0" />
                          <div className="flex-1 text-sm">
                            <span className="font-medium text-gray-900">{s.building_name || s.address || 'Unnamed space'}</span>
                            <span className="text-gray-500 ml-2">{s.city}</span>
                            <div className="flex gap-4 text-xs text-gray-500 mt-1">
                              {s.sqft && <span>{s.sqft.toLocaleString()} SF</span>}
                              {s.asking_rate_psf && <span>${s.asking_rate_psf}/SF</span>}
                              {s.term_years && <span>{s.term_years}yr term</span>}
                              {s.status && <span className="font-medium text-gray-600">{s.status}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comparison result */}
                  {comparing?.dealId === deal.id && comparing.analysis && (
                    <div className="mt-4 bg-gray-50 rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-700">AI Space Analysis</h4>
                        <button onClick={() => setComparing(null)} className="text-gray-400 hover:text-gray-600 text-sm">×</button>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{comparing.analysis}</p>
                    </div>
                  )}
                </div>

                {deal.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Notes</h3>
                    <p className="text-sm text-gray-600">{deal.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
