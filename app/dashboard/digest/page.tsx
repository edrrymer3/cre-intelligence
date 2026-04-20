'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Property {
  id: number
  property_type: string
  city: string | null
  state: string | null
  sqft: number | null
  lease_expiration_year: number | null
  opportunity_score: number | null
  trigger_events: string[]
  recommended_action: string | null
  company: { name: string; ticker: string | null } | null
}

interface Alert {
  id: number
  alert_type: string
  summary: string
  filing_date: string
  filing_url: string | null
  company: { name: string; ticker: string | null }
}

interface PipelineCount {
  status: string
  _count: { id: number }
}

interface PortfolioLocation {
  id: number
  property_name: string | null
  city: string | null
  state: string | null
  sqft: number | null
  lease_expiration_date: string | null
  client: { name: string }
}

interface DigestData {
  generatedAt: string
  summary: { totalCompanies: number; totalProperties: number; totalREITs: number; unreviewedAlerts: number }
  topOpportunities: Property[]
  expiringLeases: Property[]
  newAlerts: Alert[]
  pipelineByStatus: PipelineCount[]
  urgentPortfolioLeases: PortfolioLocation[]
}

const SCORE_COLORS: Record<number, string> = {
  5: 'bg-green-100 text-green-700',
  4: 'bg-blue-100 text-blue-700',
  3: 'bg-yellow-100 text-yellow-700',
}

export default function DigestPage() {
  const [data, setData] = useState<DigestData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/digest')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
  }, [])

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Morning Briefing</h1>
        <p className="text-gray-500 text-sm mt-1">{today}</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Generating briefing...</div>
      ) : data ? (
        <div className="space-y-6">

          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Companies Tracked', value: data.summary.totalCompanies, icon: '🏢' },
              { label: 'Properties Indexed', value: data.summary.totalProperties, icon: '📍' },
              { label: 'REITs Monitored', value: data.summary.totalREITs, icon: '🏗️' },
              { label: 'Unreviewed Alerts', value: data.summary.unreviewedAlerts, icon: '🔔', alert: data.summary.unreviewedAlerts > 0 },
            ].map((s) => (
              <div key={s.label} className={`bg-white rounded-xl border p-5 ${s.alert ? 'border-orange-300' : 'border-gray-200'}`}>
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className={`text-2xl font-bold ${s.alert ? 'text-orange-600' : 'text-gray-900'}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Pipeline snapshot */}
          {data.pipelineByStatus.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">Pipeline Status</h2>
                <Link href="/dashboard/pipeline" className="text-xs text-blue-600 hover:underline">View all →</Link>
              </div>
              <div className="flex gap-3 flex-wrap">
                {data.pipelineByStatus.map((p) => (
                  <div key={p.status} className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200 text-center min-w-[100px]">
                    <div className="text-xl font-bold text-gray-900">{p._count.id}</div>
                    <div className="text-xs text-gray-500">{p.status}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Urgent portfolio leases */}
          {data.urgentPortfolioLeases.length > 0 && (
            <div className="bg-white rounded-xl border border-orange-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">⚠️ Portfolio Leases Expiring Within 12 Months</h2>
                <Link href="/dashboard/portfolio" className="text-xs text-blue-600 hover:underline">Manage →</Link>
              </div>
              <div className="space-y-2">
                {data.urgentPortfolioLeases.map((loc) => {
                  const months = loc.lease_expiration_date
                    ? Math.round((new Date(loc.lease_expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
                    : null
                  return (
                    <div key={loc.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <span className="font-medium text-gray-900">{loc.client.name}</span>
                        <span className="text-gray-500 text-sm ml-2">{loc.property_name || [loc.city, loc.state].filter(Boolean).join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {loc.sqft && <span className="text-sm text-gray-500">{loc.sqft.toLocaleString()} SF</span>}
                        <span className={`text-sm font-semibold ${months !== null && months < 6 ? 'text-red-600' : 'text-orange-500'}`}>
                          {months !== null ? `${months} mo` : '—'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Top opportunities */}
          {data.topOpportunities.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">🎯 Top Opportunities (Score 4–5)</h2>
                <Link href="/dashboard/prospects" className="text-xs text-blue-600 hover:underline">View all →</Link>
              </div>
              <div className="space-y-2">
                {data.topOpportunities.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <span className="font-medium text-gray-900">{p.company?.name || '—'}</span>
                      {p.company?.ticker && <span className="font-mono text-xs text-gray-400 ml-2">{p.company.ticker}</span>}
                      <div className="text-xs text-gray-500 mt-0.5">
                        {[p.property_type, p.city, p.state].filter(Boolean).join(' · ')}
                        {p.lease_expiration_year && ` · Exp ${p.lease_expiration_year}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.opportunity_score && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${SCORE_COLORS[p.opportunity_score] || 'bg-gray-100 text-gray-600'}`}>
                          {p.opportunity_score}/5
                        </span>
                      )}
                      {p.recommended_action && (
                        <span className="text-xs text-gray-500 max-w-[200px] truncate">{p.recommended_action}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leases expiring 2025–2027 */}
          {data.expiringLeases.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">📅 Leases Expiring 2025–2027</h2>
                <Link href="/dashboard/prospects" className="text-xs text-blue-600 hover:underline">View all →</Link>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th className="text-left py-2">Company</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">City</th>
                    <th className="text-left py-2">SF</th>
                    <th className="text-left py-2">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.expiringLeases.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 font-medium text-gray-900">{p.company?.name || '—'}</td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${p.property_type === 'office' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {p.property_type}
                        </span>
                      </td>
                      <td className="py-2 text-gray-600">{p.city || '—'}</td>
                      <td className="py-2 text-gray-600">{p.sqft ? p.sqft.toLocaleString() : '—'}</td>
                      <td className={`py-2 font-semibold ${p.lease_expiration_year === new Date().getFullYear() ? 'text-red-600' : p.lease_expiration_year === new Date().getFullYear() + 1 ? 'text-orange-500' : 'text-yellow-600'}`}>
                        {p.lease_expiration_year}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* New alerts */}
          {data.newAlerts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">🔔 New Alerts This Week</h2>
                <Link href="/dashboard/alerts" className="text-xs text-blue-600 hover:underline">Review all →</Link>
              </div>
              <div className="space-y-2">
                {data.newAlerts.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium mt-0.5 flex-shrink-0">
                      {a.alert_type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900 text-sm">{a.company.name}</span>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.summary}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(a.filing_date).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.topOpportunities.length === 0 && data.newAlerts.length === 0 && data.expiringLeases.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <div className="text-4xl mb-3">📭</div>
              <p>No intelligence data yet. Run the discovery and extraction scripts from the Admin panel.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
