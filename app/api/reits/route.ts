import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const reits = await prisma.rEIT.findMany({
    where: { active: true },
    include: { _count: { select: { properties: true } } },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(reits)
}
