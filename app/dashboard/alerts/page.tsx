'use client'

import { useEffect, useState } from 'react'

interface Alert {
  id: number
  alert_type: string
  summary: string
  filing_date: string
  filing_url: string | null
  reviewed: boolean
  company: { name: string; ticker: string | null }
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/alerts')
      .then((r) => r.json())
      .then((data) => { setAlerts(data); setLoading(false) })
  }, [])

  async function markReviewed(id: number) {
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
        <span className="text-gray-500 text-sm">{alerts.length} unreviewed</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-500">No unreviewed alerts. You&apos;re all caught up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="bg-white rounded-xl border border-gray-200 p-6 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-gray-900">{alert.company.name}</span>
                  {alert.company.ticker && (
                    <span className="font-mono text-xs text-gray-400">{alert.company.ticker}</span>
                  )}
                  <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    {alert.alert_type}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-2">{alert.summary}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{new Date(alert.filing_date).toLocaleDateString()}</span>
                  {alert.filing_url && (
                    <a
                      href={alert.filing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      View Filing →
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => markReviewed(alert.id)}
                className="flex-shrink-0 text-sm text-gray-500 hover:text-green-600 border border-gray-200 hover:border-green-400 rounded-lg px-4 py-2 transition"
              >
                Mark Reviewed
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
