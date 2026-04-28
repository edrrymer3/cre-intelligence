import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generatePitchDeck } from '@/lib/claude'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const [templates, decks] = await Promise.all([
    prisma.pitchTemplate.findMany({ orderBy: { added_date: 'desc' } }),
    prisma.pitchDeck.findMany({ orderBy: { generated_date: 'desc' }, take: 20 }),
  ])
  return NextResponse.json({ templates, decks })
}

export async function PUT(req: Request) {
  const body = await req.json()
  const template = await prisma.pitchTemplate.create({ data: body })
  return NextResponse.json(template, { status: 201 })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { companyId, companyName, propertyType, city, sqft, leaseExpirationYear, triggerEvents, realEstateStrategy, opportunityScore } = await req.json()

  // Load pitch template if any
  const template = await prisma.pitchTemplate.findFirst({ orderBy: { added_date: 'desc' } })

  const content = await generatePitchDeck({
    companyName,
    propertyType,
    city,
    sqft,
    leaseExpirationYear,
    triggerEvents: triggerEvents || [],
    realEstateStrategy,
    opportunityScore,
    templateContent: template?.content,
  })

  const deck = await prisma.pitchDeck.create({
    data: {
      company_id: companyId || null,
      title: `Pitch Deck — ${companyName}`,
      content,
    },
  })

  return NextResponse.json(deck, { status: 201 })
}
