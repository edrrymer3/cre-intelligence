import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  const body = await req.json()
  const { email, name, brokerage, market } = body

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  try {
    const entry = await prisma.waitlistEmail.create({
      data: { email, name: name || null, brokerage: brokerage || null, market: market || null },
    })
    return NextResponse.json({ ok: true, id: entry.id }, { status: 201 })
  } catch {
    // Unique constraint — already on waitlist
    return NextResponse.json({ ok: true, already: true })
  }
}
