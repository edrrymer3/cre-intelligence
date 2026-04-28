'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

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
  id: number; title: string; client_name: string; tour_date: string | null
  notes: string | null; spaces: Space[]
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} onClick={() => onChange(s)}
          className={`text-2xl transition ${s <= value ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}>
          ★
        </button>
      ))}
    </div>
  )
}

export default function ClientTourPage() {
  const { token } = useParams<{ token: string }>()
  const [tour, setTour] = useState<Tour | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSpace, setActiveSpace] = useState(0)
  const [activePhoto, setActivePhoto] = useState(0)
  const [comments, setComments] = useState<Record<number, { rating: number; comment: string }>>({})
  const [clientName, setClientName] = useState('')
  const [submitting, setSubmitting] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({})

  useEffect(() => {
    fetch(`/api/tours/${token}/export`)
      .then((r) => r.json())
      .then((d) => { setTour(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token])

  async function submitComment(spaceId: number) {
    const data = comments[spaceId]
    if (!data?.comment) return
    setSubmitting(spaceId)
    await fetch(`/api/tours/${token}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ space_id: spaceId, comment: data.comment, rating: data.rating || null, client_name: clientName || null }),
    })
    setSubmitted((p) => ({ ...p, [spaceId]: true }))
    setSubmitting(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400">Loading your tour...</div>
    </div>
  )

  if (!tour) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><div className="text-4xl mb-3">🏢</div><p className="text-gray-500">Tour not found.</p></div>
    </div>
  )

  const space = tour.spaces[activeSpace]
  const annualRent = space?.sqft && space?.asking_rate_psf ? space.sqft * space.asking_rate_psf : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1a1a2e] text-white px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">JLL Tenant Representation</p>
            <h1 className="text-xl font-bold">{tour.title}</h1>
            <p className="text-gray-300 text-sm mt-0.5">
              {tour.client_name}
              {tour.tour_date && ` · ${new Date(tour.tour_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-400">{tour.spaces.length}</div>
            <div className="text-xs text-gray-400">Spaces</div>
          </div>
        </div>
      </div>

      {/* Space tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 flex gap-1 overflow-x-auto py-2">
          {tour.spaces.map((s, i) => (
            <button key={s.id} onClick={() => { setActiveSpace(i); setActivePhoto(0) }}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${activeSpace === i ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {i + 1}. {s.building_name || `Space ${i + 1}`}
            </button>
          ))}
        </div>
      </div>

      {/* Space detail */}
      {space && (
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="grid grid-cols-3 gap-6">
            {/* Left: photos + details */}
            <div className="col-span-2 space-y-5">
              {/* Photo gallery */}
              {space.photos.length > 0 ? (
                <div className="bg-white rounded-2xl overflow-hidden border border-gray-200">
                  <div className="relative bg-gray-100 h-72">
                    <img src={space.photos[activePhoto]?.url} alt={space.photos[activePhoto]?.caption || ''}
                      className="w-full h-full object-cover" />
                    {space.photos[activePhoto]?.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-sm px-4 py-2">
                        {space.photos[activePhoto].caption}
                      </div>
                    )}
                  </div>
                  {space.photos.length > 1 && (
                    <div className="flex gap-2 p-3 overflow-x-auto">
                      {space.photos.map((p, i) => (
                        <button key={p.id} onClick={() => setActivePhoto(i)}
                          className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition ${activePhoto === i ? 'border-blue-500' : 'border-transparent'}`}>
                          <img src={p.url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-100 rounded-2xl h-48 flex items-center justify-center text-gray-400">
                  <div className="text-center"><div className="text-3xl mb-2">📷</div><p className="text-sm">Photos coming soon</p></div>
                </div>
              )}

              {/* Key stats */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="font-bold text-gray-900 text-lg mb-1">{space.building_name || 'Space'}</h2>
                <p className="text-gray-500 text-sm mb-4">{[space.address, space.city, space.state].filter(Boolean).join(', ')}{space.floor ? ` · ${space.floor}` : ''}</p>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  {[
                    ['Square Feet', space.sqft ? `${space.sqft.toLocaleString()} SF` : '—'],
                    ['Asking Rate', space.asking_rate_psf ? `$${space.asking_rate_psf.toFixed(2)}/SF` : '—'],
                    ['Annual Rent', annualRent ? `$${annualRent.toLocaleString()}` : '—'],
                    ['Lease Type', space.lease_type || '—'],
                    ['Term', space.term_years ? `${space.term_years} years` : '—'],
                    ['Available', space.available_date || '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">{k}</p>
                      <p className="font-semibold text-gray-900 text-sm">{v}</p>
                    </div>
                  ))}
                </div>

                {space.amenities && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Amenities</p>
                    <p className="text-sm text-gray-700">{space.amenities}</p>
                  </div>
                )}

                {space.parking && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Parking</p>
                    <p className="text-sm text-gray-700">{space.parking}</p>
                  </div>
                )}

                {space.notes && (
                  <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">Broker Notes</p>
                    <p className="text-sm text-blue-900">{space.notes}</p>
                  </div>
                )}

                {/* Links */}
                <div className="flex gap-3 mt-4">
                  {space.virtual_tour_url && (
                    <a href={space.virtual_tour_url} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline border border-blue-200 px-3 py-1.5 rounded-lg">
                      🎥 Virtual Tour
                    </a>
                  )}
                  {space.floor_plan_url && (
                    <a href={space.floor_plan_url} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline border border-blue-200 px-3 py-1.5 rounded-lg">
                      📐 Floor Plan
                    </a>
                  )}
                  {space.building_url && (
                    <a href={space.building_url} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline border border-blue-200 px-3 py-1.5 rounded-lg">
                      🏢 Building Info
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Right: feedback */}
            <div className="space-y-4">
              {/* Broker rating */}
              {space.broker_rating && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Broker Rating</p>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <span key={s} className={`text-xl ${s <= space.broker_rating! ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Landlord */}
              {(space.landlord || space.landlord_rep) && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Landlord Info</p>
                  {space.landlord && <p className="text-sm font-medium text-gray-900">{space.landlord}</p>}
                  {space.landlord_rep && <p className="text-sm text-gray-500">{space.landlord_rep}</p>}
                </div>
              )}

              {/* Client feedback */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Your Feedback</p>

                {submitted[space.id] ? (
                  <div className="text-center py-4">
                    <div className="text-2xl mb-2">✅</div>
                    <p className="text-sm text-green-600 font-medium">Feedback saved!</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-3">
                      <p className="text-xs text-gray-400 mb-1">Your name (optional)</p>
                      <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                        placeholder="Your name"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                    </div>
                    <div className="mb-3">
                      <p className="text-xs text-gray-400 mb-1">How do you rate this space?</p>
                      <StarRating value={comments[space.id]?.rating || 0}
                        onChange={(v) => setComments((p) => ({ ...p, [space.id]: { ...p[space.id], rating: v } }))} />
                    </div>
                    <div className="mb-3">
                      <p className="text-xs text-gray-400 mb-1">Comments</p>
                      <textarea rows={3} value={comments[space.id]?.comment || ''}
                        onChange={(e) => setComments((p) => ({ ...p, [space.id]: { ...p[space.id], comment: e.target.value } }))}
                        placeholder="What did you think? Pros, cons, questions..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none" />
                    </div>
                    <button onClick={() => submitComment(space.id)} disabled={submitting === space.id || !comments[space.id]?.comment}
                      className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                      {submitting === space.id ? 'Saving…' : 'Submit Feedback'}
                    </button>
                  </>
                )}
              </div>

              {/* Nav */}
              <div className="flex gap-2">
                <button onClick={() => { setActiveSpace(Math.max(0, activeSpace - 1)); setActivePhoto(0) }}
                  disabled={activeSpace === 0}
                  className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-40">
                  ← Prev
                </button>
                <button onClick={() => { setActiveSpace(Math.min(tour.spaces.length - 1, activeSpace + 1)); setActivePhoto(0) }}
                  disabled={activeSpace === tour.spaces.length - 1}
                  className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-40">
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 mt-12 py-6 text-center text-xs text-gray-400">
        Prepared by JLL Tenant Representation · Eddie Rymer · Powered by CRE Intelligence
      </div>
    </div>
  )
}
