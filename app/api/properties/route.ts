import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const state = searchParams.get('state')
  const minScore = searchParams.get('minScore')
  const expiringBefore = searchParams.get('expiringBefore')
  const hasDocument = searchParams.get('hasDocument') === '1'

  // If hasDocument filter: find company IDs that appear in DocumentTenant
  let companyIds: number[] | undefined
  if (hasDocument) {
    const matched = await prisma.documentTenant.findMany({
      where: { matched_company_id: { not: null } },
      select: { matched_company_id: true },
      distinct: ['matched_company_id'],
    })
    companyIds = matched.map((m) => m.matched_company_id!)
  }

  const properties = await prisma.property.findMany({
    where: {
      ...(type ? { property_type: type } : {}),
      ...(state ? { state } : {}),
      ...(minScore ? { opportunity_score: { gte: parseInt(minScore) } } : {}),
      ...(expiringBefore ? { lease_expiration_year: { lte: parseInt(expiringBefore) } } : {}),
      ...(companyIds ? { company_id: { in: companyIds } } : {}),
    },
    include: { company: { select: { name: true, ticker: true } } },
    orderBy: { opportunity_score: 'desc' },
  })
  return NextResponse.json(properties)
}
