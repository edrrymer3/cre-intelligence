import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const minScore = searchParams.get('minScore')
  const reviewed = searchParams.get('reviewed')
  const days = searchParams.get('days')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '25')
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (category) where.category = category
  if (minScore) where.relevance_score = { gte: parseInt(minScore) }
  if (reviewed === '0') where.reviewed = false
  if (reviewed === '1') where.reviewed = true
  if (days) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - parseInt(days))
    where.added_date = { gte: cutoff }
  }

  const [items, total] = await Promise.all([
    prisma.marketIntel.findMany({
      where,
      orderBy: [{ relevance_score: 'desc' }, { added_date: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.marketIntel.count({ where }),
  ])

  return NextResponse.json({ items, total, page, limit })
}

export async function PATCH(req: Request) {
  const { id, ...data } = await req.json()
  const item = await prisma.marketIntel.update({ where: { id }, data })
  return NextResponse.json(item)
}
