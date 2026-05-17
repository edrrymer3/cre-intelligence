import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrgId } from '@/lib/orgContext'

export async function GET() {
  const orgId = await getOrgId()
  const alerts = await prisma.alert.findMany({
    where: {
      org_id: orgId, reviewed: false },
    include: { company: { select: { name: true, ticker: true } } },
    orderBy: { filing_date: 'desc' },
    take: 50,
  })
  return NextResponse.json(alerts)
}

export async function PATCH(req: Request) {
  const { id } = await req.json()
  const alert = await prisma.alert.update({ where: { id }, data: { reviewed: true } })
  return NextResponse.json(alert)
}
