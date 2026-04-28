import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Map script IDs to their dedicated API routes
const SCRIPT_ROUTES: Record<string, string> = {
  'discover-companies': '/api/admin/run/discover-companies',
  'discover-reits': '/api/admin/run/discover-reits',
  'extract-filings': '/api/admin/run/extract-filings',
  'market-intelligence': '/api/admin/run/market-intelligence',
  'monitor-news': '/api/admin/run/market-intelligence', // fallback
  'weekly-digest': '/api/digest/send',
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { script } = await req.json()
  const route = SCRIPT_ROUTES[script]

  if (!route) {
    return NextResponse.json({ error: 'Unknown script' }, { status: 400 })
  }

  // Forward to the dedicated route
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}${route}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: req.headers.get('cookie') || '',
    },
  })

  // Stream the response back
  return new Response(res.body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
