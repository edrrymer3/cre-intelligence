import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface SpaceForComparison {
  building_name?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  floor?: string | null
  sqft?: number | null
  asking_rate_psf?: number | null
  concessions?: string | null
  term_years?: number | null
  status?: string | null
  notes?: string | null
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { space_ids } = await req.json()

  const spaces = await prisma.dealSpace.findMany({
    where: { id: { in: space_ids }, deal_id: parseInt(id) },
  })

  if (spaces.length < 2) {
    return NextResponse.json({ error: 'Need at least 2 spaces to compare' }, { status: 400 })
  }

  const spaceDescriptions = spaces.map((s, i) =>
    `Space ${i + 1}: ${s.building_name || 'Unknown Building'}
    Address: ${s.address || '—'}, ${s.city || '—'}, ${s.state || '—'}
    Floor: ${s.floor || '—'} | SF: ${s.sqft?.toLocaleString() || '—'} | Rate: $${s.asking_rate_psf || '—'}/SF
    Annual Rent: ${s.sqft && s.asking_rate_psf ? `$${(s.sqft * s.asking_rate_psf).toLocaleString()}` : '—'}
    Term: ${s.term_years || '—'} years | Concessions: ${s.concessions || 'none'}
    Status: ${s.status || '—'}
    Notes: ${s.notes || 'none'}`
  ).join('\n\n')

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `You are an expert commercial real estate tenant representative broker analyzing spaces for a client.

Compare these ${spaces.length} spaces and provide:
1. Ranked recommendation (1st, 2nd, 3rd choice) with clear reasoning
2. Key negotiation points for each space
3. Red flags to watch for at each space
4. Suggested counter-offer strategy for each

Be specific and actionable. Focus on what gives the tenant the most leverage.

${spaceDescriptions}`,
    }],
  })

  const analysis = msg.content[0].type === 'text' ? msg.content[0].text : ''

  const comparison = await prisma.propertyComparison.create({
    data: {
      deal_id: parseInt(id),
      spaces: JSON.parse(JSON.stringify(spaces)),
      ai_analysis: analysis,
    },
  })

  return NextResponse.json({ ...comparison, spaces })
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const comparisons = await prisma.propertyComparison.findMany({
    where: { deal_id: parseInt(id) },
    orderBy: { generated_date: 'desc' },
    take: 5,
  })
  return NextResponse.json(comparisons)
}
