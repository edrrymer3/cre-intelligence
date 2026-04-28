'use client'

import { useEffect, useState } from 'react'

interface Photo { id: number; url: string; caption: string | null; is_primary: boolean }
interface Space {
  id: number; order_index: number; building_name: string | null; address: string | null
  city: string | null; state: string | null; floor: string | null; sqft: number | null
  asking_rate_psf: number | null; lease_type: string | null; term_years: number | null
  available_date: string | null; landlord: string | null; landlord_rep: string | null
  amenities: string | null; parking: string | null; transit_score: string | null
  virtual_tour_url: string | null; building_url: string | null; floor_plan_url: string | null
  notes: string | null; broker_rating: number | null; status: string; photos: Photo[]
}
interface Tour {
  id: number; title: string; client_name: string; client_email: string | null
  tour_date: string | null; share_token: string; notes: string | null
  spaces: Space[]; _count: { spaces: number }
}

const SPACE_FIELDS = [
  { key: 'building_name', label: 'Building Name', type: 'text' },
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'state', label: 'State', type: 'text' },
  { key: 'floor', label: 'Floor / Suite', type: 'text' },
  { key: 'sqft', label: 'Square Feet', type: 'number' },
  { key: 'asking_rate_psf', label: 'Asking Rate PSF', type: 'number' },
  { key: 'lease_type', label: 'Lease Type', type: 'text' },
  { key: 'term_years', label: 'Term (years)', type: 'number' },
  { key: 'available_date', label: 'Available Date', type: 'text' },
  { key: 'landlord', label: 'Landlord', type: 'text' },
  { key: 'landlord_rep', label: 'Landlord Rep', type: 'text' },
  { key: 'amenities', label: 'Amenities', type: 'text' },
  { key: 'parking', label: 'Parking', type: 'text' },
  { key: 'transit_score', label: 'Transit / Walk Score', type: 'text' },
  { key: 'virtual_tour_url', label: 'Virtual Tour URL', type: 'text' },
  { key: 'building_url', label: 'Building Website', type: 'text' },
  { key: 'floor_plan_url', label: 'Floor Plan URL', type: 'text' },
  { key: 'notes', label: 'Broker Notes', type: 'textarea' },
  { key: 'broker_rating', label: 'Broker Rating (1-5)', type: 'number' },
]

