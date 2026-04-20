'use client'

import { useEffect, useState } from 'react'

interface FeedItem {
  type: string
  date: string
  actor: string
  company: string | null
  description: string
  pinned?: boolean
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  note: { icon: '📝', color: 'bg-yellow-100 text-yellow-700', label: 'Note' },
  contact: { icon: '👤', color: 'bg-green-100 text-green-700', label: 'Contact' },
  email: { icon: '✉️', color: 'bg-blue-100 text-blue-700', label: 'Email' },
  assignment: { icon: '📌', color: 'bg-purple-100 text-purple-700', label: 'Assignment' },
  pipeline: { icon: '📊', color: 'bg-orange-100 text-orange-700', label: 'Pipeline' },
  alert: { icon: '🔔', color: 'bg-red-100 text-red-700', label: 'Alert' },
}

export default function ActivityFeedPage() {
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => { load() }, [days])

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/activity-feed?days=${days}&limit=100`)
    const data = await res.json()
    setFeed(data.feed || [])
    setLoading(false)
  }

  const filtered = typeFilter ? feed.filter((f) => f.type === typeFilter) : feed

  // Group by date
  const grouped = filtered.reduce<Record<string, FeedItem[]>>((acc, item) => {
    const d = new Date(item.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    if (!acc[d]) acc[d] = []
    acc[d].push(item)
    return acc
  }, {})

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team Activity Feed</h1>
        <div className="flex gap-3">
          <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
            <option value="">All Activity</option>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading activity...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p>No activity yet. Start finding contacts, generating outreach, and adding notes.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{date}</h2>
              <div className="space-y-2">
                {items.map((item, i) => {
                  const config = TYPE_CONFIG[item.type] || { icon: '•', color: 'bg-gray-100 text-gray-600', label: item.type }
                  return (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-start gap-4">
                      <div className={`text-lg flex-shrink-0 mt-0.5`}>{config.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}>{config.label}</span>
                          {item.company && <span className="text-sm font-medium text-gray-800">{item.company}</span>}
                          <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                            {new Date(item.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        {item.actor && item.actor !== 'System' && (
                          <p className="text-xs text-gray-400 mt-1">by {item.actor}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
