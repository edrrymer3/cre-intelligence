import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const state = searchParams.get('state')
  const minScore = searchParams.get('minScore')
  const expiringBefore = searchParams.get('expiringBefore')

  const properties = await prisma.property.findMany({
    where: {
      ...(type ? { property_type: type } : {}),
      ...(state ? { state } : {}),
      ...(minScore ? { opportunity_score: { gte: parseInt(minScore) } } : {}),
      ...(expiringBefore ? { lease_expiration_year: { lte: parseInt(expiringBefore) } } : {}),
    },
    include: { company: { select: { name: true, ticker: true } } },
    orderBy: { opportunity_score: 'desc' },
  })
  return NextResponse.json(properties)
}
