'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard/digest', label: 'Morning Briefing', icon: '☀️' },
  { href: '/dashboard/prospects', label: 'Tenant Prospects', icon: '🏢' },
  { href: '/dashboard/contacts', label: 'Contacts', icon: '📝' },
  { href: '/dashboard/clients', label: 'Clients', icon: '🤝' },
  { href: '/dashboard/market-intel', label: 'Market Intel', icon: '📰' },
  { href: '/dashboard/reports', label: 'Reports', icon: '📈' },
  { href: '/dashboard/deals', label: 'Deals', icon: '🤝' },
  { href: '/dashboard/activity', label: 'Activity Feed', icon: '📰' },
  { href: '/dashboard/reits', label: 'REIT Watchlist', icon: '📋' },
  { href: '/dashboard/alerts', label: '8-K Alerts', icon: '🔔' },
  { href: '/dashboard/watchlist', label: 'Watchlist Manager', icon: '⚙️' },
  { href: '/dashboard/pipeline', label: 'My Pipeline', icon: '📊' },
  { href: '/dashboard/email-templates', label: 'Email Templates', icon: '✉️' },
  { href: '/dashboard/proposals', label: 'Proposals & Pitches', icon: '💼' },
  { href: '/dashboard/portfolio', label: 'Portfolio', icon: '🏙️' },
  { href: '/dashboard/documents', label: 'Documents', icon: '📁' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
  { href: '/dashboard/admin', label: 'Admin', icon: '🔧' },
]

interface NavProps {
  user?: { name?: string | null; email?: string | null }
}

export default function DashboardNav({ user }: NavProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-[#1a1a2e] flex-col min-h-screen flex-shrink-0">
        <div className="px-6 py-6 border-b border-gray-700">
          <h1 className="text-white font-bold text-lg">CRE Intelligence</h1>
          <p className="text-gray-400 text-xs mt-1">Tenant Rep Platform</p>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}>
                <span>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="px-6 py-5 border-t border-gray-700">
          <p className="text-gray-400 text-sm truncate mb-2">{user?.name || user?.email}</p>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-gray-500 hover:text-red-400 text-sm transition">
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#1a1a2e] flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h1 className="text-white font-bold">CRE Intelligence</h1>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-gray-400 hover:text-white text-xl">
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex" onClick={() => setMobileOpen(false)}>
          <div className="w-64 bg-[#1a1a2e] flex flex-col pt-16" onClick={(e) => e.stopPropagation()}>
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const active = pathname.startsWith(item.href)
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                      active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}>
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                )
              })}
            </nav>
            <div className="px-6 py-5 border-t border-gray-700">
              <p className="text-gray-400 text-sm truncate mb-2">{user?.name || user?.email}</p>
              <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-gray-500 hover:text-red-400 text-sm transition">
                Sign out
              </button>
            </div>
          </div>
          <div className="flex-1 bg-black/40" />
        </div>
      )}
    </>
  )
}
