'use client'

import { useEffect, useState } from 'react'

interface REIT {
  id: number
  name: string
  ticker: string | null
  cik: string
  active: boolean
  _count: { properties: number }
}

export default function REITsPage() {
  const [reits, setReits] = useState<REIT[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reits')
      .then((r) => r.json())
      .then((data) => { setReits(data); setLoading(false) })
  }, [])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">REITs</h1>
        <span className="text-gray-500 text-sm">{reits.length} tracked REITs</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">REIT</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticker</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">CIK</th>
              <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Properties Tracked</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-12 text-gray-400">Loading...</td></tr>
            ) : reits.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-gray-400">No REITs found. Run the discover-reits script to populate.</td></tr>
            ) : (
              reits.map((reit) => (
                <tr key={reit.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">{reit.name}</td>
                  <td className="px-6 py-4 font-mono text-sm text-gray-600">{reit.ticker || '—'}</td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">{reit.cik}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-sm font-medium ${reit._count.properties > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {reit._count.properties}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
