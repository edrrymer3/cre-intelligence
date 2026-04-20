import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const expiringBefore = searchParams.get('expiringBefore')

  const properties = await prisma.property.findMany({
    where: {
      reit_id: { not: null },
      company_id: null,
      ...(type ? { property_type: type } : {}),
      ...(expiringBefore ? { lease_expiration_year: { lte: parseInt(expiringBefore) } } : {}),
    },
    include: { reit: { select: { name: true, ticker: true } } },
    orderBy: { lease_expiration_year: 'asc' },
  })
  return NextResponse.json(properties)
}
