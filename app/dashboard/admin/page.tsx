'use client'

import { useEffect, useState, useRef } from 'react'

interface Stats {
  companies: number
  reits: number
  properties: number
  alerts: number
  lastRun: string | null
}

const SCRIPTS = [
  {
    id: 'discover-companies',
    label: 'Run Company Discovery',
    description: 'Searches EDGAR for MN-headquartered companies (3 sources)',
    icon: '🔍',
  },
  {
    id: 'discover-reits',
    label: 'Run REIT Discovery',
    description: 'Scans EDGAR SIC 6798 REITs for MN office/industrial presence',
    icon: '🏗️',
  },
  {
    id: 'extract-filings',
    label: 'Run Filing Extraction',
    description: 'Downloads 10-Qs and 8-Ks, runs Claude AI extraction, saves properties + alerts',
    icon: '🤖',
  },
]

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [runningScript, setRunningScript] = useState<string | null>(null)
  const [logs, setLogs] = useState<Record<string, string>>({})
  const logRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then(setStats)
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

      if (!res.body) {
        setLogs((prev) => ({ ...prev, [scriptId]: 'No response stream.' }))
        setRunningScript(null)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setLogs((prev) => {
          const updated = (prev[scriptId] || '') + chunk
          // Auto-scroll
          setTimeout(() => {
            const el = logRefs.current[scriptId]
            if (el) el.scrollTop = el.scrollHeight
          }, 0)
          return { ...prev, [scriptId]: updated }
        })
      }
    } catch (err) {
      setLogs((prev) => ({ ...prev, [scriptId]: `Error: ${err}` }))
    }

    setRunningScript(null)
    // Refresh stats
    fetch('/api/admin/stats').then((r) => r.json()).then(setStats)
  }

  return (
    <div className="p-6">
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

      {stats?.lastRun && (
        <p className="text-sm text-gray-500 mb-6">
          Last extraction run: {new Date(stats.lastRun).toLocaleString()}
        </p>
      )}

      {/* Script buttons */}
      <div className="space-y-6">
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
              <button
                onClick={() => runScript(script.id)}
                disabled={!!runningScript}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${
                  runningScript === script.id
                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-300 cursor-wait'
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40'
                }`}
              >
                {runningScript === script.id ? '⏳ Running…' : 'Run Now'}
              </button>
            </div>

            {logs[script.id] !== undefined && (
              <div
                ref={(el) => { logRefs.current[script.id] = el }}
                className="mt-3 bg-gray-900 text-green-400 text-xs font-mono rounded-lg p-4 h-48 overflow-y-auto whitespace-pre-wrap"
              >
                {logs[script.id] || 'Starting…'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
