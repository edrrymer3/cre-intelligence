import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const assignedTo = searchParams.get('assigned_to')

  const deals = await prisma.deal.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(assignedTo ? { assigned_to: assignedTo } : {}),
    },
    include: {
      company: { select: { name: true, ticker: true } },
      client: { select: { name: true } },
      milestones: { orderBy: { due_date: 'asc' } },
      spaces: true,
      _count: { select: { milestones: true, spaces: true } },
    },
    orderBy: { last_updated: 'desc' },
  })
  return NextResponse.json(deals)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const deal = await prisma.deal.create({
    data: { ...body, last_updated: new Date() },
    include: {
      company: { select: { name: true, ticker: true } },
      client: { select: { name: true } },
      milestones: true,
      spaces: true,
    },
  })
  return NextResponse.json(deal, { status: 201 })
}
