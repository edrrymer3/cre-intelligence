'use client'

import { useEffect, useState, useMemo } from 'react'

interface Activity {
  id: number
  activity_type: string
  summary: string
  activity_date: string
  added_by: string
  follow_up_date: string | null
  follow_up_note: string | null
}

interface Contact {
  id: number
  name: string | null
  title: string | null
  email: string | null
  linkedin_url: string | null
  confidence: string | null
  company: { name: string; ticker: string | null }
  activities: Activity[]
  emails: { id: number }[]
}

const ACTIVITY_ICONS: Record<string, string> = {
  call: '📞', email: '✉️', meeting: '🤝', linkedin: '💼', note: '📝',
}

function fmt(v: number) { return v.toLocaleString() }
function fmtDate(d: string) { return new Date(d).toLocaleDateString() }

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [followUpQueue, setFollowUpQueue] = useState<Contact[]>([])

  // Filters
  const [search, setSearch] = useState('')
  const [followUpDue, setFollowUpDue] = useState(false)

  // Add activity form
  const [activityFor, setActivityFor] = useState<number | null>(null)
  const [actForm, setActForm] = useState({ activity_type: 'call', summary: '', activity_date: new Date().toISOString().split('T')[0], follow_up_date: '', follow_up_note: '' })
  const [savingAct, setSavingAct] = useState(false)

  // Contact activities cache
  const [activitiesCache, setActivitiesCache] = useState<Record<number, Activity[]>>({})

  const limit = 25

  useEffect(() => { loadContacts() }, [page, followUpDue])

  async function loadContacts() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (followUpDue) params.set('follow_up_due', '1')
    const res = await fetch(`/api/contacts?${params}`)
    const data = await res.json()
    setContacts(data.contacts || [])
    setTotal(data.total || 0)

    // Follow-up queue: contacts with overdue follow-ups
    const now = new Date()
    const overdue = (data.contacts || []).filter((c: Contact) =>
      c.activities.some((a) => a.follow_up_date && new Date(a.follow_up_date) <= now)
    )
    setFollowUpQueue(overdue)
    setLoading(false)
  }

  async function loadActivities(contactId: number) {
    const res = await fetch(`/api/contacts/${contactId}`)
    const data = await res.json()
    setActivitiesCache((p) => ({ ...p, [contactId]: data.activities || [] }))
  }

  async function saveActivity(contactId: number) {
    setSavingAct(true)
    await fetch('/api/contacts/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: contactId, ...actForm }),
    })
    setActivityFor(null)
    setActForm({ activity_type: 'call', summary: '', activity_date: new Date().toISOString().split('T')[0], follow_up_date: '', follow_up_note: '' })
    setSavingAct(false)
    loadActivities(contactId)
    loadContacts()
  }

  async function snooze(activityId: number, contactId: number) {
    await fetch('/api/contacts/activity', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activityId, snooze: true }),
    })
    loadContacts()
    loadActivities(contactId)
  }

  const filtered = useMemo(() => {
    if (!search) return contacts
    const q = search.toLowerCase()
    return contacts.filter((c) =>
      c.name?.toLowerCase().includes(q) ||
      c.company?.name.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  }, [contacts, search])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <span className="text-gray-500 text-sm">{total} total</span>
      </div>

      {/* Follow-up queue */}
      {followUpQueue.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-orange-800 mb-3">⏰ Follow-up Queue ({followUpQueue.length})</h2>
          <div className="space-y-2">
            {followUpQueue.slice(0, 5).map((c) => {
              const overdueAct = c.activities.find((a) => a.follow_up_date && new Date(a.follow_up_date) <= new Date())
              return (
                <div key={c.id} className="flex items-center justify-between bg-white rounded-lg border border-orange-100 px-4 py-3">
                  <div>
                    <span className="font-medium text-gray-900">{c.name}</span>
                    <span className="text-gray-500 text-sm ml-2">{c.company?.name}</span>
                    {overdueAct && <p className="text-xs text-gray-500 mt-0.5">{overdueAct.follow_up_note || overdueAct.summary}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setActivityFor(c.id); setExpandedId(c.id); loadActivities(c.id) }}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">
                      Log Activity
                    </button>
                    {overdueAct && (
                      <button onClick={() => snooze(overdueAct.id, c.id)}
                        className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
                        Snooze 7d
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input type="text" placeholder="Search name, company, title..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-64" />
        <button onClick={() => setFollowUpDue(!followUpDue)}
          className={`text-sm px-3 py-2 rounded-lg border transition ${followUpDue ? 'bg-orange-600 text-white border-orange-600' : 'border-gray-300 text-gray-600 hover:border-orange-400'}`}>
          ⏰ Follow-up Due
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">LinkedIn</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Activity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Follow Up</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Emails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                  No contacts yet. Use Find Contacts in the Tenant Prospects tab.
                </td></tr>
              ) : (
                filtered.map((c) => {
                  const lastAct = c.activities[0]
                  const followUp = c.activities.find((a) => a.follow_up_date)
                  const isOverdue = followUp?.follow_up_date && new Date(followUp.follow_up_date) <= new Date()
                  return (
                    <>
                      <tr key={c.id} onClick={() => { setExpandedId(expandedId === c.id ? null : c.id); if (expandedId !== c.id) loadActivities(c.id) }}
                        className="hover:bg-gray-50 cursor-pointer transition">
                        <td className="px-4 py-3 font-medium text-gray-900 text-sm">{c.name || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{c.title || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{c.company?.name}</td>
                        <td className="px-4 py-3 text-sm text-blue-600">{c.email || '—'}</td>
                        <td className="px-4 py-3">
                          {c.linkedin_url ? (
                            <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                              className="text-xs text-blue-500 hover:underline">LinkedIn →</a>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {lastAct ? `${ACTIVITY_ICONS[lastAct.activity_type]} ${fmtDate(lastAct.activity_date)}` : '—'}
                        </td>
                        <td className={`px-4 py-3 text-xs font-medium ${isOverdue ? 'text-red-600' : followUp ? 'text-orange-500' : 'text-gray-400'}`}>
                          {followUp?.follow_up_date ? fmtDate(followUp.follow_up_date) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{c.emails.length || 0}</td>
                      </tr>
                      {expandedId === c.id && (
                        <tr key={`${c.id}-exp`} className="bg-blue-50">
                          <td colSpan={8} className="px-6 py-5">
                            <div className="grid grid-cols-2 gap-6">
                              {/* Activity log */}
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="text-sm font-semibold text-gray-700">Activity Log</h3>
                                  <button onClick={(e) => { e.stopPropagation(); setActivityFor(activityFor === c.id ? null : c.id) }}
                                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition">
                                    + Add Activity
                                  </button>
                                </div>

                                {activityFor === c.id && (
                                  <div className="bg-white rounded-lg border border-gray-200 p-4 mb-3">
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                      <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Type</label>
                                        <select value={actForm.activity_type} onChange={(e) => setActForm((p) => ({ ...p, activity_type: e.target.value }))}
                                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                                          {['call', 'email', 'meeting', 'linkedin', 'note'].map((t) => <option key={t}>{t}</option>)}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Date</label>
                                        <input type="date" value={actForm.activity_date} onChange={(e) => setActForm((p) => ({ ...p, activity_date: e.target.value }))}
                                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                                      </div>
                                      <div className="col-span-2">
                                        <label className="text-xs text-gray-500 mb-1 block">Summary</label>
                                        <input type="text" value={actForm.summary} onChange={(e) => setActForm((p) => ({ ...p, summary: e.target.value }))}
                                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="What happened?" />
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Follow-up Date</label>
                                        <input type="date" value={actForm.follow_up_date} onChange={(e) => setActForm((p) => ({ ...p, follow_up_date: e.target.value }))}
                                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Follow-up Note</label>
                                        <input type="text" value={actForm.follow_up_note} onChange={(e) => setActForm((p) => ({ ...p, follow_up_note: e.target.value }))}
                                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="What to do?" />
                                      </div>
                                    </div>
                                    <button onClick={() => saveActivity(c.id)} disabled={savingAct || !actForm.summary}
                                      className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                                      {savingAct ? 'Saving…' : 'Log Activity'}
                                    </button>
                                  </div>
                                )}

                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {(activitiesCache[c.id] || c.activities).length === 0 ? (
                                    <p className="text-sm text-gray-400">No activity logged yet.</p>
                                  ) : (
                                    (activitiesCache[c.id] || c.activities).map((a) => (
                                      <div key={a.id} className="bg-white rounded-lg border border-gray-100 px-3 py-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium text-gray-800">{ACTIVITY_ICONS[a.activity_type]} {a.summary}</span>
                                          <span className="text-xs text-gray-400">{fmtDate(a.activity_date)}</span>
                                        </div>
                                        {a.follow_up_date && (
                                          <p className="text-xs text-orange-600 mt-1">Follow up: {fmtDate(a.follow_up_date)}{a.follow_up_note ? ` — ${a.follow_up_note}` : ''}</p>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>

                              {/* Links */}
                              <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
                                <div className="space-y-2">
                                  {c.email && (
                                    <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()}
                                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                                      ✉️ {c.email}
                                    </a>
                                  )}
                                  {c.linkedin_url && (
                                    <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                                      💼 View LinkedIn Profile
                                    </a>
                                  )}
                                  <a href="/dashboard/prospects" onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                                    🏢 View EDGAR Intelligence →
                                  </a>
                                </div>
                                <div className="mt-4">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.confidence === 'high' ? 'bg-green-100 text-green-700' : c.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {c.confidence} confidence
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">← Prev</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
