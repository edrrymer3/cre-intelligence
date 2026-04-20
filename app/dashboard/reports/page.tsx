'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface ReportData {
  type: string
  data: unknown[]
  weekOf?: string
  pipeline?: unknown[]
  contacts?: unknown[]
  emails?: unknown[]
  alerts?: unknown[]
}

const REPORTS = [
  {
    id: 'prospect-pipeline',
    title: 'Prospect Pipeline Report',
    description: 'All companies with opportunity score 4–5, sorted by lease expiration urgency, with contacts and recommended actions.',
    icon: '🎯',
  },
  {
    id: 'lease-expiration',
    title: 'Market Lease Expiration Report',
    description: 'All office and industrial leases expiring 2025–2030, grouped by type and city with SF totals.',
    icon: '📅',
  },
  {
    id: 'client-portfolio',
    title: 'Client Portfolio Summary',
    description: 'All active clients with locations, lease expirations highlighted, and commission tracking.',
    icon: '🏙️',
  },
  {
    id: 'weekly-activity',
    title: 'Weekly Activity Summary',
    description: 'Pipeline activity, contacts added, emails generated, and alerts reviewed from the past 7 days.',
    icon: '📊',
  },
]

export default function ReportsPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)

  async function generateReport(reportId: string) {
    setLoading(reportId)
    setReportData(null)
    const res = await fetch(`/api/reports?report=${reportId}`)
    const data = await res.json()
    setReportData({ type: reportId, data: Array.isArray(data) ? data : [], ...data })
    setLoading(null)
  }

  function downloadCsv(reportId: string) {
    window.open(`/api/reports?report=${reportId}&format=csv`, '_blank')
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {REPORTS.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{r.icon}</span>
                  <h2 className="font-semibold text-gray-900">{r.title}</h2>
                </div>
                <p className="text-sm text-gray-500">{r.description}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => generateReport(r.id)} disabled={loading === r.id}
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                {loading === r.id ? '⏳ Generating…' : 'Generate Report'}
              </button>
              {['prospect-pipeline', 'lease-expiration', 'client-portfolio'].includes(r.id) && (
                <button onClick={() => downloadCsv(r.id)}
                  className="text-sm border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition">
                  ⬇ CSV
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Report output */}
      {reportData && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            {REPORTS.find((r) => r.id === reportData.type)?.title}
          </h2>

          {reportData.type === 'prospect-pipeline' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  {['Company', 'Type', 'City', 'SF', 'Exp. Year', 'Score', 'Contact', 'Action'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {(reportData.data as { company?: { name?: string; contacts?: { name?: string; title?: string }[] }; property_type: string; city?: string; sqft?: number; lease_expiration_year?: number; opportunity_score?: number; recommended_action?: string }[]).map((p, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium">{p.company?.name}</td>
                      <td className="px-3 py-2">{p.property_type}</td>
                      <td className="px-3 py-2">{p.city || '—'}</td>
                      <td className="px-3 py-2">{p.sqft ? `${p.sqft.toLocaleString()} SF` : '—'}</td>
                      <td className="px-3 py-2">{p.lease_expiration_year || '—'}</td>
                      <td className="px-3 py-2 font-bold text-blue-700">{p.opportunity_score}/5</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{p.company?.contacts?.[0]?.name || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-500 max-w-[180px] truncate">{p.recommended_action || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportData.type === 'lease-expiration' && (() => {
            const byYear: Record<string, number> = {}
            ;(reportData.data as { lease_expiration_year?: number; sqft?: number }[]).forEach((p) => {
              if (p.lease_expiration_year) {
                const y = String(p.lease_expiration_year)
                byYear[y] = (byYear[y] || 0) + (p.sqft || 0)
              }
            })
            const chartData = Object.entries(byYear).map(([year, sf]) => ({ year, sf: Math.round(sf / 1000) })).sort((a, b) => a.year.localeCompare(b.year))
            return (
              <div>
                <div className="mb-6">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => [`${v}k SF`, 'Expiring']} />
                      <Bar dataKey="sf" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b">
                    {['Company', 'Type', 'City', 'State', 'SF', 'Exp Year'].map((h) => <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {(reportData.data as { company?: { name?: string }; property_type: string; city?: string; state?: string; sqft?: number; lease_expiration_year?: number }[]).map((p, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium">{p.company?.name}</td>
                        <td className="px-3 py-2">{p.property_type}</td>
                        <td className="px-3 py-2">{p.city || '—'}</td>
                        <td className="px-3 py-2">{p.state || '—'}</td>
                        <td className="px-3 py-2">{p.sqft ? `${p.sqft.toLocaleString()} SF` : '—'}</td>
                        <td className="px-3 py-2 font-semibold">{p.lease_expiration_year}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}

          {reportData.type === 'client-portfolio' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b">
                  {['Client', 'Industry', 'Locations', 'Total SF', 'Annual Rent', 'Commission'].map((h) => <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {(reportData.data as { name: string; industry?: string; locations?: { sqft?: number; annual_rent?: number; commission_earned?: number }[] }[]).map((c, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium">{c.name}</td>
                      <td className="px-3 py-2 text-gray-500">{c.industry || '—'}</td>
                      <td className="px-3 py-2">{c.locations?.length || 0}</td>
                      <td className="px-3 py-2">{`${((c.locations || []).reduce((s, l) => s + (l.sqft || 0), 0) / 1000).toFixed(0)}k SF`}</td>
                      <td className="px-3 py-2">{`$${(c.locations || []).reduce((s, l) => s + (l.annual_rent || 0), 0).toLocaleString()}`}</td>
                      <td className="px-3 py-2 text-green-700 font-semibold">{`$${(c.locations || []).reduce((s, l) => s + (l.commission_earned || 0), 0).toLocaleString()}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportData.type === 'weekly-activity' && (
            <div className="grid grid-cols-2 gap-6">
              {[
                { label: 'Pipeline Updates', items: reportData.pipeline as { company?: { name?: string }; status?: string }[], render: (i: { company?: { name?: string }; status?: string }) => `${i.company?.name} → ${i.status}` },
                { label: 'Contacts Added', items: reportData.contacts as { name?: string; company?: { name?: string } }[], render: (i: { name?: string; company?: { name?: string } }) => `${i.name} @ ${i.company?.name}` },
                { label: 'Emails Generated', items: reportData.emails as { company?: { name?: string }; subject?: string }[], render: (i: { company?: { name?: string }; subject?: string }) => `${i.company?.name}: ${i.subject?.slice(0, 40)}` },
                { label: 'Alerts Reviewed', items: reportData.alerts as { company?: { name?: string }; alert_type?: string }[], render: (i: { company?: { name?: string }; alert_type?: string }) => `${i.company?.name} (${i.alert_type})` },
              ].map((section) => (
                <div key={section.label}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">{section.label} ({(section.items || []).length})</h3>
                  {(section.items || []).length === 0 ? (
                    <p className="text-sm text-gray-400">None this week</p>
                  ) : (
                    <ul className="space-y-1">
                      {(section.items || []).map((item, i) => (
                        <li key={i} className="text-sm text-gray-600">• {section.render(item)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
