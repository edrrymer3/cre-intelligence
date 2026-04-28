import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const tours = await prisma.tour.findMany({
    include: {
      spaces: { include: { photos: true }, orderBy: { order_index: 'asc' } },
      _count: { select: { spaces: true } },
    },
    orderBy: { last_updated: 'desc' },
  })
  return NextResponse.json(tours)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const tour = await prisma.tour.create({
    data: {
      ...body,
      created_by: session.user?.name || session.user?.email || 'Unknown',
    },
    include: { spaces: true },
  })
  return NextResponse.json(tour, { status: 201 })
}
