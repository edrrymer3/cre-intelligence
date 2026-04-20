'use client'

import { useEffect, useState } from 'react'

interface PipelineItem {
  id: number
  status: string
  notes: string | null
  contact_name: string | null
  contact_title: string | null
  added_date: string
  last_updated: string
  company: { name: string; ticker: string | null }
}

const STAGES = [
  'Identified',
  'Contacted',
  'Meeting Scheduled',
  'Proposal Sent',
  'Closed Won',
  'Closed Lost',
]

const STAGE_COLORS: Record<string, string> = {
  'Identified': 'bg-gray-100 border-gray-300',
  'Contacted': 'bg-blue-50 border-blue-200',
  'Meeting Scheduled': 'bg-yellow-50 border-yellow-200',
  'Proposal Sent': 'bg-purple-50 border-purple-200',
  'Closed Won': 'bg-green-50 border-green-200',
  'Closed Lost': 'bg-red-50 border-red-200',
}

const STAGE_HEADER_COLORS: Record<string, string> = {
  'Identified': 'text-gray-600 bg-gray-200',
  'Contacted': 'text-blue-700 bg-blue-100',
  'Meeting Scheduled': 'text-yellow-700 bg-yellow-100',
  'Proposal Sent': 'text-purple-700 bg-purple-100',
  'Closed Won': 'text-green-700 bg-green-100',
  'Closed Lost': 'text-red-700 bg-red-100',
}

export default function PipelinePage() {
  const [items, setItems] = useState<PipelineItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pipeline')
      .then((r) => r.json())
      .then((data) => { setItems(data); setLoading(false) })
  }, [])

  const byStage = (stage: string) => items.filter((i) => i.status === stage)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
        <span className="text-gray-500 text-sm">{items.length} deals</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-3 gap-4 xl:grid-cols-6">
          {STAGES.map((stage) => {
            const stageItems = byStage(stage)
            return (
              <div key={stage} className="flex flex-col gap-3">
                <div className={`rounded-lg px-3 py-2 text-center text-xs font-semibold ${STAGE_HEADER_COLORS[stage]}`}>
                  {stage}
                  <span className="ml-1 opacity-60">({stageItems.length})</span>
                </div>

                {stageItems.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center text-xs text-gray-300">
                    Empty
                  </div>
                ) : (
                  stageItems.map((item) => (
                    <div
                      key={item.id}
                      className={`border rounded-xl p-4 ${STAGE_COLORS[stage]}`}
                    >
                      <div className="font-semibold text-gray-900 text-sm mb-1 leading-tight">
                        {item.company.name}
                      </div>
                      {item.company.ticker && (
                        <div className="text-xs text-gray-400 font-mono mb-2">{item.company.ticker}</div>
                      )}
                      {item.contact_name && (
                        <div className="text-xs text-gray-600 mb-1">
                          {item.contact_name}
                          {item.contact_title && ` · ${item.contact_title}`}
                        </div>
                      )}
                      {item.notes && (
                        <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-3">{item.notes}</p>
                      )}
                      <div className="text-xs text-gray-400 mt-3">
                        {new Date(item.last_updated).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
