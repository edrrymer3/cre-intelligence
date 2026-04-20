'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const navItems = [
  { href: '/dashboard/prospects', label: 'Prospects', icon: '🏢' },
  { href: '/dashboard/reits', label: 'REITs', icon: '📋' },
  { href: '/dashboard/alerts', label: 'Alerts', icon: '🔔' },
  { href: '/dashboard/pipeline', label: 'Pipeline', icon: '📊' },
]

interface NavProps {
  user?: { name?: string | null; email?: string | null }
}

export default function DashboardNav({ user }: NavProps) {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-[#1a1a2e] flex flex-col min-h-screen">
      <div className="px-6 py-6 border-b border-gray-700">
        <h1 className="text-white font-bold text-lg">CRE Intelligence</h1>
        <p className="text-gray-400 text-xs mt-1">Tenant Rep Platform</p>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-6 py-6 border-t border-gray-700">
        <p className="text-gray-400 text-sm truncate mb-3">{user?.name || user?.email}</p>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-gray-500 hover:text-red-400 text-sm transition"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
