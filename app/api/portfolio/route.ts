import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const clients = await prisma.portfolioClient.findMany({
    include: {
      locations: true,
      _count: { select: { locations: true } },
    },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(clients)
}

export async function POST(req: Request) {
  const body = await req.json()
  const client = await prisma.portfolioClient.create({ data: body })
  return NextResponse.json(client, { status: 201 })
}
