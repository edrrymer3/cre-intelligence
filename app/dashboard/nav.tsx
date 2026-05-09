'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState } from 'react'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard/digest', label: 'Morning Briefing', icon: '☀️' },
    ],
  },
  {
    label: 'Prospecting',
    items: [
      { href: '/dashboard/prospects', label: 'Tenant Prospects', icon: '🏢' },
      { href: '/dashboard/reits', label: 'REIT Watchlist', icon: '📋' },
      { href: '/dashboard/alerts', label: '8-K Alerts', icon: '🔔' },
      { href: '/dashboard/market-intel', label: 'Market Intel', icon: '📰' },
      { href: '/dashboard/watchlist', label: 'Watchlist Manager', icon: '⚙️' },
    ],
  },
  {
    label: 'Clients & Deals',
    items: [
      { href: '/dashboard/clients', label: 'Clients', icon: '🤝' },
      { href: '/dashboard/deals', label: 'Deal Tracker', icon: '🤝' },
      { href: '/dashboard/contacts', label: 'Contacts', icon: '📝' },
      { href: '/dashboard/activity', label: 'Activity Feed', icon: '📡' },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { href: '/dashboard/model', label: 'Lease Models', icon: '📊' },
      { href: '/dashboard/proposals', label: 'Proposals & Pitches', icon: '💼' },
      { href: '/dashboard/surveys', label: 'Building Surveys', icon: '📋' },
      { href: '/dashboard/tours', label: 'Tour Cards', icon: '🏙️' },
    ],
  },
  {
    label: 'Portfolio',
    items: [
      { href: '/dashboard/portfolio', label: 'Portfolio', icon: '🏙️' },
      { href: '/dashboard/documents', label: 'Documents', icon: '📁' },
      { href: '/dashboard/reports', label: 'Reports', icon: '📈' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/dashboard/email-templates', label: 'Email Templates', icon: '✉️' },
    ],
  },
]

interface NavProps {
  user?: { name?: string | null; email?: string | null }
}

export default function DashboardNav({ user }: NavProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const NavContent = () => (
    <>
      <div className="px-4 py-5 border-b border-gray-700 flex-shrink-0">
        <h1 className="text-white font-bold text-base">CRE Intelligence</h1>
        <p className="text-gray-500 text-xs mt-0.5">Tenant Rep Platform</p>
      </div>

      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider px-2 mb-1">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== '/dashboard/digest' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-700 flex-shrink-0 space-y-1">
        <Link href="/dashboard/settings" onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${pathname === '/dashboard/settings' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}>
          <span>⚙️</span><span>Settings</span>
        </Link>
        <Link href="/dashboard/admin" onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${pathname === '/dashboard/admin' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}>
          <span>🔧</span><span>Admin</span>
        </Link>
        <div className="pt-2 border-t border-gray-700 mt-2">
          <p className="text-gray-500 text-xs truncate px-2 mb-1">{user?.name || user?.email}</p>
          <button onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-gray-500 hover:text-red-400 text-sm transition px-2">
            Sign out
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-[#1a1a2e] flex-col min-h-screen flex-shrink-0">
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#1a1a2e] flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h1 className="text-white font-bold text-sm">CRE Intelligence</h1>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-gray-400 hover:text-white text-xl">
          {mobileOpen ? '×' : '☰'}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex" onClick={() => setMobileOpen(false)}>
          <div className="w-64 bg-[#1a1a2e] flex flex-col pt-14" onClick={(e) => e.stopPropagation()}>
            <NavContent />
          </div>
          <div className="flex-1 bg-black/40" />
        </div>
      )}
    </>
  )
}
