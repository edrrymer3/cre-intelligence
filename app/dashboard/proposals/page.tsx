'use client'

import { useState, useEffect } from 'react'

interface ProposalAnalysis {
  id: number
  file_name: string
  landlord: string | null
  building_name: string | null
  city: string | null
  state: string | null
  sqft: number | null
  term_years: number | null
  base_rent_psf: number | null
  rent_escalation: number | null
  free_rent_months: number | null
  ti_psf: number | null
  other_concessions: string | null
  total_cost: number | null
  effective_rent_psf: number | null
  npv: number | null
  ai_summary: string | null
  created_date: string
  uploaded_by: string | null
}

interface RFPResponse {
  id: number
  title: string
  content: string
  generated_date: string
}

interface PitchDeck {
  id: number
  title: string
  content: string
  generated_date: string
}

type Tab = 'analyzer' | 'rfp' | 'pitch'

function fmt$(n: number | null) { return n ? `$${n.toLocaleString()}` : '—' }
function fmtPSF(n: number | null) { return n ? `$${n.toFixed(2)}/SF` : '—' }

export default function ProposalsPage() {
  const [tab, setTab] = useState<Tab>('analyzer')

  // Analyzer state
  const [analyses, setAnalyses] = useState<ProposalAnalysis[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [proposalText, setProposalText] = useState('')
  const [proposalName, setProposalName] = useState('')
  const [compareIds, setCompareIds] = useState<number[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // RFP state
  const [rfpResponses, setRfpResponses] = useState<RFPResponse[]>([])
  const [generatingRfp, setGeneratingRfp] = useState(false)
  const [rfpForm, setRfpForm] = useState({ rfpText: '', companyName: '', propertyType: 'office', targetSF: '', targetCity: 'Minneapolis', filingIntel: '' })
  const [rfpResult, setRfpResult] = useState('')
  const [rfpExampleText, setRfpExampleText] = useState('')
  const [savingExample, setSavingExample] = useState(false)

  // Pitch state
  const [pitchDecks, setPitchDecks] = useState<PitchDeck[]>([])
  const [generatingPitch, setGeneratingPitch] = useState(false)
  const [pitchForm, setPitchForm] = useState({ companyName: '', propertyType: 'office', city: '', sqft: '', leaseExpirationYear: '', triggerEvents: '', realEstateStrategy: '', opportunityScore: '' })
  const [pitchResult, setPitchResult] = useState('')
  const [pitchTemplate, setPitchTemplate] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const [a, r, p] = await Promise.all([
      fetch('/api/proposals').then((r) => r.json()),
      fetch('/api/rfp').then((r) => r.json()),
      fetch('/api/pitch').then((r) => r.json()),
    ])
    setAnalyses(Array.isArray(a) ? a : [])
    setRfpResponses(r.responses || [])
    setPitchDecks(p.decks || [])
  }

  // ─── Proposal Analyzer ───────────────────────────────────────────────────

  async function analyzeProposal() {
    if (!proposalText || !proposalName) return
    setAnalyzing(true)
    const res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: proposalText, filename: proposalName }),
    })
    const data = await res.json()
    setAnalyses((prev) => [data, ...prev])
    setProposalText('')
    setProposalName('')
    setAnalyzing(false)
  }

  const compareSelected = analyses.filter((a) => compareIds.includes(a.id))

  // ─── RFP Generator ───────────────────────────────────────────────────────

  async function generateRFP() {
    setGeneratingRfp(true)
    setRfpResult('')
    const res = await fetch('/api/rfp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rfpForm),
    })
    const data = await res.json()
    setRfpResult(data.content || '')
    setRfpResponses((prev) => [data, ...prev])
    setGeneratingRfp(false)
  }

  async function saveRFPExample() {
    if (!rfpExampleText) return
    setSavingExample(true)
    await fetch('/api/rfp', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Example RFP Response', content: rfpExampleText, is_example: true }),
    })
    setRfpExampleText('')
    setSavingExample(false)
    alert('Example saved! Future RFPs will learn from it.')
  }

  // ─── Pitch Generator ─────────────────────────────────────────────────────

  async function generatePitch() {
    setGeneratingPitch(true)
    setPitchResult('')
    const res = await fetch('/api/pitch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...pitchForm,
        sqft: pitchForm.sqft ? parseInt(pitchForm.sqft) : null,
        leaseExpirationYear: pitchForm.leaseExpirationYear ? parseInt(pitchForm.leaseExpirationYear) : null,
        opportunityScore: pitchForm.opportunityScore ? parseInt(pitchForm.opportunityScore) : null,
        triggerEvents: pitchForm.triggerEvents ? pitchForm.triggerEvents.split(',').map((t) => t.trim()) : [],
      }),
    })
    const data = await res.json()
    setPitchResult(data.content || '')
    setPitchDecks((prev) => [data, ...prev])
    setGeneratingPitch(false)
  }

  async function savePitchTemplate() {
    if (!pitchTemplate) return
    setSavingTemplate(true)
    await fetch('/api/pitch', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Pitch Template', content: pitchTemplate }),
    })
    setPitchTemplate('')
    setSavingTemplate(false)
    alert('Template saved! Future pitch decks will follow this structure.')
  }

  const TABS = [
    { id: 'analyzer', label: '📊 Proposal Analyzer', desc: 'Compare competing proposals side by side' },
    { id: 'rfp', label: '📋 RFP Generator', desc: 'Generate RFP responses from examples' },
    { id: 'pitch', label: '🎯 Pitch Deck', desc: 'Auto-generate prospect pitch decks' },
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Proposals & Pitches</h1>
      <p className="text-gray-500 text-sm mb-6">Financial analysis, RFP responses, and pitch deck generation — all powered by AI.</p>

      {/* Tab selector */}
      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as Tab)}
            className={`px-5 py-3 rounded-xl text-sm font-medium transition border ${tab === t.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── PROPOSAL ANALYZER ─── */}
      {tab === 'analyzer' && (
        <div className="space-y-6">
          {/* Input */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Analyze a Proposal</h2>
            <p className="text-sm text-gray-500 mb-4">Paste the text from a landlord proposal letter or LOI. Claude will extract all the economics and calculate effective rent and NPV.</p>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Proposal Name / Building</label>
              <input type="text" value={proposalName} onChange={(e) => setProposalName(e.target.value)}
                placeholder="e.g. 225 South Sixth — Landlord Proposal" 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Paste Proposal Text</label>
              <textarea rows={6} value={proposalText} onChange={(e) => setProposalText(e.target.value)}
                placeholder="Paste the full text of the landlord's proposal or LOI here..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none" />
            </div>
            <button onClick={analyzeProposal} disabled={analyzing || !proposalText || !proposalName}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-40">
              {analyzing ? '⏳ Analyzing…' : '📊 Analyze Proposal'}
            </button>
          </div>

          {/* Comparison view */}
          {compareSelected.length >= 2 && (
            <div className="bg-white rounded-xl border border-blue-200 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Side-by-Side Comparison</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Metric</th>
                      {compareSelected.map((a) => (
                        <th key={a.id} className="text-left px-4 py-3 text-xs font-semibold text-gray-800">{a.building_name || a.file_name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      ['Landlord', (a: ProposalAnalysis) => a.landlord || '—'],
                      ['SF', (a: ProposalAnalysis) => a.sqft ? a.sqft.toLocaleString() + ' SF' : '—'],
                      ['Term', (a: ProposalAnalysis) => a.term_years ? `${a.term_years} years` : '—'],
                      ['Base Rent PSF', (a: ProposalAnalysis) => fmtPSF(a.base_rent_psf)],
                      ['Annual Escalation', (a: ProposalAnalysis) => a.rent_escalation ? `${a.rent_escalation}%` : '—'],
                      ['Free Rent', (a: ProposalAnalysis) => a.free_rent_months ? `${a.free_rent_months} months` : '—'],
                      ['TI Allowance', (a: ProposalAnalysis) => fmtPSF(a.ti_psf)],
                      ['Effective Rent PSF', (a: ProposalAnalysis) => fmtPSF(a.effective_rent_psf)],
                      ['Total Cost', (a: ProposalAnalysis) => fmt$(a.total_cost)],
                      ['NPV', (a: ProposalAnalysis) => fmt$(a.npv)],
                    ].map(([label, getValue]) => (
                      <tr key={label as string}>
                        <td className="px-4 py-2 font-medium text-gray-700">{label as string}</td>
                        {compareSelected.map((a) => {
                          const val = (getValue as (a: ProposalAnalysis) => string)(a)
                          const isEffRent = label === 'Effective Rent PSF'
                          const isNPV = label === 'NPV'
                          const vals = compareSelected.map((x) => (getValue as (a: ProposalAnalysis) => string)(x))
                          const isBest = isEffRent || isNPV
                            ? val === [...vals].sort()[0]
                            : false
                          return (
                            <td key={a.id} className={`px-4 py-2 ${isBest ? 'text-green-700 font-bold bg-green-50' : 'text-gray-700'}`}>
                              {val}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={() => setCompareIds([])} className="mt-4 text-sm text-gray-500 hover:text-gray-700">Clear comparison</button>
            </div>
          )}

          {/* Analyses list */}
          {analyses.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Analyzed Proposals ({analyses.length})</h2>
                {compareIds.length >= 2 && (
                  <span className="text-xs text-blue-600 font-medium">Scroll up to see comparison ↑</span>
                )}
              </div>
              <div className="divide-y divide-gray-100">
                {analyses.map((a) => (
                  <div key={a.id}>
                    <div className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}>
                      <input type="checkbox" checked={compareIds.includes(a.id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          setCompareIds((prev) => e.target.checked ? [...prev, a.id] : prev.filter((id) => id !== a.id))
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm">{a.building_name || a.file_name}</div>
                        <div className="text-xs text-gray-400">{a.landlord} · {[a.city, a.state].filter(Boolean).join(', ')} · {new Date(a.created_date).toLocaleDateString()}</div>
                      </div>
                      <div className="flex gap-8 text-sm text-right">
                        <div><div className="font-semibold text-gray-900">{fmtPSF(a.effective_rent_psf)}</div><div className="text-xs text-gray-400">Eff. Rent</div></div>
                        <div><div className="font-semibold text-gray-900">{fmt$(a.total_cost)}</div><div className="text-xs text-gray-400">Total Cost</div></div>
                        <div><div className="font-semibold text-gray-900">{fmt$(a.npv)}</div><div className="text-xs text-gray-400">NPV</div></div>
                      </div>
                    </div>
                    {expandedId === a.id && (
                      <div className="px-6 py-4 bg-blue-50 border-t border-blue-100">
                        <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
                          {[['SF', a.sqft ? a.sqft.toLocaleString() : '—'], ['Term', a.term_years ? `${a.term_years} yr` : '—'], ['Base Rent', fmtPSF(a.base_rent_psf)], ['Escalation', a.rent_escalation ? `${a.rent_escalation}%` : '—'], ['Free Rent', a.free_rent_months ? `${a.free_rent_months} mo` : '—'], ['TI', fmtPSF(a.ti_psf)], ['Other', a.other_concessions || '—'], ['By', a.uploaded_by || '—']].map(([k, v]) => (
                            <div key={k}><p className="text-xs text-gray-400">{k}</p><p className="font-medium text-gray-900">{v}</p></div>
                          ))}
                        </div>
                        {a.ai_summary && <p className="text-sm text-gray-600 bg-white rounded-lg p-3 border border-blue-100">{a.ai_summary}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {analyses.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <div className="text-4xl mb-3">📊</div>
              <p>No proposals analyzed yet. Paste a landlord proposal above to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── RFP GENERATOR ─── */}
      {tab === 'rfp' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Generate */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Generate RFP Response</h2>
              <div className="space-y-3">
                {[['companyName','Tenant Company Name','text'],['targetCity','Target City','text'],['targetSF','Target SF','text']].map(([k,l,t]) => (
                  <div key={k}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{l}</label>
                    <input type={t} value={(rfpForm as Record<string,string>)[k]} onChange={(e) => setRfpForm((p) => ({ ...p, [k]: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Property Type</label>
                  <select value={rfpForm.propertyType} onChange={(e) => setRfpForm((p) => ({ ...p, propertyType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                    <option value="office">Office</option>
                    <option value="industrial">Industrial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Paste RFP Requirements</label>
                  <textarea rows={4} value={rfpForm.rfpText} onChange={(e) => setRfpForm((p) => ({ ...p, rfpText: e.target.value }))}
                    placeholder="Paste the RFP or key requirements here..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Filing Intel (optional)</label>
                  <textarea rows={2} value={rfpForm.filingIntel} onChange={(e) => setRfpForm((p) => ({ ...p, filingIntel: e.target.value }))}
                    placeholder="Any intel from their SEC filings..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none" />
                </div>
                <button onClick={generateRFP} disabled={generatingRfp || !rfpForm.rfpText || !rfpForm.companyName}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                  {generatingRfp ? '⏳ Generating…' : '📋 Generate RFP Response'}
                </button>
              </div>
            </div>

            {/* Train with examples */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-2">Train with Examples</h2>
              <p className="text-xs text-gray-400 mb-4">Paste a winning RFP response you've written before. Carmen will learn your voice and structure.</p>
              <textarea rows={8} value={rfpExampleText} onChange={(e) => setRfpExampleText(e.target.value)}
                placeholder="Paste an example RFP response here..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none mb-3" />
              <button onClick={saveRFPExample} disabled={savingExample || !rfpExampleText}
                className="w-full bg-gray-800 text-white py-2 rounded-lg text-sm hover:bg-gray-900 disabled:opacity-40">
                {savingExample ? 'Saving…' : '💾 Save as Example'}
              </button>
            </div>
          </div>

          {/* Generated result */}
          {rfpResult && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-800">Generated RFP Response</h2>
                <button onClick={() => navigator.clipboard.writeText(rfpResult)}
                  className="text-sm border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg hover:border-blue-400 hover:text-blue-600 transition">
                  Copy
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">{rfpResult}</pre>
            </div>
          )}

          {/* History */}
          {rfpResponses.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Past RFP Responses ({rfpResponses.length})</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {rfpResponses.map((r) => (
                  <div key={r.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer" onClick={() => setRfpResult(r.content)}>
                    <span className="text-sm text-gray-800">{r.title}</span>
                    <span className="text-xs text-gray-400">{new Date(r.generated_date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── PITCH DECK ─── */}
      {tab === 'pitch' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Generate */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Generate Pitch Deck</h2>
              <div className="space-y-3">
                {[['companyName','Company Name','text'],['city','City','text'],['sqft','Current SF (approx)','number'],['leaseExpirationYear','Lease Expiration Year','number'],['triggerEvents','Trigger Events (comma separated)','text']].map(([k,l,t]) => (
                  <div key={k}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{l}</label>
                    <input type={t} value={(pitchForm as Record<string,string>)[k]} onChange={(e) => setPitchForm((p) => ({ ...p, [k]: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Property Type</label>
                  <select value={pitchForm.propertyType} onChange={(e) => setPitchForm((p) => ({ ...p, propertyType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                    <option value="office">Office</option><option value="industrial">Industrial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Real Estate Strategy (from filings)</label>
                  <textarea rows={2} value={pitchForm.realEstateStrategy} onChange={(e) => setPitchForm((p) => ({ ...p, realEstateStrategy: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none" />
                </div>
                <button onClick={generatePitch} disabled={generatingPitch || !pitchForm.companyName}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                  {generatingPitch ? '⏳ Generating…' : '🎯 Generate Pitch Deck'}
                </button>
              </div>
            </div>

            {/* Template */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-2">Pitch Template</h2>
              <p className="text-xs text-gray-400 mb-4">Paste your preferred pitch deck structure. Future pitches will follow this format.</p>
              <textarea rows={8} value={pitchTemplate} onChange={(e) => setPitchTemplate(e.target.value)}
                placeholder="Paste your pitch deck template or outline here..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none mb-3" />
              <button onClick={savePitchTemplate} disabled={savingTemplate || !pitchTemplate}
                className="w-full bg-gray-800 text-white py-2 rounded-lg text-sm hover:bg-gray-900 disabled:opacity-40">
                {savingTemplate ? 'Saving…' : '💾 Save Template'}
              </button>
            </div>
          </div>

          {/* Generated result */}
          {pitchResult && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-800">Generated Pitch Deck Outline</h2>
                <button onClick={() => navigator.clipboard.writeText(pitchResult)}
                  className="text-sm border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg hover:border-blue-400 hover:text-blue-600 transition">
                  Copy
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">{pitchResult}</pre>
            </div>
          )}

          {/* History */}
          {pitchDecks.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Past Pitch Decks ({pitchDecks.length})</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {pitchDecks.map((d) => (
                  <div key={d.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer" onClick={() => setPitchResult(d.content)}>
                    <span className="text-sm text-gray-800">{d.title}</span>
                    <span className="text-xs text-gray-400">{new Date(d.generated_date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
