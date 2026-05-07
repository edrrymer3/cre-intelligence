'use client'

import { useEffect, useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

interface SurveyYear {
  id: number; year: number
  asking_rate_psf: number | null; effective_rate_psf: number | null
  cam_psf: number | null; tax_psf: number | null; insurance_psf: number | null
  total_nnn_psf: number | null; occupancy_rate: number | null
  free_rent_months: number | null; ti_psf: number | null; notes: string | null
}

interface SurveyPhoto { id: number; url: string; caption: string | null }

interface Survey {
  id: number; address: string; building_name: string | null
  city: string | null; state: string; zip: string | null
  property_type: string | null; building_class: string | null
  total_sf: number | null; floors: number | null
  year_built: number | null; year_renovated: number | null
  parking_ratio: string | null; owner: string | null; landlord: string | null
  property_manager: string | null; amenities: string | null; notes: string | null
  source_file: string | null; added_date: string; added_by: string | null
  history: SurveyYear[]; photos: SurveyPhoto[]
}

const CLASS_COLORS: Record<string, string> = {
  A: 'bg-green-100 text-green-800', B: 'bg-blue-100 text-blue-800', C: 'bg-yellow-100 text-yellow-700',
}

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // Upload state
  const [pdfText, setPdfText] = useState('')
  const [filename, setFilename] = useState('')
  const [parsing, setParsing] = useState(false)
  const [uploadMode, setUploadMode] = useState<'paste' | 'manual' | null>(null)

  // Manual form
  const [manualForm, setManualForm] = useState<Record<string, string>>({})
  const [savingManual, setSavingManual] = useState(false)

  // Add year form
  const [addingYearFor, setAddingYearFor] = useState<number | null>(null)
  const [yearForm, setYearForm] = useState<Record<string, string>>({})
  const [savingYear, setSavingYear] = useState(false)

  // Edit
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (typeFilter) params.set('type', typeFilter)
    if (search) params.set('search', search)
    const res = await fetch(`/api/surveys?${params}`)
    const data = await res.json()
    setSurveys(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function parsePDF() {
    if (!pdfText) return
    setParsing(true)
    const res = await fetch('/api/surveys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdf_text: pdfText, filename }),
    })
    const data = await res.json()
    setSurveys((prev) => [data, ...prev])
    setPdfText(''); setFilename(''); setUploadMode(null)
    setParsing(false)
  }

  async function saveManual(e: React.FormEvent) {
    e.preventDefault()
    setSavingManual(true)
    const payload: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(manualForm)) {
      if (!v) continue
      if (['total_sf', 'floors', 'year_built', 'year_renovated'].includes(k)) payload[k] = parseInt(v)
      else payload[k] = v
    }
    const res = await fetch('/api/surveys', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setSurveys((prev) => [data, ...prev])
    setManualForm({}); setUploadMode(null); setSavingManual(false)
  }

  async function addYear(surveyId: number) {
    setSavingYear(true)
    const payload: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(yearForm)) {
      if (!v) continue
      if (k === 'year' || k === 'free_rent_months') payload[k] = parseInt(v)
      else if (k !== 'notes') payload[k] = parseFloat(v)
      else payload[k] = v
    }
    await fetch(`/api/surveys/${surveyId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setAddingYearFor(null); setYearForm({}); setSavingYear(false); load()
  }

  async function saveEdit(surveyId: number) {
    setSavingEdit(true)
    const payload: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(editForm)) {
      if (['total_sf', 'floors', 'year_built', 'year_renovated'].includes(k)) payload[k] = v ? parseInt(v) : null
      else payload[k] = v || null
    }
    await fetch(`/api/surveys/${surveyId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setEditId(null); setEditForm({}); setSavingEdit(false); load()
  }

  async function deleteSurvey(id: number) {
    if (!confirm('Delete this building survey?')) return
    await fetch(`/api/surveys/${id}`, { method: 'DELETE' })
    setSurveys((prev) => prev.filter((s) => s.id !== id))
  }

  const filtered = useMemo(() => {
    let rows = surveys
    if (typeFilter) rows = rows.filter((s) => s.property_type === typeFilter)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter((s) => s.address.toLowerCase().includes(q) || s.building_name?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q) || s.landlord?.toLowerCase().includes(q))
    }
    return rows
  }, [surveys, search, typeFilter])

  const cities = useMemo(() => [...new Set(surveys.map((s) => s.city).filter(Boolean))].sort(), [surveys])

  const MANUAL_FIELDS = [
    ['address', 'Address *', 'text'], ['building_name', 'Building Name', 'text'],
    ['city', 'City', 'text'], ['state', 'State', 'text'], ['zip', 'ZIP', 'text'],
    ['property_type', 'Type', 'select'], ['building_class', 'Class', 'select'],
    ['total_sf', 'Total SF', 'number'], ['floors', 'Floors', 'number'],
    ['year_built', 'Year Built', 'number'], ['year_renovated', 'Year Renovated', 'number'],
    ['parking_ratio', 'Parking Ratio', 'text'], ['owner', 'Owner', 'text'],
    ['landlord', 'Landlord', 'text'], ['property_manager', 'Property Manager', 'text'],
    ['amenities', 'Amenities', 'text'], ['notes', 'Notes', 'text'],
  ]

  const YEAR_FIELDS = [
    ['year', 'Year *', 'number'], ['asking_rate_psf', 'Asking Rate PSF', 'number'],
    ['effective_rate_psf', 'Effective Rate PSF', 'number'], ['cam_psf', 'CAM PSF', 'number'],
    ['tax_psf', 'Tax PSF', 'number'], ['insurance_psf', 'Insurance PSF', 'number'],
    ['total_nnn_psf', 'Total NNN PSF', 'number'], ['occupancy_rate', 'Occupancy %', 'number'],
    ['free_rent_months', 'Free Rent Months', 'number'], ['ti_psf', 'TI PSF', 'number'],
    ['notes', 'Notes', 'text'],
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Building Surveys</h1>
          <p className="text-gray-500 text-sm mt-1">Your private database of building intel — rates, CAM, taxes, history</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setUploadMode(uploadMode === 'paste' ? null : 'paste')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">
            📄 Import PDF / Text
          </button>
          <button onClick={() => setUploadMode(uploadMode === 'manual' ? null : 'manual')}
            className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition">
            + Add Manually
          </button>
        </div>
      </div>

      {/* PDF import */}
      {uploadMode === 'paste' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-2">Import from PDF / Survey Document</h2>
          <p className="text-sm text-gray-400 mb-4">Open your survey PDF, select all text (Cmd+A), copy (Cmd+C), and paste below. Claude will extract all building details and historical rates automatically.</p>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">File Name (optional)</label>
            <input type="text" value={filename} onChange={(e) => setFilename(e.target.value)}
              placeholder="e.g. 225-south-sixth-survey-2024.pdf"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Paste Survey Text</label>
            <textarea rows={8} value={pdfText} onChange={(e) => setPdfText(e.target.value)}
              placeholder="Paste the full text from your survey PDF here..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={parsePDF} disabled={parsing || !pdfText}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
              {parsing ? '⏳ Extracting data…' : '✨ Import with AI'}
            </button>
            <button onClick={() => setUploadMode(null)} className="border border-gray-300 text-gray-600 px-5 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Manual entry */}
      {uploadMode === 'manual' && (
        <form onSubmit={saveManual} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Add Building Manually</h2>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {MANUAL_FIELDS.map(([k, l, t]) => (
              <div key={k}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{l}</label>
                {t === 'select' && k === 'property_type' ? (
                  <select value={manualForm[k] || ''} onChange={(e) => setManualForm((p) => ({ ...p, [k]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                    <option value="">—</option>
                    <option value="office">Office</option><option value="industrial">Industrial</option><option value="flex">Flex</option>
                  </select>
                ) : t === 'select' && k === 'building_class' ? (
                  <select value={manualForm[k] || ''} onChange={(e) => setManualForm((p) => ({ ...p, [k]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                    <option value="">—</option>
                    <option value="A">Class A</option><option value="B">Class B</option><option value="C">Class C</option>
                  </select>
                ) : (
                  <input type={t} required={k === 'address'} value={manualForm[k] || ''}
                    onChange={(e) => setManualForm((p) => ({ ...p, [k]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={savingManual} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{savingManual ? 'Saving…' : 'Add Building'}</button>
            <button type="button" onClick={() => setUploadMode(null)} className="border border-gray-300 text-gray-600 px-5 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input type="text" placeholder="Search address, building, landlord..." value={search}
          onChange={(e) => { setSearch(e.target.value); load() }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-64" />
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); load() }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
          <option value="">All Types</option>
          <option value="office">Office</option><option value="industrial">Industrial</option><option value="flex">Flex</option>
        </select>
      </div>

      {/* Survey list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">🏢</div>
          <p>No surveys yet. Import a PDF or add a building manually.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((survey) => {
            const latestYear = survey.history[0]
            const isExpanded = expandedId === survey.id
            const chartData = [...survey.history].reverse().map((h) => ({
              year: h.year,
              asking: h.asking_rate_psf,
              cam: h.cam_psf,
              tax: h.tax_psf,
              nnn: h.total_nnn_psf,
            }))

            return (
              <div key={survey.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => setExpandedId(isExpanded ? null : survey.id)}>
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-semibold text-gray-900">{survey.building_name || survey.address}</div>
                      <div className="text-sm text-gray-500">{survey.address}{survey.city ? `, ${survey.city}` : ''}{survey.state ? `, ${survey.state}` : ''}</div>
                    </div>
                    <div className="flex gap-2">
                      {survey.building_class && <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${CLASS_COLORS[survey.building_class] || 'bg-gray-100 text-gray-600'}`}>Class {survey.building_class}</span>}
                      {survey.property_type && <span className={`text-xs px-2 py-0.5 rounded-full ${survey.property_type === 'office' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{survey.property_type}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-8 text-sm">
                    <div className="text-center"><div className="font-semibold">{survey.total_sf ? `${(survey.total_sf / 1000).toFixed(0)}k` : '—'}</div><div className="text-xs text-gray-400">SF</div></div>
                    {latestYear && <div className="text-center"><div className="font-semibold text-blue-700">${latestYear.asking_rate_psf?.toFixed(2) || '—'}</div><div className="text-xs text-gray-400">{latestYear.year} Rate</div></div>}
                    {latestYear?.total_nnn_psf && <div className="text-center"><div className="font-semibold text-orange-600">${latestYear.total_nnn_psf.toFixed(2)}</div><div className="text-xs text-gray-400">NNN</div></div>}
                    <div className="text-center"><div className="font-semibold text-gray-600">{survey.history.length}</div><div className="text-xs text-gray-400">Years</div></div>
                    <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-6 py-5">
                    {/* Building details */}
                    <div className="grid grid-cols-4 gap-4 mb-5 text-sm">
                      {[
                        ['Year Built', survey.year_built || '—'],
                        ['Renovated', survey.year_renovated || '—'],
                        ['Floors', survey.floors || '—'],
                        ['Parking', survey.parking_ratio || '—'],
                        ['Owner', survey.owner || '—'],
                        ['Landlord', survey.landlord || '—'],
                        ['Manager', survey.property_manager || '—'],
                        ['Source', survey.source_file || 'Manual'],
                      ].map(([k, v]) => (
                        <div key={k}><p className="text-xs text-gray-400">{k}</p><p className="font-medium text-gray-900 truncate">{v}</p></div>
                      ))}
                    </div>

                    {survey.amenities && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Amenities</p>
                        <p className="text-sm text-gray-700">{survey.amenities}</p>
                      </div>
                    )}

                    {/* Rate history chart */}
                    {chartData.length > 1 && (
                      <div className="mb-5">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Rate History</p>
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}/SF`]} />
                            <Legend />
                            <Line type="monotone" dataKey="asking" stroke="#3b82f6" strokeWidth={2} name="Asking Rate" dot={false} />
                            <Line type="monotone" dataKey="cam" stroke="#f97316" strokeWidth={2} name="CAM" dot={false} />
                            <Line type="monotone" dataKey="tax" stroke="#ef4444" strokeWidth={2} name="Tax" dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Historical data table */}
                    {survey.history.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Historical Rates</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead><tr className="bg-gray-50 text-xs text-gray-500">
                              {['Year', 'Asking PSF', 'Effective PSF', 'CAM', 'Tax', 'Insurance', 'NNN Total', 'Occupancy', 'Free Rent', 'TI'].map((h) => (
                                <th key={h} className="text-left px-3 py-2 font-semibold">{h}</th>
                              ))}
                            </tr></thead>
                            <tbody className="divide-y divide-gray-100">
                              {survey.history.map((h) => (
                                <tr key={h.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 font-bold text-gray-900">{h.year}</td>
                                  <td className="px-3 py-2 text-blue-700 font-medium">{h.asking_rate_psf ? `$${h.asking_rate_psf.toFixed(2)}` : '—'}</td>
                                  <td className="px-3 py-2 text-gray-600">{h.effective_rate_psf ? `$${h.effective_rate_psf.toFixed(2)}` : '—'}</td>
                                  <td className="px-3 py-2 text-gray-600">{h.cam_psf ? `$${h.cam_psf.toFixed(2)}` : '—'}</td>
                                  <td className="px-3 py-2 text-gray-600">{h.tax_psf ? `$${h.tax_psf.toFixed(2)}` : '—'}</td>
                                  <td className="px-3 py-2 text-gray-600">{h.insurance_psf ? `$${h.insurance_psf.toFixed(2)}` : '—'}</td>
                                  <td className="px-3 py-2 font-semibold text-orange-600">{h.total_nnn_psf ? `$${h.total_nnn_psf.toFixed(2)}` : '—'}</td>
                                  <td className="px-3 py-2 text-gray-600">{h.occupancy_rate ? `${h.occupancy_rate}%` : '—'}</td>
                                  <td className="px-3 py-2 text-gray-600">{h.free_rent_months ? `${h.free_rent_months} mo` : '—'}</td>
                                  <td className="px-3 py-2 text-gray-600">{h.ti_psf ? `$${h.ti_psf.toFixed(2)}` : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Add year */}
                    {addingYearFor === survey.id ? (
                      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-3">
                        <div className="grid grid-cols-5 gap-2 mb-3">
                          {YEAR_FIELDS.map(([k, l, t]) => (
                            <div key={k}>
                              <label className="block text-xs text-gray-500 mb-1">{l}</label>
                              <input type={t} value={yearForm[k] || ''}
                                onChange={(e) => setYearForm((p) => ({ ...p, [k]: e.target.value }))}
                                className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs" />
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => addYear(survey.id)} disabled={savingYear || !yearForm.year}
                            className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            {savingYear ? 'Saving…' : 'Add Year'}
                          </button>
                          <button onClick={() => { setAddingYearFor(null); setYearForm({}) }} className="text-sm border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg hover:bg-gray-50">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button onClick={() => setAddingYearFor(survey.id)}
                          className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-4 py-1.5 rounded-lg transition">
                          + Add Year
                        </button>
                        <button onClick={() => { setEditId(survey.id); setEditForm(Object.fromEntries(Object.entries(survey).map(([k, v]) => [k, v === null ? '' : String(v)]))) }}
                          className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-4 py-1.5 rounded-lg transition">
                          Edit Building
                        </button>
                        <button onClick={() => deleteSurvey(survey.id)}
                          className="text-sm text-red-400 hover:text-red-600 border border-transparent hover:border-red-200 px-4 py-1.5 rounded-lg transition">
                          Delete
                        </button>
                      </div>
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
