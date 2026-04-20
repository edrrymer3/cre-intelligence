import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const industry = searchParams.get('industry')
  const state = searchParams.get('state')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '25')
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (industry) where.industry = { contains: industry, mode: 'insensitive' }
  if (state) where.hq_state = state

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: {
        locations: true,
        contacts: true,
        _count: { select: { locations: true, contacts: true } },
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.client.count({ where }),
  ])

  return NextResponse.json({ clients, total, page, limit })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const client = await prisma.client.create({
    data: { ...body, added_by: session.user?.name || session.user?.email || 'Unknown' },
  })
  return NextResponse.json(client, { status: 201 })
}
