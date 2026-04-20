'use client'

import { useEffect, useState, useMemo } from 'react'

interface Template {
  id: string
  name: string
  category: string
  subject: string
  body: string
  variables: string[]
}

const CATEGORY_COLORS: Record<string, string> = {
  'Cold Outreach': 'bg-blue-100 text-blue-700',
  'Lease Expiration': 'bg-orange-100 text-orange-700',
  'REIT Intelligence': 'bg-purple-100 text-purple-700',
  'Follow-up': 'bg-gray-100 text-gray-600',
}

const VAR_LABELS: Record<string, string> = {
  company: 'Company Name',
  contact_name: 'Contact Name',
  city: 'City',
  trigger: 'Trigger (e.g. "expiring in 2026")',
  broker_name: 'Your Name',
  property: 'Property Name',
  expiration: 'Lease Expiration Date',
  reit_name: 'REIT Name',
  market_note: 'Market Insight',
}

function fillTemplate(text: string, vars: Record<string, string>): string {
  let result = text
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`)
  }
  return result
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Template | null>(null)
  const [vars, setVars] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<'subject' | 'body' | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')

  // Pre-fill broker name from localStorage
  const [brokerName, setBrokerName] = useState('')

  useEffect(() => {
    fetch('/api/email-templates').then((r) => r.json()).then((data) => {
      setTemplates(data)
      setLoading(false)
    })
    const saved = localStorage.getItem('cre_broker_name')
    if (saved) setBrokerName(saved)
  }, [])

  useEffect(() => {
    if (selected) {
      const defaults: Record<string, string> = { broker_name: brokerName }
      setVars(defaults)
    }
  }, [selected, brokerName])

  function saveBrokerName(name: string) {
    setBrokerName(name)
    localStorage.setItem('cre_broker_name', name)
  }

  const categories = useMemo(() => [...new Set(templates.map((t) => t.category))], [templates])

  const filtered = useMemo(() => {
    let rows = templates
    if (categoryFilter) rows = rows.filter((t) => t.category === categoryFilter)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter((t) => t.name.toLowerCase().includes(q) || t.body.toLowerCase().includes(q))
    }
    return rows
  }, [templates, categoryFilter, search])

  const filledSubject = selected ? fillTemplate(selected.subject, vars) : ''
  const filledBody = selected ? fillTemplate(selected.body, vars) : ''
  const hasUnfilled = filledBody.includes('{{') || filledSubject.includes('{{')

  async function copyToClipboard(text: string, type: 'subject' | 'body') {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Your name:</label>
          <input
            type="text"
            value={brokerName}
            onChange={(e) => saveBrokerName(e.target.value)}
            placeholder="Eddie Rymer"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 w-40"
          />
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left: template list */}
        <div className="w-80 flex-shrink-0">
          <div className="flex gap-2 mb-3">
            <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={() => setCategoryFilter('')}
              className={`text-xs px-3 py-1 rounded-full border transition ${!categoryFilter ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>
              All
            </button>
            {categories.map((c) => (
              <button key={c} onClick={() => setCategoryFilter(categoryFilter === c ? '' : c)}
                className={`text-xs px-3 py-1 rounded-full border transition ${categoryFilter === c ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                {c}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                    selected?.id === t.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-gray-900 text-sm mb-1">{t.name}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[t.category] || 'bg-gray-100 text-gray-600'}`}>
                    {t.category}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: composer */}
        <div className="flex-1">
          {!selected ? (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-400">
              <div className="text-4xl mb-3">✉️</div>
              <p>Select a template to compose</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Variable fill-in */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Fill in Variables</h2>
                <div className="grid grid-cols-2 gap-3">
                  {selected.variables.map((v) => (
                    <div key={v}>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {VAR_LABELS[v] || v}
                      </label>
                      <input
                        type="text"
                        value={vars[v] || ''}
                        onChange={(e) => setVars((p) => ({ ...p, [v]: e.target.value }))}
                        placeholder={`{{${v}}}`}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>
                {hasUnfilled && (
                  <p className="text-xs text-orange-600 mt-3">
                    ⚠️ Some variables are still unfilled — they&apos;ll appear as {'{{placeholders}}'} in the output.
                  </p>
                )}
              </div>

              {/* Subject */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-gray-700">Subject Line</h2>
                  <button onClick={() => copyToClipboard(filledSubject, 'subject')}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                      copied === 'subject' ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'
                    }`}>
                    {copied === 'subject' ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-800 font-medium">
                  {filledSubject}
                </div>
              </div>

              {/* Body */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-gray-700">Email Body</h2>
                  <button onClick={() => copyToClipboard(filledBody, 'body')}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                      copied === 'body' ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'
                    }`}>
                    {copied === 'body' ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="bg-gray-50 rounded-lg px-4 py-4 text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {filledBody}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
