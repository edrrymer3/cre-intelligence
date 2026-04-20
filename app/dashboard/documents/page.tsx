'use client'

import { useEffect, useState, useMemo, useRef } from 'react'

interface DocumentTenant {
  id: number
  tenant_name: string | null
  sqft: number | null
  lease_expiration_year: number | null
  lease_expiration_month: number | null
  rent_psf: number | null
  lease_type: string | null
  options: string | null
  notes: string | null
  matched_company: { id: number; name: string; ticker: string | null } | null
}

interface DocumentProperty {
  id: number
  property_name: string | null
  address: string | null
  city: string | null
  state: string | null
  property_type: string | null
  total_sqft: number | null
  asking_price: number | null
  noi: number | null
  cap_rate: number | null
  occupancy_rate: number | null
  year_built: number | null
  notes: string | null
  tenants: DocumentTenant[]
}

interface Document {
  id: number
  file_name: string
  document_type: string
  uploaded_by: string
  uploaded_date: string
  processed: boolean
  processed_date: string | null
  notes: string | null
  properties: DocumentProperty[]
}

interface CompanyDetail {
  id: number
  name: string
  ticker: string | null
  properties: {
    id: number
    property_type: string
    city: string | null
    state: string | null
    sqft: number | null
    lease_expiration_year: number | null
    opportunity_score: number | null
    trigger_events: string[]
    recommended_action: string | null
    real_estate_strategy: string | null
  }[]
}

