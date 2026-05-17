import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrgId } from '@/lib/orgContext'

export async function GET() {
  const orgId = await getOrgId()
  const reits = await prisma.rEIT.findMany({
    where: {
      org_id: orgId, active: true },
    include: { _count: { select: { properties: true } } },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(reits)
}
