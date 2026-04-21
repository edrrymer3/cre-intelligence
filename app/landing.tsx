'use client'

import { useState } from 'react'
import Link from 'next/link'

const FEATURES = [
  { icon: '📄', title: 'SEC Filing Intelligence', desc: 'Automatically mine 10-Qs and 8-Ks for lease expirations, trigger events, and real estate strategy across every company in your market.' },
  { icon: '🏗️', title: 'REIT Tenant Watchlist', desc: "See who's leasing in your market before they call a broker. Track tenant rosters across every major REIT filing in Minnesota." },
  { icon: '✍️', title: 'AI Outreach Generator', desc: 'Personalized cold emails written from SEC filing intelligence. Claude drafts 4-sentence emails that sound human, not like a mass blast.' },
  { icon: '🤝', title: 'Deal Tracker', desc: 'Manage your full pipeline from prospect to closed deal with a drag-and-drop Kanban board, milestone tracker, and commission calculator.' },
  { icon: '📁', title: 'Document Intelligence', desc: 'Upload OMs and rent rolls — Claude extracts every tenant, lease term, and expiration. Instantly cross-references against your watchlist.' },
  { icon: '📰', title: 'Market Intelligence', desc: 'Weekly AI-powered briefings on your local CRE market. News, relocations, restructurings, and investment sales — curated and scored.' },
]

const STEPS = [
  { num: '01', title: 'Connect your market', desc: 'Point it at Minnesota — or any market. The platform automatically discovers every public company with office or industrial leases through EDGAR.' },
  { num: '02', title: 'Run your first intelligence scan', desc: "Claude reads the filings, extracts every property, scores every opportunity, and surfaces who's most likely to need a tenant rep broker right now." },
  { num: '03', title: 'Start closing deals', desc: 'Generate personalized outreach, find the right contacts, track your deals, and get weekly briefings — all in one place built for how you actually work.' },
]

export default function LandingPage() {
  const [form, setForm] = useState({ email: '', name: '', brokerage: '', market: '' })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSubmitting(false)
    if (res.ok) setSubmitted(true)
    else setError(data.error || 'Something went wrong')
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-gray-900 text-lg">CRE Intelligence</div>
          <Link href="/login" className="text-sm bg-[#1a1a2e] text-white px-5 py-2 rounded-lg hover:bg-[#2d2d4e] transition">
            Login
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 bg-[#1a1a2e] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-block text-xs font-semibold tracking-widest uppercase text-blue-400 mb-6 border border-blue-800 px-4 py-1.5 rounded-full">
            Built for tenant rep brokers
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-6">
            The CRE Intelligence Platform<br />
            <span className="text-blue-400">Built for Tenant Rep Brokers</span>
          </h1>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Mine SEC filings, track lease expirations, find contacts, and close more deals — all in one place.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="#early-access"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-base font-semibold transition">
              Request Early Access
            </a>
            <Link href="/login"
              className="border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 px-8 py-4 rounded-xl text-base font-semibold transition">
              Login →
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-blue-600 py-8">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-4 gap-8 text-center text-white">
          {[['54+', 'API Routes'], ['20+', 'Database Tables'], ['35', 'Built Steps'], ['7', 'Phases Complete']].map(([n, l]) => (
            <div key={l}>
              <div className="text-3xl font-bold">{n}</div>
              <div className="text-blue-200 text-sm mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything a tenant rep needs. Nothing they don't.</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">Built from scratch for the way tenant rep brokers actually prospect, pitch, and close.</p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-7 border border-gray-200 hover:border-blue-200 hover:shadow-md transition">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-500">From zero to a full prospect pipeline in one afternoon.</p>
          </div>
          <div className="space-y-12">
            {STEPS.map((step) => (
              <div key={step.num} className="flex gap-8 items-start">
                <div className="flex-shrink-0 w-16 h-16 bg-[#1a1a2e] text-white rounded-2xl flex items-center justify-center text-xl font-bold">
                  {step.num}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Early access */}
      <section id="early-access" className="py-24 bg-[#1a1a2e]">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Built by a tenant rep broker.<br />For tenant rep brokers.</h2>
          <p className="text-gray-400 mb-10 leading-relaxed">
            This isn't a generic CRM. Every feature was designed around the specific workflow of a tenant rep broker in a local market — prospecting from SEC data, managing client portfolios, generating outreach, and closing deals.
          </p>

          {submitted ? (
            <div className="bg-green-900/40 border border-green-700 rounded-2xl p-8">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-white font-bold text-lg mb-2">You're on the list.</h3>
              <p className="text-green-300 text-sm">We'll be in touch when early access opens.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-8 text-left space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Your Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500" placeholder="Eddie Rymer" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Email *</label>
                  <input required type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500" placeholder="you@yourfirm.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Brokerage</label>
                  <input type="text" value={form.brokerage} onChange={(e) => setForm((p) => ({ ...p, brokerage: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500" placeholder="JLL, CBRE, independent..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Market</label>
                  <input type="text" value={form.market} onChange={(e) => setForm((p) => ({ ...p, market: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500" placeholder="Minneapolis, Chicago..." />
                </div>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50 text-base">
                {submitting ? 'Submitting…' : 'Request Early Access'}
              </button>
              <p className="text-xs text-gray-500 text-center">No spam. Just early access when it's ready.</p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-10">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-gray-500">
          <div>
            <span className="text-gray-300 font-semibold">CRE Intelligence</span>
            <span className="mx-3">·</span>
            Built with Claude AI
          </div>
          <div className="flex items-center gap-6">
            <a href="mailto:eddie@rymer.com" className="hover:text-gray-300 transition">Contact</a>
            <Link href="/login" className="hover:text-gray-300 transition">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
