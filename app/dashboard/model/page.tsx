'use client'

import { useEffect, useState, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line } from 'recharts'

interface CashFlow { year: number; amount: number }
interface Scenario {
  id: number; model_id: number; name: string; address: string | null; suite: string | null
  rsf: number | null; start_date: string | null; term_months: number | null; lease_type: string | null
  base_rent_psf: number | null; expenses_psf: number | null; rent_escalation: number | null
  free_rent_months: number | null; free_rent_type: string | null; ti_allowance_psf: number | null
  capex_psf: number | null; parking_cost_monthly: number | null; parking_spaces: number | null; notes: string | null
  total_occupancy_cost: number | null; annual_avg_cost: number | null; avg_cost_psf: number | null
  npv: number | null; net_effective_rent_psf: number | null; cash_flows: CashFlow[] | null
}
interface LeaseModel {
  id: number; title: string; discount_rate: number; notes: string | null
  created_date: string; scenarios: Scenario[]
}

interface AiMessage { role: 'user' | 'assistant'; content: string }

function fmt$(n: number | null | undefined, decimals = 0) {
  if (n === null || n === undefined) return '—'
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}
function fmtPSF(n: number | null | undefined) { return n !== null && n !== undefined ? `$${n.toFixed(2)}` : '—' }
function fmtK(n: number | null | undefined) { return n !== null && n !== undefined ? `$${(n / 1000).toFixed(1)}K` : '—' }

const BLANK_SCENARIO = {
  name: '', address: '', suite: '', rsf: '', start_date: '', term_months: '',
  lease_type: 'NNN', base_rent_psf: '', expenses_psf: '', rent_escalation: '3.0',
  free_rent_months: '0', free_rent_type: 'Gross', ti_allowance_psf: '', capex_psf: '',
  parking_cost_monthly: '', parking_spaces: '', notes: '',
}