export default function ToursPage() {
  const [tours, setTours] = useState<Tour[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTourId, setExpandedTourId] = useState<number | null>(null)
  const [expandedSpaceId, setExpandedSpaceId] = useState<number | null>(null)
  const [showNewTour, setShowNewTour] = useState(false)
  const [showNewSpace, setShowNewSpace] = useState<number | null>(null)
  const [copied, setCopied] = useState<number | null>(null)

  // New tour form
  const [tourForm, setTourForm] = useState({ title: '', client_name: '', client_email: '', tour_date: '', notes: '' })
  const [savingTour, setSavingTour] = useState(false)

  // New space form
  const [spaceForm, setSpaceForm] = useState<Record<string, string>>({})
  const [savingSpace, setSavingSpace] = useState(false)
  const [costarText, setCostarText] = useState('')
  const [parsingCostar, setParsingCostar] = useState(false)

  // Edit space
  const [editSpace, setEditSpace] = useState<Record<string, string>>({})
  const [savingEdit, setSavingEdit] = useState(false)

  // Photo URL add
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoCaption, setPhotoCaption] = useState('')
  const [addingPhoto, setAddingPhoto] = useState<number | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/tours')
    const data = await res.json()
    setTours(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function createTour(e: React.FormEvent) {
    e.preventDefault()
    setSavingTour(true)
    await fetch('/api/tours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tourForm),
    })
    setSavingTour(false)
    setShowNewTour(false)
    setTourForm({ title: '', client_name: '', client_email: '', tour_date: '', notes: '' })
    load()
  }

  async function addSpace(tourId: number) {
    setSavingSpace(true)
    const payload: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(spaceForm)) {
      if (!v) continue
      if (['sqft', 'term_years', 'broker_rating'].includes(k)) payload[k] = parseInt(v)
      else if (k === 'asking_rate_psf') payload[k] = parseFloat(v)
      else payload[k] = v
    }
    await fetch(`/api/tours/${tourId}/spaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSavingSpace(false)
    setShowNewSpace(null)
    setSpaceForm({})
    load()
  }

  async function parseCostar(tourId: number) {
    if (!costarText) return
    setParsingCostar(true)
    await fetch(`/api/tours/${tourId}/spaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ costar_text: costarText }),
    })
    setParsingCostar(false)
    setCostarText('')
    load()
  }

  async function saveSpaceEdit(tourId: number, spaceId: number) {
    setSavingEdit(true)
    const payload: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(editSpace)) {
      if (['sqft', 'term_years', 'broker_rating'].includes(k)) payload[k] = v ? parseInt(v) : null
      else if (k === 'asking_rate_psf') payload[k] = v ? parseFloat(v) : null
      else payload[k] = v || null
    }
    await fetch(`/api/tours/${tourId}/spaces/${spaceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSavingEdit(false)
    setExpandedSpaceId(null)
    setEditSpace({})
    load()
  }

  async function deleteSpace(tourId: number, spaceId: number) {
    if (!confirm('Remove this space from the tour?')) return
    await fetch(`/api/tours/${tourId}/spaces/${spaceId}`, { method: 'DELETE' })
    load()
  }

  async function addPhoto(spaceId: number) {
    if (!photoUrl) return
    setAddingPhoto(spaceId)
    await fetch(`/api/tours/0/spaces/${spaceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: photoUrl, caption: photoCaption || null }),
    })
    setPhotoUrl('')
    setPhotoCaption('')
    setAddingPhoto(null)
    load()
  }

  function copyShareLink(tour: Tour) {
    const url = `${window.location.origin}/tour/${tour.share_token}`
    navigator.clipboard.writeText(url)
    setCopied(tour.id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tour Cards</h1>
          <p className="text-gray-500 text-sm mt-1">Create interactive tour packages for clients — shareable link, photos, client feedback</p>
        </div>
        <button onClick={() => setShowNewTour(!showNewTour)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition">
          + New Tour
        </button>
      </div>

      {/* New tour form */}
      {showNewTour && (
        <form onSubmit={createTour} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">New Tour Package</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[['title','Tour Title *','text',true],['client_name','Client Name *','text',true],['client_email','Client Email','email'],['tour_date','Tour Date','date']].map(([k,l,t,req]) => (
              <div key={k as string}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{l as string}</label>
                <input type={t as string} required={!!req} value={(tourForm as Record<string,string>)[k as string]}
                  onChange={(e) => setTourForm((p) => ({ ...p, [k as string]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <input type="text" value={tourForm.notes} onChange={(e) => setTourForm((p) => ({ ...p, notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={savingTour} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{savingTour ? 'Creating…' : 'Create Tour'}</button>
            <button type="button" onClick={() => setShowNewTour(false)} className="border border-gray-300 text-gray-600 px-5 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : tours.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">🏢</div>
          <p>No tours yet. Create one above to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tours.map((tour) => (
            <div key={tour.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Tour header */}
              <div className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => setExpandedTourId(expandedTourId === tour.id ? null : tour.id)}>
                <div>
                  <div className="font-semibold text-gray-900">{tour.title}</div>
                  <div className="text-sm text-gray-500">{tour.client_name}{tour.tour_date ? ` · ${new Date(tour.tour_date).toLocaleDateString()}` : ''}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">{tour._count.spaces}</div>
                    <div className="text-xs text-gray-400">Spaces</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); copyShareLink(tour) }}
                    className={`text-sm px-4 py-2 rounded-lg border transition ${copied === tour.id ? 'bg-green-600 text-white border-green-600' : 'border-blue-300 text-blue-600 hover:bg-blue-50'}`}>
                    {copied === tour.id ? '✓ Copied!' : '🔗 Share Link'}
                  </button>
                  <span className="text-gray-400">{expandedTourId === tour.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expandedTourId === tour.id && (
                <div className="border-t border-gray-100 px-6 py-5">
                  {/* Add space options */}
                  <div className="flex gap-3 mb-5">
                    <button onClick={() => { setShowNewSpace(tour.id); setSpaceForm({}) }}
                      className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                      + Add Space Manually
                    </button>
                    <button onClick={() => setShowNewSpace(tour.id === showNewSpace ? null : -tour.id)}
                      className="text-sm border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition">
                      📋 Import from CoStar / PDF
                    </button>
                    <a href={`/tour/${tour.share_token}`} target="_blank" rel="noopener noreferrer"
                      className="text-sm border border-blue-200 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition">
                      👁 Preview Client View
                    </a>
                  </div>

                  {/* Manual add form */}
                  {showNewSpace === tour.id && (
                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">Add Space</h3>
                      <div className="grid grid-cols-4 gap-3 mb-3">
                        {SPACE_FIELDS.slice(0, 16).map((f) => (
                          <div key={f.key}>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                            {f.type === 'textarea' ? (
                              <textarea value={spaceForm[f.key] || ''} onChange={(e) => setSpaceForm((p) => ({ ...p, [f.key]: e.target.value }))}
                                rows={2} className="w-full border border-gray-300 rounded px-2 py-1 text-sm resize-none" />
                            ) : (
                              <input type={f.type} value={spaceForm[f.key] || ''} onChange={(e) => setSpaceForm((p) => ({ ...p, [f.key]: e.target.value }))}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {SPACE_FIELDS.slice(16).map((f) => (
                          <div key={f.key}>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                            <textarea value={spaceForm[f.key] || ''} onChange={(e) => setSpaceForm((p) => ({ ...p, [f.key]: e.target.value }))}
                              rows={2} className="w-full border border-gray-300 rounded px-2 py-1 text-sm resize-none" />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => addSpace(tour.id)} disabled={savingSpace}
                          className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                          {savingSpace ? 'Adding…' : 'Add Space'}
                        </button>
                        <button onClick={() => setShowNewSpace(null)} className="text-sm border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg hover:bg-gray-50">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* CoStar import */}
                  {showNewSpace === -tour.id && (
                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Import from CoStar / PDF</h3>
                      <p className="text-xs text-gray-400 mb-3">Paste the listing text from CoStar, Crexi, LoopNet, or any PDF export. Claude will extract the key details automatically.</p>
                      <textarea rows={6} value={costarText} onChange={(e) => setCostarText(e.target.value)}
                        placeholder="Paste listing text here..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none mb-3" />
                      <div className="flex gap-2">
                        <button onClick={() => parseCostar(tour.id)} disabled={parsingCostar || !costarText}
                          className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                          {parsingCostar ? '⏳ Parsing…' : '✨ Import with AI'}
                        </button>
                        <button onClick={() => setShowNewSpace(null)} className="text-sm border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg hover:bg-gray-50">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Space list */}
                  {tour.spaces.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No spaces yet. Add one above.</p>
                  ) : (
                    <div className="space-y-3">
                      {tour.spaces.map((space, idx) => (
                        <div key={space.id} className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setExpandedSpaceId(expandedSpaceId === space.id ? null : space.id)
                              if (expandedSpaceId !== space.id) {
                                setEditSpace(Object.fromEntries(SPACE_FIELDS.map((f) => [f.key, String((space as unknown as Record<string,unknown>)[f.key] || '')])))
                              }
                            }}>
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                              <div>
                                <div className="font-medium text-gray-900 text-sm">{space.building_name || `Space ${idx + 1}`}</div>
                                <div className="text-xs text-gray-400">{[space.address, space.city, space.state].filter(Boolean).join(', ')}{space.floor ? ` · ${space.floor}` : ''}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              {space.sqft && <span className="text-gray-600">{space.sqft.toLocaleString()} SF</span>}
                              {space.asking_rate_psf && <span className="text-gray-600">${space.asking_rate_psf}/SF</span>}
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{space.photos.length} 📷</span>
                              <button onClick={(e) => { e.stopPropagation(); deleteSpace(tour.id, space.id) }}
                                className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded border border-transparent hover:border-red-200">Remove</button>
                            </div>
                          </div>

                          {expandedSpaceId === space.id && (
                            <div className="p-5 border-t border-gray-100">
                              {/* Edit fields */}
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Edit Space Details</h4>
                              <div className="grid grid-cols-4 gap-3 mb-4">
                                {SPACE_FIELDS.slice(0, 16).map((f) => (
                                  <div key={f.key}>
                                    <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                                    <input type={f.type === 'textarea' ? 'text' : f.type}
                                      value={editSpace[f.key] || ''}
                                      onChange={(e) => setEditSpace((p) => ({ ...p, [f.key]: e.target.value }))}
                                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
                                  </div>
                                ))}
                              </div>
                              <div className="mb-3">
                                <label className="block text-xs text-gray-400 mb-1">Broker Notes</label>
                                <textarea value={editSpace['notes'] || ''} onChange={(e) => setEditSpace((p) => ({ ...p, notes: e.target.value }))}
                                  rows={2} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm resize-none" />
                              </div>
                              <div className="grid grid-cols-3 gap-3 mb-4">
                                {['virtual_tour_url','building_url','floor_plan_url'].map((k) => (
                                  <div key={k}>
                                    <label className="block text-xs text-gray-400 mb-1">{SPACE_FIELDS.find((f) => f.key === k)?.label}</label>
                                    <input type="text" value={editSpace[k] || ''} onChange={(e) => setEditSpace((p) => ({ ...p, [k]: e.target.value }))}
                                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" placeholder="https://..." />
                                  </div>
                                ))}
                              </div>
                              <button onClick={() => saveSpaceEdit(tour.id, space.id)} disabled={savingEdit}
                                className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 mr-2">
                                {savingEdit ? 'Saving…' : 'Save Changes'}
                              </button>

                              {/* Photos */}
                              <div className="mt-5 pt-4 border-t border-gray-100">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                  Photos ({space.photos.length})
                                  <span className="ml-2 text-gray-400 normal-case font-normal">R2 storage coming soon — paste image URLs for now</span>
                                </h4>
                                {space.photos.length > 0 && (
                                  <div className="flex gap-2 mb-3 flex-wrap">
                                    {space.photos.map((p) => (
                                      <div key={p.id} className="relative">
                                        <img src={p.url} alt={p.caption || ''} className="w-20 h-16 object-cover rounded-lg border border-gray-200" />
                                        {p.caption && <p className="text-xs text-gray-400 mt-1 max-w-[80px] truncate">{p.caption}</p>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <input type="text" placeholder="Photo URL" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)}
                                    className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm" />
                                  <input type="text" placeholder="Caption (optional)" value={photoCaption} onChange={(e) => setPhotoCaption(e.target.value)}
                                    className="w-40 border border-gray-200 rounded px-2 py-1.5 text-sm" />
                                  <button onClick={() => addPhoto(space.id)} disabled={!photoUrl || addingPhoto === space.id}
                                    className="text-sm bg-gray-800 text-white px-3 py-1.5 rounded-lg hover:bg-gray-900 disabled:opacity-50">
                                    {addingPhoto === space.id ? '…' : 'Add'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
