'use client'

import { useEffect, useState, useRef } from 'react'

interface Stats {
  companies: number
  reits: number
  properties: number
  alerts: number
  lastRun: string | null
}

interface AppSettings {
  id: number
  weekly_digest_enabled: boolean
  digest_email: string
  commission_rate_psf: number
}

const SCRIPTS = [
  { id: 'discover-companies', label: 'Run Company Discovery', description: 'Searches EDGAR for MN-headquartered companies (3 sources)', icon: '🔍' },
  { id: 'discover-reits', label: 'Run REIT Discovery', description: 'Scans EDGAR SIC 6798 REITs for MN office/industrial presence', icon: '🏗️' },
  { id: 'extract-filings', label: 'Run Filing Extraction', description: 'Downloads 10-Qs and 8-Ks, runs Claude AI extraction', icon: '🤖' },
  { id: 'weekly-digest', label: 'Send Weekly Digest', description: 'Sends the weekly email digest now (ignores schedule)', icon: '📧' },
  { id: 'market-intelligence', label: 'Run Market Intelligence', description: 'Scans MN CRE market for news, leases, and relocations using Claude', icon: '📰' },
  { id: 'monitor-news', label: 'Run Company News Monitor', description: 'Scans all active watchlist companies for real estate news (past 7 days)', icon: '📡' },
]

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [runningScript, setRunningScript] = useState<string | null>(null)
  const [logs, setLogs] = useState<Record<string, string>>({})
  const [digestSending, setDigestSending] = useState(false)
  const [digestResult, setDigestResult] = useState<string | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [contactsRunning, setContactsRunning] = useState(false)
  const [contactsLog, setContactsLog] = useState('')
  const [researchRunning, setResearchRunning] = useState(false)
  const [researchLog, setResearchLog] = useState('')
  const [scoringRunning, setScoringRunning] = useState(false)
  const logRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    fetch('/api/admin/stats').then((r) => r.json()).then(setStats)
    fetch('/api/settings').then((r) => r.json()).then(setSettings)
  }, [])

  async function runScript(scriptId: string) {
    if (runningScript) return
    setRunningScript(scriptId)
    setLogs((prev) => ({ ...prev, [scriptId]: '' }))

    try {
      const res = await fetch('/api/admin/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: scriptId }),
      })
      if (!res.body) { setRunningScript(null); return }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setLogs((prev) => {
          const updated = (prev[scriptId] || '') + chunk
          setTimeout(() => { const el = logRefs.current[scriptId]; if (el) el.scrollTop = el.scrollHeight }, 0)
          return { ...prev, [scriptId]: updated }
        })
      }
    } catch (err) {
      setLogs((prev) => ({ ...prev, [scriptId]: `Error: ${err}` }))
    }
    setRunningScript(null)
    fetch('/api/admin/stats').then((r) => r.json()).then(setStats)
  }

  async function sendTestDigest() {
    setDigestSending(true)
    setDigestResult(null)
    const res = await fetch('/api/digest/send', { method: 'POST' })
    const data = await res.json()
    setDigestResult(res.ok ? `✓ Sent to ${data.sentTo}` : `✗ ${data.error}`)
    setDigestSending(false)
  }

  async function saveSettings() {
    if (!settings) return
    setSavingSettings(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekly_digest_enabled: settings.weekly_digest_enabled,
        digest_email: settings.digest_email,
        commission_rate_psf: settings.commission_rate_psf,
      }),
    })
    setSavingSettings(false)
  }

  async function findAllContacts() {
    setContactsRunning(true)
    setContactsLog('Finding contacts for all high-opportunity companies (score 4-5)...\n')

    // Get high-score companies
    const res = await fetch('/api/properties?minScore=4')
    const props = await res.json()
    const companyIds = [...new Set((props as { company_id: number | null }[]).map((p) => p.company_id).filter(Boolean))] as number[]

    setContactsLog((prev) => prev + `Found ${companyIds.length} companies to process.\n`)

    let found = 0
    for (const id of companyIds.slice(0, 20)) { // cap at 20 to avoid rate limits
      const result = await fetch(`/api/contacts/${id}`, { method: 'POST' })
      const data = await result.json()
      if (data.found > 0) {
        found += data.saved
        setContactsLog((prev) => prev + `  ✓ Company ${id}: ${data.found} found, ${data.saved} saved\n`)
      }
      await new Promise((r) => setTimeout(r, 500))
    }

    setContactsLog((prev) => prev + `\nDone. Total contacts saved: ${found}`)
    setContactsRunning(false)
    fetch('/api/admin/stats').then((r) => r.json()).then(setStats)
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Panel</h1>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Companies', value: stats.companies },
            { label: 'REITs', value: stats.reits },
            { label: 'Properties', value: stats.properties },
            { label: 'Unreviewed Alerts', value: stats.alerts },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-2xl font-bold text-gray-900">{s.value.toLocaleString()}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Digest Settings */}
      {settings && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">📬 Digest Settings</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Digest Email</label>
              <input type="email" value={settings.digest_email}
                onChange={(e) => setSettings((p) => p ? { ...p, digest_email: e.target.value } : p)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Commission Rate ($/SF)</label>
              <input type="number" step="0.25" value={settings.commission_rate_psf}
                onChange={(e) => setSettings((p) => p ? { ...p, commission_rate_psf: parseFloat(e.target.value) } : p)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setSettings((p) => p ? { ...p, weekly_digest_enabled: !p.weekly_digest_enabled } : p)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.weekly_digest_enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${settings.weekly_digest_enabled ? 'translate-x-4' : 'translate-x-1'}`} />
                </div>
                <span className="text-sm text-gray-700">Weekly digest enabled</span>
              </label>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={saveSettings} disabled={savingSettings}
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
              {savingSettings ? 'Saving…' : 'Save Settings'}
            </button>
            <button onClick={sendTestDigest} disabled={digestSending}
              className="text-sm border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition disabled:opacity-50">
              {digestSending ? '⏳ Sending…' : '📧 Send Test Digest Now'}
            </button>
            {digestResult && (
              <span className={`text-sm ${digestResult.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                {digestResult}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Cron schedules: Weekly digest → Mondays 7am CT · Discovery scripts → Jan/Apr/Jul/Oct 1st
          </p>
        </div>
      )}

      {/* Contact Finder */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-800">🔎 Find All Contacts</h2>
            <p className="text-sm text-gray-500 mt-1">
              Run Claude contact search for all companies with opportunity score 4–5 (max 20 at a time)
            </p>
          </div>
          <button onClick={findAllContacts} disabled={contactsRunning}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${
              contactsRunning ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}>
            {contactsRunning ? '⏳ Running…' : 'Find Contacts'}
          </button>
        </div>
        {contactsLog && (
          <div className="bg-gray-900 text-green-400 text-xs font-mono rounded-lg p-4 h-32 overflow-y-auto whitespace-pre-wrap mt-2">
            {contactsLog}
          </div>
        )}
      </div>

      {/* Deep Research */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-800">🔬 Deep Research — All Hot Prospects</h2>
            <p className="text-sm text-gray-500 mt-1">Runs Claude research report on all companies with score ≥4 or priority score ≥70</p>
          </div>
          <div className="flex gap-2">
            <button onClick={async () => {
              setScoringRunning(true)
              await fetch('/api/scoring', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
              setScoringRunning(false)
            }} disabled={scoringRunning}
              className="text-sm border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition disabled:opacity-50">
              {scoringRunning ? '⏳ Scoring…' : '📊 Recalculate Scores'}
            </button>
            <button onClick={async () => {
              setResearchRunning(true)
              setResearchLog('')
              const res = await fetch('/api/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all_hot: true }) })
              if (!res.body) { setResearchRunning(false); return }
              const reader = res.body.getReader()
              const decoder = new TextDecoder()
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                setResearchLog((prev) => prev + decoder.decode(value))
              }
              setResearchRunning(false)
            }} disabled={researchRunning}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${
                researchRunning ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' : 'bg-gray-800 text-white hover:bg-gray-900'
              }`}>
              {researchRunning ? '⏳ Researching…' : 'Run Deep Research'}
            </button>
          </div>
        </div>
        {researchLog && (
          <div className="bg-gray-900 text-green-400 text-xs font-mono rounded-lg p-4 h-40 overflow-y-auto whitespace-pre-wrap">{researchLog}</div>
        )}
      </div>

      {/* Script buttons */}
      <div className="space-y-4">
        {SCRIPTS.map((script) => (
          <div key={script.id} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{script.icon}</span>
                  <h2 className="text-base font-semibold text-gray-900">{script.label}</h2>
                </div>
                <p className="text-sm text-gray-500 mt-1">{script.description}</p>
              </div>
              <button onClick={() => runScript(script.id)} disabled={!!runningScript}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${
                  runningScript === script.id
                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-300 cursor-wait'
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40'
                }`}>
                {runningScript === script.id ? '⏳ Running…' : 'Run Now'}
              </button>
            </div>
            {logs[script.id] !== undefined && (
              <div ref={(el) => { logRefs.current[script.id] = el }}
                className="mt-3 bg-gray-900 text-green-400 text-xs font-mono rounded-lg p-4 h-48 overflow-y-auto whitespace-pre-wrap">
                {logs[script.id] || 'Starting…'}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-700">
        <strong>Render Cron Jobs to configure:</strong>
        <ul className="mt-2 space-y-1 font-mono text-xs">
          <li>• Weekly digest: <code>0 13 * * 1</code> → <code>npx ts-node --skip-project scripts/weekly-digest.ts</code></li>
          <li>• Quarterly discovery: <code>0 6 1 1,4,7,10 *</code> → <code>npx ts-node --skip-project scripts/discover-companies.ts</code></li>
          <li>• Quarterly REIT: <code>0 7 1 1,4,7,10 *</code> → <code>npx ts-node --skip-project scripts/discover-reits.ts</code></li>
          <li>• Quarterly filings: <code>0 8 1 1,4,7,10 *</code> → <code>npx ts-node --skip-project scripts/extract-filings.ts</code></li>
          <li>• Company news: <code>0 11 * * 1,4</code> → <code>npx ts-node --skip-project scripts/monitor-news.ts</code></li>
          <li>• HubSpot sync: <code>0 13 * * *</code> → <code>npx ts-node --skip-project scripts/hubspot-sync.ts</code></li>
        </ul>
      </div>

      {/* Waitlist */}
      <WaitlistSection />
    </div>
  )
}

function WaitlistSection() {
  const [entries, setEntries] = useState<{ id: number; email: string; name: string | null; brokerage: string | null; market: string | null; submitted_date: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/waitlist').then((r) => r.json()).then((d) => { setEntries(Array.isArray(d) ? d : []); setLoading(false) })
  }, [])

  return (
    <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">📮 Waitlist Signups ({entries.length})</h2>
        <a href="/api/admin/waitlist?format=csv"
          className="text-sm border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition">
          ⬇ Export CSV
        </a>
      </div>
      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-400 text-sm">No signups yet. Share the landing page to collect interest.</p>
      ) : (
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-gray-500 border-b border-gray-100">
            {['Email', 'Name', 'Brokerage', 'Market', 'Date'].map((h) => <th key={h} className="text-left py-2 pr-4">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="py-2 pr-4 text-blue-600">{e.email}</td>
                <td className="py-2 pr-4 text-gray-700">{e.name || '—'}</td>
                <td className="py-2 pr-4 text-gray-600">{e.brokerage || '—'}</td>
                <td className="py-2 pr-4 text-gray-600">{e.market || '—'}</td>
                <td className="py-2 text-gray-400 text-xs">{new Date(e.submitted_date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