export default function ModelPage() {
  const [models, setModels] = useState<LeaseModel[]>([])
  const [activeModelId, setActiveModelId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNewModel, setShowNewModel] = useState(false)
  const [newModelTitle, setNewModelTitle] = useState('')
  const [newModelRate, setNewModelRate] = useState('8.0')
  const [creatingModel, setCreatingModel] = useState(false)

  // Scenario editing
  const [addingScenario, setAddingScenario] = useState(false)
  const [scenarioForm, setScenarioForm] = useState<Record<string, string>>({ ...BLANK_SCENARIO })
  const [savingScenario, setSavingScenario] = useState(false)
  const [editingScenarioId, setEditingScenarioId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [savingEdit, setSavingEdit] = useState(false)

  // PDF import
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState('')
  const importRef = useRef<HTMLInputElement>(null)

  // AI assistant
  const [aiOpen, setAiOpen] = useState(false)
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([])
  const [aiInput, setAiInput] = useState('')
  const [aiStreaming, setAiStreaming] = useState(false)
  const aiBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { load() }, [])
  useEffect(() => { aiBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [aiMessages])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/model')
    const data = await res.json()
    setModels(Array.isArray(data) ? data : [])
    if (data.length > 0 && !activeModelId) setActiveModelId(data[0].id)
    setLoading(false)
  }

  const activeModel = models.find((m) => m.id === activeModelId)

  async function createModel(e: React.FormEvent) {
    e.preventDefault()
    setCreatingModel(true)
    const res = await fetch('/api/model', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newModelTitle, discount_rate: parseFloat(newModelRate) }),
    })
    const data = await res.json()
    setModels((prev) => [data, ...prev])
    setActiveModelId(data.id)
    setShowNewModel(false)
    setNewModelTitle('')
    setCreatingModel(false)
  }

  async function addScenario() {
    if (!activeModelId) return
    setSavingScenario(true)
    const payload: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(scenarioForm)) {
      if (!v && v !== '0') continue
      const numFields = ['rsf','term_months','parking_spaces']
      const floatFields = ['base_rent_psf','expenses_psf','rent_escalation','free_rent_months','ti_allowance_psf','capex_psf','parking_cost_monthly']
      if (numFields.includes(k)) payload[k] = parseInt(v)
      else if (floatFields.includes(k)) payload[k] = parseFloat(v)
      else payload[k] = v
    }
    const res = await fetch(`/api/model/${activeModelId}/scenarios`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setModels((prev) => prev.map((m) => m.id === activeModelId
      ? { ...m, scenarios: [...m.scenarios, data] }
      : m
    ))
    setScenarioForm({ ...BLANK_SCENARIO })
    setAddingScenario(false)
    setSavingScenario(false)
    load()
  }

  async function saveEdit(scenarioId: number) {
    if (!activeModelId) return
    setSavingEdit(true)
    const payload: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(editForm)) {
      const numFields = ['rsf','term_months','parking_spaces']
      const floatFields = ['base_rent_psf','expenses_psf','rent_escalation','free_rent_months','ti_allowance_psf','capex_psf','parking_cost_monthly']
      if (numFields.includes(k)) payload[k] = v ? parseInt(v) : null
      else if (floatFields.includes(k)) payload[k] = v ? parseFloat(v) : null
      else payload[k] = v || null
    }
    await fetch(`/api/model/${activeModelId}/scenarios/${scenarioId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setEditingScenarioId(null)
    setEditForm({})
    setSavingEdit(false)
    load()
  }

  async function deleteScenario(scenarioId: number) {
    if (!activeModelId || !confirm('Remove this scenario?')) return
    await fetch(`/api/model/${activeModelId}/scenarios/${scenarioId}`, { method: 'DELETE' })
    load()
  }

  async function importFromPDF(file: File) {
    if (!activeModelId) return
    setImporting(true)
    setImportStatus(`Reading ${file.name}...`)
    const form = new FormData()
    form.append('file', file)
    setImportStatus('Extracting scenarios with Claude...')
    const res = await fetch(`/api/model/${activeModelId}/import`, { method: 'POST', body: form })
    const data = await res.json()
    if (res.ok) {
      setImportStatus(`✓ Imported ${data.imported} scenarios!`)
      load()
      setTimeout(() => setImportStatus(''), 3000)
    } else {
      setImportStatus(`Error: ${data.error}`)
    }
    setImporting(false)
  }

  async function sendAiMessage() {
    if (!aiInput.trim() || aiStreaming || !activeModelId) return
    const userMsg: AiMessage = { role: 'user', content: aiInput }
    const newHistory = [...aiMessages, userMsg]
    setAiMessages([...newHistory, { role: 'assistant', content: '' }])
    setAiInput('')
    setAiStreaming(true)

    const res = await fetch(`/api/model/${activeModelId}/ai`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: aiInput, history: aiMessages }),
    })
    if (!res.body) { setAiStreaming(false); return }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      full += decoder.decode(value)
      setAiMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: full }
        return updated
      })
    }
    setAiStreaming(false)
  }

  // Chart data
  const allYears = activeModel ? [...new Set(activeModel.scenarios.flatMap((s) => (s.cash_flows || []).map((cf) => cf.year)))].sort() : []
  const chartData = allYears.map((year) => {
    const row: Record<string, unknown> = { year }
    activeModel?.scenarios.forEach((s) => {
      const cf = (s.cash_flows || []).find((c) => c.year === year)
      row[s.name] = cf ? Math.round(cf.amount / 1000) : 0
    })
    return row
  })

  const COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#eab308']

  const SCENARIO_FIELDS = [
    { k: 'name', l: 'Scenario Name *', t: 'text' },
    { k: 'address', l: 'Address', t: 'text' },
    { k: 'suite', l: 'Suite / Floor', t: 'text' },
    { k: 'rsf', l: 'RSF', t: 'number' },
    { k: 'start_date', l: 'Start Date', t: 'date' },
    { k: 'term_months', l: 'Term (months)', t: 'number' },
    { k: 'lease_type', l: 'Lease Type', t: 'text' },
    { k: 'base_rent_psf', l: 'Base Rent PSF/Yr', t: 'number' },
    { k: 'expenses_psf', l: 'Expenses PSF/Yr', t: 'number' },
    { k: 'rent_escalation', l: 'Escalation % /Yr', t: 'number' },
    { k: 'free_rent_months', l: 'Free Rent (months)', t: 'number' },
    { k: 'free_rent_type', l: 'Free Rent Type', t: 'select', opts: ['Gross', 'Base'] },
    { k: 'ti_allowance_psf', l: 'TI Allowance PSF', t: 'number' },
    { k: 'capex_psf', l: 'Total Capex PSF', t: 'number' },
    { k: 'parking_cost_monthly', l: 'Parking $/Space/Mo', t: 'number' },
    { k: 'parking_spaces', l: '# Parking Spaces', t: 'number' },
    { k: 'notes', l: 'Notes', t: 'text' },
  ]

  function ScenarioFormFields({ form, setForm }: { form: Record<string, string>; setForm: (f: Record<string, string>) => void }) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {SCENARIO_FIELDS.map((f) => (
          <div key={f.k}>
            <label className="block text-xs text-gray-500 mb-1">{f.l}</label>
            {f.t === 'select' ? (
              <select value={form[f.k] || ''} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                {f.opts?.map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : (
              <input type={f.t} value={form[f.k] || ''} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lease Comparison Models</h1>
          <p className="text-sm text-gray-500 mt-1">Side-by-side financial analysis — NPV, effective rent, annual cash flows</p>
        </div>
        <button onClick={() => setShowNewModel(!showNewModel)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">
          + New Model
        </button>
      </div>

      {/* New model form */}
      {showNewModel && (
        <form onSubmit={createModel} className="bg-white rounded-xl border border-gray-200 p-5 mb-6 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Model Title (e.g. "Recast Analysis May 2026")</label>
            <input required type="text" value={newModelTitle} onChange={(e) => setNewModelTitle(e.target.value)}
              placeholder="e.g. Recast Analysis — North Loop vs West End"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">Discount Rate %</label>
            <input type="number" step="0.5" value={newModelRate} onChange={(e) => setNewModelRate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={creatingModel}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {creatingModel ? 'Creating…' : 'Create'}
          </button>
          <button type="button" onClick={() => setShowNewModel(false)}
            className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
        </form>
      )}

      {/* Model selector tabs */}
      {models.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {models.map((m) => (
            <button key={m.id} onClick={() => setActiveModelId(m.id)}
              className={`px-4 py-2 rounded-lg text-sm border transition ${activeModelId === m.id ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-300'}`}>
              {m.title}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : !activeModel ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">📊</div>
          <p>No models yet. Create one above to start comparing lease scenarios.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Model header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{activeModel.title}</h2>
              <p className="text-sm text-gray-500">Discount rate: {activeModel.discount_rate}% · {activeModel.scenarios.length} scenarios</p>
            </div>
            <div className="flex gap-3">
              <input ref={importRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) importFromPDF(f) }} />
              <button onClick={() => importRef.current?.click()} disabled={importing}
                className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-50">
                {importing ? `⏳ ${importStatus}` : '📄 Import PDF'}
              </button>
              {importStatus && !importing && (
                <span className="text-sm text-green-600 font-medium">{importStatus}</span>
              )}
              <button onClick={() => setAiOpen(!aiOpen)}
                className={`px-4 py-2 rounded-lg text-sm border transition ${aiOpen ? 'bg-blue-600 text-white border-blue-600' : 'border-blue-300 text-blue-600 hover:bg-blue-50'}`}>
                🤖 AI Assistant
              </button>
              <button onClick={() => setAddingScenario(!addingScenario)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">
                + Add Scenario
              </button>
            </div>
          </div>

          {/* AI Assistant panel */}
          {aiOpen && (
            <div className="bg-white rounded-xl border border-blue-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">🤖 Financial Model Assistant</h3>
              <p className="text-xs text-gray-400 mb-3">Ask questions or request changes: "What if NLG gives us 3 more months free rent?" or "Which scenario has the lowest effective rent?"</p>
              <div className="bg-gray-50 rounded-lg p-3 h-48 overflow-y-auto mb-3 space-y-2">
                {aiMessages.length === 0 ? (
                  <p className="text-xs text-gray-400">Ask me anything about these scenarios...</p>
                ) : aiMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                      {m.content || (aiStreaming && i === aiMessages.length - 1 ? '...' : '')}
                    </div>
                  </div>
                ))}
                <div ref={aiBottomRef} />
              </div>
              <div className="flex gap-2">
                <input type="text" value={aiInput} onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') sendAiMessage() }}
                  placeholder="e.g. What if we negotiate 3 more months free rent on NLG?"
                  disabled={aiStreaming}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                <button onClick={sendAiMessage} disabled={aiStreaming || !aiInput.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40">
                  {aiStreaming ? '⏳' : 'Ask'}
                </button>
              </div>
            </div>
          )}

          {/* Add scenario form */}
          {addingScenario && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Add Scenario</h3>
              <ScenarioFormFields form={scenarioForm} setForm={setScenarioForm} />
              <div className="flex gap-2 mt-4">
                <button onClick={addScenario} disabled={savingScenario || !scenarioForm.name}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {savingScenario ? 'Calculating…' : 'Add & Calculate'}
                </button>
                <button onClick={() => { setAddingScenario(false); setScenarioForm({ ...BLANK_SCENARIO }) }}
                  className="border border-gray-300 text-gray-600 px-5 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          )}

          {activeModel.scenarios.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
              <p>No scenarios yet. Add the first proposal above.</p>
            </div>
          ) : (
            <>
              {/* Main comparison table — JLL format */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-[#1a1a2e] px-6 py-4">
                  <h3 className="text-white font-bold">{activeModel.title}</h3>
                  <p className="text-gray-400 text-xs mt-0.5">Lease Comparison Analysis · Discount Rate: {activeModel.discount_rate}%</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 w-48 sticky left-0 bg-gray-50">Scenario</th>
                        {activeModel.scenarios.map((s, i) => (
                          <th key={s.id} className="text-center px-3 py-3 text-xs font-semibold min-w-[160px]" style={{ color: COLORS[i % COLORS.length] }}>
                            {s.name}
                            <div className="flex justify-center gap-1 mt-1">
                              <button onClick={() => { setEditingScenarioId(editingScenarioId === s.id ? null : s.id); setEditForm(Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v === null ? '' : String(v)]))) }}
                                className="text-gray-400 hover:text-blue-600 text-xs px-1">✎</button>
                              <button onClick={() => deleteScenario(s.id)} className="text-gray-400 hover:text-red-500 text-xs px-1">✕</button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Address */}
                      <tr className="border-b border-gray-100 bg-blue-50/30">
                        <td className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-blue-50/30" colSpan={activeModel.scenarios.length + 1}>Lease Terms</td>
                      </tr>
                      {[
                        ['Address', (s: Scenario) => s.address || '—'],
                        ['Suite', (s: Scenario) => s.suite || '—'],
                        ['RSF', (s: Scenario) => s.rsf ? `${s.rsf.toLocaleString()} SF` : '—'],
                        ['Start Date', (s: Scenario) => s.start_date || '—'],
                        ['Term', (s: Scenario) => s.term_months ? `${s.term_months} months` : '—'],
                        ['Lease Expiration', (s: Scenario) => {
                          if (!s.start_date || !s.term_months) return '—'
                          const d = new Date(s.start_date); d.setMonth(d.getMonth() + s.term_months)
                          return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
                        }],
                        ['Lease Type', (s: Scenario) => s.lease_type || '—'],
                        ['Base Rent (PSF/Yr)', (s: Scenario) => fmtPSF(s.base_rent_psf)],
                        ['Expenses (PSF/Yr)', (s: Scenario) => fmtPSF(s.expenses_psf)],
                        ['Gross Rent (PSF/Yr)', (s: Scenario) => fmtPSF((s.base_rent_psf || 0) + (s.expenses_psf || 0))],
                        ['Rent Escalation', (s: Scenario) => s.rent_escalation ? `${s.rent_escalation}% annually` : '—'],
                        ['Free Rent', (s: Scenario) => s.free_rent_months ? `${s.free_rent_months} months - ${s.free_rent_type || 'Gross'}` : '—'],
                      ].map(([label, getValue]) => (
                        <tr key={label as string} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-2 text-xs text-gray-600 sticky left-0 bg-white">{label as string}</td>
                          {activeModel.scenarios.map((s) => (
                            <td key={s.id} className="px-3 py-2 text-xs text-center text-gray-800">
                              {(getValue as (s: Scenario) => string)(s)}
                            </td>
                          ))}
                        </tr>
                      ))}

                      {/* Capex */}
                      <tr className="border-b border-gray-100 bg-blue-50/30">
                        <td className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-blue-50/30" colSpan={activeModel.scenarios.length + 1}>Capex Summary</td>
                      </tr>
                      {[
                        ['Total Capex (PSF)', (s: Scenario) => fmtPSF(s.capex_psf)],
                        ['TI Allowance (PSF)', (s: Scenario) => s.ti_allowance_psf ? `(${fmtPSF(s.ti_allowance_psf)})` : '—'],
                        ['Net Capital Cost (PSF)', (s: Scenario) => fmtPSF(Math.max(0, (s.capex_psf || 0) - (s.ti_allowance_psf || 0)))],
                        ['Net Capital Cost', (s: Scenario) => fmt$(Math.max(0, ((s.capex_psf || 0) - (s.ti_allowance_psf || 0))) * (s.rsf || 0))],
                      ].map(([label, getValue]) => (
                        <tr key={label as string} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-2 text-xs text-gray-600 sticky left-0 bg-white">{label as string}</td>
                          {activeModel.scenarios.map((s) => (
                            <td key={s.id} className="px-3 py-2 text-xs text-center text-gray-800">{(getValue as (s: Scenario) => string)(s)}</td>
                          ))}
                        </tr>
                      ))}

                      {/* Financial summary */}
                      <tr className="border-b border-gray-100 bg-blue-50/30">
                        <td className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-blue-50/30" colSpan={activeModel.scenarios.length + 1}>Financial Summary</td>
                      </tr>
                      {[
                        ['NPV of Total Cost', (s: Scenario) => fmt$(s.npv), true],
                        ['Total Occupancy Cost', (s: Scenario) => fmt$(s.total_occupancy_cost)],
                        ['Annual Avg Total Cost', (s: Scenario) => fmt$(s.annual_avg_cost)],
                        ['Avg Occupancy Cost PSF/Yr', (s: Scenario) => fmtPSF(s.avg_cost_psf)],
                        ['Net Effective Rent PSF/Yr', (s: Scenario) => fmtPSF(s.net_effective_rent_psf), true],
                      ].map(([label, getValue, bold]) => {
                        // Find best (lowest) value for highlighting
                        const vals = activeModel.scenarios.map((s) => {
                          const v = (getValue as (s: Scenario) => string)(s)
                          return parseFloat(v.replace(/[$,()]/g, '')) || Infinity
                        })
                        const minVal = Math.min(...vals)
                        return (
                          <tr key={label as string} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-2 text-xs text-gray-600 sticky left-0 bg-white font-medium">{label as string}</td>
                            {activeModel.scenarios.map((s, i) => {
                              const v = (getValue as (s: Scenario) => string)(s)
                              const num = parseFloat(v.replace(/[$,()]/g, '')) || Infinity
                              const isBest = num === minVal && minVal !== Infinity
                              return (
                                <td key={s.id} className={`px-3 py-2 text-xs text-center font-${bold ? 'bold' : 'medium'} ${isBest ? 'text-green-700 bg-green-50' : 'text-gray-800'}`}>
                                  {v}
                                  {isBest && <span className="ml-1 text-green-600">★</span>}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}

                      {/* Annual cash flows */}
                      <tr className="border-b border-gray-100 bg-blue-50/30">
                        <td className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-blue-50/30" colSpan={activeModel.scenarios.length + 1}>Annual Cash Flows (figures in $1,000s)</td>
                      </tr>
                      {allYears.map((year) => (
                        <tr key={year} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-2 text-xs text-gray-600 sticky left-0 bg-white">CY {year}</td>
                          {activeModel.scenarios.map((s) => {
                            const cf = (s.cash_flows || []).find((c) => c.year === year)
                            return (
                              <td key={s.id} className="px-3 py-2 text-xs text-center text-gray-800">
                                {cf && cf.amount > 0 ? `$${(cf.amount / 1000).toFixed(1)}` : '—'}
                              </td>
                            )
                          })}
                        </tr>
                      ))}

                      {/* Notes */}
                      <tr className="border-b border-gray-100 bg-blue-50/30">
                        <td className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-blue-50/30" colSpan={activeModel.scenarios.length + 1}>Notes</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-xs text-gray-500 sticky left-0 bg-white">Notes</td>
                        {activeModel.scenarios.map((s) => (
                          <td key={s.id} className="px-3 py-3 text-xs text-gray-600 text-center">{s.notes || '—'}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Edit scenario panel */}
              {editingScenarioId && (
                <div className="bg-white rounded-xl border border-blue-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">
                    Edit: {activeModel.scenarios.find((s) => s.id === editingScenarioId)?.name}
                  </h3>
                  <ScenarioFormFields form={editForm} setForm={setEditForm} />
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => saveEdit(editingScenarioId)} disabled={savingEdit}
                      className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                      {savingEdit ? 'Recalculating…' : 'Save & Recalculate'}
                    </button>
                    <button onClick={() => { setEditingScenarioId(null); setEditForm({}) }}
                      className="border border-gray-300 text-gray-600 px-5 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              )}

              {/* Charts */}
              {chartData.length > 0 && (
                <div className="grid grid-cols-2 gap-5">
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Total & Annual Average Occupancy Cost</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={activeModel.scenarios.map((s) => ({
                        name: s.name.slice(0, 15),
                        'Total Cost': s.total_occupancy_cost ? Math.round(s.total_occupancy_cost / 1000) : 0,
                        'Annual Avg': s.annual_avg_cost ? Math.round(s.annual_avg_cost / 1000) : 0,
                        NPV: s.npv ? Math.round(s.npv / 1000) : 0,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v) => [`$${Number(v)}K`]} />
                        <Legend />
                        <Bar dataKey="NPV" fill="#3b82f6" />
                        <Bar dataKey="Total Cost" fill="#e5e7eb" />
                        <Bar dataKey="Annual Avg" fill="#f97316" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Annual Cash Flows ($K)</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v) => [`$${Number(v)}K`]} />
                        <Legend />
                        {activeModel.scenarios.map((s, i) => (
                          <Line key={s.id} type="monotone" dataKey={s.name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