type SortDir = 'asc' | 'desc'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [drawerCompany, setDrawerCompany] = useState<CompanyDetail | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Upload state
  const [dragOver, setDragOver] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadType, setUploadType] = useState<'OM' | 'Rent Roll'>('OM')
  const [uploadNotes, setUploadNotes] = useState('')
  const [uploadedBy, setUploadedBy] = useState('')
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle')
  const [uploadLog, setUploadLog] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Filters
  const [docTypeFilter, setDocTypeFilter] = useState('')
  const [propTypeFilter, setPropTypeFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [search, setSearch] = useState('')

  // Sort
  const [sortKey, setSortKey] = useState('uploaded_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Edit notes
  const [editNotes, setEditNotes] = useState<Record<number, string>>({})

  useEffect(() => {
    loadDocuments()
  }, [docTypeFilter, propTypeFilter, cityFilter, stateFilter])

  async function loadDocuments() {
    setLoading(true)
    const params = new URLSearchParams()
    if (docTypeFilter) params.set('type', docTypeFilter)
    if (propTypeFilter) params.set('propType', propTypeFilter)
    if (cityFilter) params.set('city', cityFilter)
    if (stateFilter) params.set('state', stateFilter)
    const res = await fetch(`/api/documents?${params}`)
    const data = await res.json()
    setDocuments(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const cities = useMemo(() => {
    const s = new Set<string>()
    documents.forEach((d) => d.properties.forEach((p) => { if (p.city) s.add(p.city) }))
    return [...s].sort()
  }, [documents])

  const filtered = useMemo(() => {
    let rows = documents
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter((d) =>
        d.file_name.toLowerCase().includes(q) ||
        d.properties.some((p) => p.property_name?.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q))
      )
    }
    return [...rows].sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[sortKey] ?? '')
      const bv = String((b as unknown as Record<string, unknown>)[sortKey] ?? '')
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [documents, search, sortKey, sortDir])

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f?.name.toLowerCase().endsWith('.pdf')) setUploadFile(f)
  }

  async function handleUpload() {
    if (!uploadFile) return
    setUploadStatus('uploading')
    setUploadLog('Uploading file...')

    const form = new FormData()
    form.append('file', uploadFile)
    form.append('document_type', uploadType)
    form.append('uploaded_by', uploadedBy || 'Unknown')
    if (uploadNotes) form.append('notes', uploadNotes)

    const res = await fetch('/api/documents', { method: 'POST', body: form })
    if (!res.ok) {
      const err = await res.json()
      setUploadStatus('error')
      setUploadLog(`Upload failed: ${err.error}`)
      return
    }

    const doc = await res.json()
    setUploadLog('Upload complete. Starting AI extraction...')
    setUploadStatus('processing')

    // Stream parse output
    const parseRes = await fetch(`/api/documents/${doc.id}/parse`, { method: 'POST' })
    if (!parseRes.body) {
      setUploadStatus('error')
      setUploadLog('Parse failed — no response stream')
      return
    }

    const reader = parseRes.body.getReader()
    const decoder = new TextDecoder()
    let log = 'Upload complete. Starting AI extraction...\n'

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      log += decoder.decode(value)
      setUploadLog(log)
    }

    setUploadStatus('done')
    setUploadFile(null)
    setUploadNotes('')
    loadDocuments()
  }

  async function openViewer(docId: number) {
    const res = await fetch(`/api/documents/${docId}/view`)
    if (!res.ok) return
    const { url } = await res.json()
    window.open(url, '_blank')
  }

  async function openDrawer(companyId: number) {
    const res = await fetch(`/api/companies/${companyId}`)
    const data = await res.json()
    setDrawerCompany(data)
    setDrawerOpen(true)
  }

  async function saveDocNotes(id: number) {
    await fetch(`/api/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: editNotes[id] }),
    })
    setDocuments((prev) => prev.map((d) => d.id === id ? { ...d, notes: editNotes[id] } : d))
  }

  async function deleteDoc(id: number) {
    if (!confirm('Delete this document and all extracted data?')) return
    await fetch(`/api/documents/${id}`, { method: 'DELETE' })
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }

  const SortHeader = ({ label, field }: { label: string; field: string }) => (
    <th onClick={() => toggleSort(field)}
      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-800 select-none whitespace-nowrap">
      {label} {sortKey === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Documents</h1>

      {/* Section 1 — Upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Upload Document</h2>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition mb-4 ${
            dragOver ? 'border-blue-500 bg-blue-50' : uploadFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
        >
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
          {uploadFile ? (
            <div>
              <div className="text-2xl mb-2">📄</div>
              <div className="font-medium text-green-700">{uploadFile.name}</div>
              <div className="text-sm text-green-600">{(uploadFile.size / 1024 / 1024).toFixed(1)} MB</div>
            </div>
          ) : (
            <div>
              <div className="text-3xl mb-2">📁</div>
              <div className="text-gray-600 font-medium">Drop PDF here or click to browse</div>
              <div className="text-sm text-gray-400 mt-1">PDF only · Max 50MB</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Document Type</label>
            <select value={uploadType} onChange={(e) => setUploadType(e.target.value as 'OM' | 'Rent Roll')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
              <option value="OM">Offering Memorandum</option>
              <option value="Rent Roll">Rent Roll</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Uploaded By</label>
            <input type="text" value={uploadedBy} onChange={(e) => setUploadedBy(e.target.value)}
              placeholder="Your name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
            <input type="text" value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
        </div>

        <button onClick={handleUpload} disabled={!uploadFile || uploadStatus === 'uploading' || uploadStatus === 'processing'}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-40">
          {uploadStatus === 'uploading' ? '⏳ Uploading...' : uploadStatus === 'processing' ? '🤖 Processing...' : 'Upload & Parse'}
        </button>

        {uploadLog && (
          <div className={`mt-4 rounded-lg p-4 text-xs font-mono whitespace-pre-wrap ${
            uploadStatus === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
            uploadStatus === 'done' ? 'bg-green-50 text-green-700 border border-green-200' :
            'bg-gray-900 text-green-400'
          }`}>
            {uploadLog}
          </div>
        )}
      </div>

      {/* Section 2 — Document Library */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-700">Document Library</h2>
          <span className="text-sm text-gray-500">{filtered.length} documents</span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-48" />
          <select value={docTypeFilter} onChange={(e) => setDocTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
            <option value="">All Doc Types</option>
            <option value="OM">Offering Memorandum</option>
            <option value="Rent Roll">Rent Roll</option>
          </select>
          <select value={propTypeFilter} onChange={(e) => setPropTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
            <option value="">All Property Types</option>
            <option value="office">Office</option>
            <option value="industrial">Industrial</option>
          </select>
          {cities.length > 0 && (
            <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
              <option value="">All Cities</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <input type="text" placeholder="State (MN)" value={stateFilter} onChange={(e) => setStateFilter(e.target.value.toUpperCase())} maxLength={2}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-24" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <SortHeader label="File" field="file_name" />
                  <SortHeader label="Type" field="document_type" />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">City</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">State</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Prop Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total SF</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ask Price</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">NOI</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cap Rate</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Occ.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tenants</th>
                  <SortHeader label="Uploaded" field="uploaded_date" />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">By</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={14} className="text-center py-12 text-gray-400">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={14} className="text-center py-12 text-gray-400">No documents yet. Upload one above.</td></tr>
                ) : (
                  filtered.map((doc) => {
                    const prop = doc.properties[0]
                    return (
                      <>
                        <tr key={doc.id} onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                          className="hover:bg-gray-50 cursor-pointer transition">
                          <td className="px-4 py-3 max-w-[180px]">
                            <div className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${doc.document_type === 'OM' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {doc.document_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{prop?.property_name || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{prop?.city || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{prop?.state || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{prop?.property_type || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{prop?.total_sqft ? prop.total_sqft.toLocaleString() : '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{prop?.asking_price ? `$${(prop.asking_price / 1e6).toFixed(1)}M` : '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{prop?.noi ? `$${(prop.noi / 1e3).toFixed(0)}K` : '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{prop?.cap_rate ? `${prop.cap_rate.toFixed(1)}%` : '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{prop?.occupancy_rate ? `${prop.occupancy_rate.toFixed(0)}%` : '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{prop?.tenants?.length ?? 0}</td>
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                            {new Date(doc.uploaded_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{doc.uploaded_by}</td>
                          <td className="px-4 py-3">
                            {doc.processed
                              ? <span className="text-xs text-green-600 font-medium">✓ Done</span>
                              : <span className="text-xs text-yellow-600 font-medium">⏳ Processing</span>}
                          </td>
                        </tr>
                        {expandedId === doc.id && (
                          <tr key={`${doc.id}-exp`} className="bg-blue-50">
                            <td colSpan={14} className="px-6 py-5">
                              <div className="space-y-4">
                                {/* Tenant roster */}
                                {doc.properties.map((prop) => (
                                  <div key={prop.id}>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                                      {prop.property_name || 'Property'} — Tenant Roster
                                    </h3>
                                    {prop.tenants.length === 0 ? (
                                      <p className="text-sm text-gray-400">No tenant data extracted.</p>
                                    ) : (
                                      <table className="w-full text-sm bg-white rounded-lg border border-gray-200">
                                        <thead>
                                          <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Tenant</th>
                                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">SF</th>
                                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Expiration</th>
                                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Rent PSF</th>
                                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Lease Type</th>
                                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Options</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                          {prop.tenants.map((t) => (
                                            <tr key={t.id}>
                                              <td className="px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-medium">{t.tenant_name || '—'}</span>
                                                  {t.matched_company && (
                                                    <button
                                                      onClick={(e) => { e.stopPropagation(); openDrawer(t.matched_company!.id) }}
                                                      className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full hover:bg-blue-700 transition"
                                                    >
                                                      In Watchlist
                                                    </button>
                                                  )}
                                                </div>
                                              </td>
                                              <td className="px-3 py-2 text-gray-600">{t.sqft ? t.sqft.toLocaleString() : '—'}</td>
                                              <td className="px-3 py-2 text-gray-600">
                                                {t.lease_expiration_year
                                                  ? `${t.lease_expiration_month ? t.lease_expiration_month + '/' : ''}${t.lease_expiration_year}`
                                                  : '—'}
                                              </td>
                                              <td className="px-3 py-2 text-gray-600">{t.rent_psf ? `$${t.rent_psf.toFixed(2)}` : '—'}</td>
                                              <td className="px-3 py-2 text-gray-600">{t.lease_type || '—'}</td>
                                              <td className="px-3 py-2 text-gray-500 text-xs">{t.options || '—'}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                ))}

                                {/* Actions row */}
                                <div className="flex items-center gap-3 pt-2">
                                  <button onClick={() => openViewer(doc.id)}
                                    className="text-sm bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">
                                    View PDF
                                  </button>
                                  <div className="flex items-center gap-2 flex-1">
                                    <input type="text"
                                      value={editNotes[doc.id] ?? doc.notes ?? ''}
                                      onChange={(e) => setEditNotes((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                                      onClick={(e) => e.stopPropagation()}
                                      placeholder="Add notes..."
                                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
                                    <button onClick={(e) => { e.stopPropagation(); saveDocNotes(doc.id) }}
                                      className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">
                                      Save
                                    </button>
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc.id) }}
                                    className="text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition">
                                    Delete
                                  </button>
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
        </div>
      </div>

      {/* Cross-reference drawer */}
      {drawerOpen && drawerCompany && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-[480px] bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">{drawerCompany.name}</h2>
                {drawerCompany.ticker && <p className="text-sm font-mono text-gray-400">{drawerCompany.ticker}</p>}
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <div className="px-6 py-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">EDGAR Intelligence</h3>
              {drawerCompany.properties?.length === 0 ? (
                <p className="text-sm text-gray-400">No EDGAR properties extracted yet.</p>
              ) : (
                <div className="space-y-3">
                  {drawerCompany.properties?.map((p) => (
                    <div key={p.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.property_type === 'office' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {p.property_type}
                        </span>
                        {p.city && <span className="text-sm text-gray-600">{p.city}, {p.state}</span>}
                        {p.opportunity_score && (
                          <span className="ml-auto text-xs font-bold text-green-700">{p.opportunity_score}/5</span>
                        )}
                      </div>
                      {p.sqft && <p className="text-sm text-gray-600 mb-1">{p.sqft.toLocaleString()} SF · Expires {p.lease_expiration_year || 'Unknown'}</p>}
                      {p.real_estate_strategy && <p className="text-xs text-gray-500 mb-2">{p.real_estate_strategy}</p>}
                      {p.trigger_events?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.trigger_events.map((t, i) => (
                            <span key={i} className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded">{t}</span>
                          ))}
                        </div>
                      )}
                      {p.recommended_action && <p className="text-xs text-blue-600 mt-2 font-medium">→ {p.recommended_action}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
