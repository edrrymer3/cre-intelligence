import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculatePriorityScore, recalculateAllScores } from '@/lib/scoring'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const companyId = body.company_id

  if (companyId) {
    // Score single company
    const result = await calculatePriorityScore(companyId, prisma)
    await prisma.priorityScore.upsert({
      where: { company_id: companyId },
      update: { ...result, calculated_at: new Date() },
      create: { company_id: companyId, ...result },
    })
    return NextResponse.json(result)
  }

  // Recalculate all
  const updated = await recalculateAllScores(prisma)
  return NextResponse.json({ updated })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('company_id')

  if (companyId) {
    const score = await prisma.priorityScore.findUnique({ where: { company_id: parseInt(companyId) } })
    return NextResponse.json(score)
  }

  const scores = await prisma.priorityScore.findMany({
    orderBy: { score: 'desc' },
    include: { company: { select: { name: true, ticker: true } } },
    take: 50,
  })
  return NextResponse.json(scores)
}
