import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('company_id')
  const followUpDue = searchParams.get('follow_up_due') === '1'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '25')
  const skip = (page - 1) * limit

  const now = new Date()

  const where: Record<string, unknown> = {}
  if (companyId) where.company_id = parseInt(companyId)
  if (followUpDue) {
    where.activities = {
      some: {
        follow_up_date: { lte: now },
      },
    }
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: {
        company: { select: { name: true, ticker: true } },
        activities: { orderBy: { activity_date: 'desc' }, take: 1 },
        emails: { select: { id: true } },
      },
      orderBy: { last_updated: 'desc' },
      skip,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ])

  return NextResponse.json({ contacts, total, page, limit })
}
