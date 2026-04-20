import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const now = new Date()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(now.getDate() - 7)

  // Top opportunities by score
  const topOpportunities = await prisma.property.findMany({
    where: { opportunity_score: { gte: 4 } },
    include: { company: { select: { name: true, ticker: true } } },
    orderBy: { opportunity_score: 'desc' },
    take: 10,
  })

  // Leases expiring within 24 months
  const currentYear = now.getFullYear()
  const expiringLeases = await prisma.property.findMany({
    where: {
      lease_expiration_year: { gte: currentYear, lte: currentYear + 2 },
      company_id: { not: null },
    },
    include: { company: { select: { name: true, ticker: true } } },
    orderBy: { lease_expiration_year: 'asc' },
    take: 15,
  })

  // New alerts this week
  const newAlerts = await prisma.alert.findMany({
    where: { filing_date: { gte: sevenDaysAgo }, reviewed: false },
    include: { company: { select: { name: true, ticker: true } } },
    orderBy: { filing_date: 'desc' },
    take: 10,
  })

  // Pipeline summary
  const pipelineByStatus = await prisma.pipeline.groupBy({
    by: ['status'],
    _count: { id: true },
  })

  // Portfolio lease urgency
  const urgentPortfolioLeases = await prisma.portfolioLocation.findMany({
    where: {
      lease_expiration_date: {
        gte: now,
        lte: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      },
    },
    include: { client: { select: { name: true } } },
    orderBy: { lease_expiration_date: 'asc' },
    take: 10,
  })

  // Top market intel
  const topMarketIntel = await prisma.marketIntel.findMany({
    where: { relevance_score: { gte: 4 }, reviewed: false },
    orderBy: [{ relevance_score: 'desc' }, { added_date: 'desc' }],
    take: 3,
  })

  // Client leases expiring < 18 months
  const expiringClientLeases = await prisma.clientLocation.findMany({
    where: {
      lease_expiration: { gte: now, lte: new Date(now.getTime() + 18 * 30 * 24 * 60 * 60 * 1000) },
    },
    include: { client: { select: { name: true } } },
    orderBy: { lease_expiration: 'asc' },
    take: 10,
  })

  // Summary counts
  const [totalCompanies, totalProperties, totalREITs, unreviewed] = await Promise.all([
    prisma.company.count({ where: { active: true } }),
    prisma.property.count(),
    prisma.rEIT.count({ where: { active: true } }),
    prisma.alert.count({ where: { reviewed: false } }),
  ])

  return NextResponse.json({
    generatedAt: now.toISOString(),
    summary: { totalCompanies, totalProperties, totalREITs, unreviewedAlerts: unreviewed },
    topOpportunities,
    expiringLeases,
    newAlerts,
    pipelineByStatus,
    urgentPortfolioLeases,
    topMarketIntel,
    expiringClientLeases,
  })
}
