'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SearchResult {
  type: string
  id: number
  label: string
  sub: string | null
  href: string
}

const TYPE_ICONS: Record<string, string> = {
  company: '🏢', contact: '👤', client: '🤝', document: '📄',
}

export default function GlobalHeader() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [alertCount, setAlertCount] = useState(0)
  const [followUpCount, setFollowUpCount] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Load notification counts
    fetch('/api/alerts').then((r) => r.json()).then((d) => setAlertCount(Array.isArray(d) ? d.length : 0)).catch(() => {})
    fetch('/api/contacts?follow_up_due=1&limit=100').then((r) => r.json()).then((d) => setFollowUpCount(d.total || 0)).catch(() => {})

    // Cmd+K shortcut
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setResults(data.results || [])
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    setOpen(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 250)
  }

  const totalNotifications = alertCount + followUpCount

  return (
    <header className="hidden md:flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
      {/* Global search */}
      <div className="relative flex-1 max-w-md">
        <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 focus-within:border-blue-500 focus-within:bg-white transition">
          <span className="text-gray-400 mr-2">🔍</span>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search companies, contacts, clients… (⌘K)"
            value={query}
            onChange={handleInput}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            className="flex-1 text-sm bg-transparent focus:outline-none text-gray-700 placeholder-gray-400"
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); setOpen(false) }} className="text-gray-400 hover:text-gray-600 ml-1">×</button>
          )}
        </div>

        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {results.map((r) => (
              <Link
                key={`${r.type}-${r.id}`}
                href={r.href}
                onClick={() => { setOpen(false); setQuery('') }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition"
              >
                <span className="text-lg">{TYPE_ICONS[r.type] || '•'}</span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{r.label}</div>
                  {r.sub && <div className="text-xs text-gray-400">{r.sub}</div>}
                </div>
                <span className="ml-auto text-xs text-gray-300 capitalize">{r.type}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Notification bell */}
      <div className="flex items-center gap-4 ml-6">
        <div className="relative">
          <Link href="/dashboard/alerts" className="text-gray-500 hover:text-gray-800 transition relative block">
            <span className="text-xl">🔔</span>
            {totalNotifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {totalNotifications > 9 ? '9+' : totalNotifications}
              </span>
            )}
          </Link>
        </div>
        {(alertCount > 0 || followUpCount > 0) && (
          <div className="text-xs text-gray-500 hidden xl:block">
            {alertCount > 0 && <span className="mr-3">🔔 {alertCount} alerts</span>}
            {followUpCount > 0 && <span>⏰ {followUpCount} follow-ups</span>}
          </div>
        )}
      </div>
    </header>
  )
}
