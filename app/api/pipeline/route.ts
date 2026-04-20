import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const pipeline = await prisma.pipeline.findMany({
    include: { company: { select: { name: true, ticker: true } } },
    orderBy: { last_updated: 'desc' },
  })
  return NextResponse.json(pipeline)
}

export async function POST(req: Request) {
  const body = await req.json()
  const item = await prisma.pipeline.create({ data: body })
  return NextResponse.json(item, { status: 201 })
}

export async function PATCH(req: Request) {
  const { id, ...data } = await req.json()
  const item = await prisma.pipeline.update({ where: { id }, data })
  return NextResponse.json(item)
}
