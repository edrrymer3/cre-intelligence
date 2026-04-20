'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

interface TeamNote {
  id: number
  author: string
  note: string
  created_date: string
  pinned: boolean
}

interface Props {
  companyId?: number
  contactId?: number
  clientId?: number
}

export default function TeamNotes({ companyId, contactId, clientId }: Props) {
  const { data: session } = useSession()
  const [notes, setNotes] = useState<TeamNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)

  const params = new URLSearchParams()
  if (companyId) params.set('company_id', String(companyId))
  if (contactId) params.set('contact_id', String(contactId))
  if (clientId) params.set('client_id', String(clientId))

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch(`/api/team-notes?${params}`)
    const data = await res.json()
    setNotes(Array.isArray(data) ? data : [])
  }

  async function addNote() {
    if (!newNote.trim()) return
    setSaving(true)
    await fetch('/api/team-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId || null, contact_id: contactId || null, client_id: clientId || null, note: newNote }),
    })
    setNewNote('')
    setSaving(false)
    load()
  }

  async function togglePin(id: number, pinned: boolean) {
    await fetch('/api/team-notes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pinned: !pinned }),
    })
    load()
  }

  async function deleteNote(id: number) {
    await fetch('/api/team-notes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Team Notes</h3>
      <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-xs text-gray-400">No notes yet.</p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className={`bg-white rounded-lg border px-3 py-2 ${n.pinned ? 'border-yellow-300 bg-yellow-50' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{n.note}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{n.author} · {new Date(n.created_date).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => togglePin(n.id, n.pinned)} className={`text-xs px-1.5 py-0.5 rounded transition ${n.pinned ? 'text-yellow-600 hover:text-yellow-700' : 'text-gray-300 hover:text-yellow-500'}`}>📌</button>
                  <button onClick={() => deleteNote(n.id)} className="text-xs text-gray-300 hover:text-red-500 transition">×</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNote() } }}
          placeholder="Add a team note..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
        <button onClick={addNote} disabled={saving || !newNote.trim()}
          className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-40">Add</button>
      </div>
    </div>
  )
}
