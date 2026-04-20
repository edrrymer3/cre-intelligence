import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const deal = await prisma.deal.findUnique({
    where: { id: parseInt(id) },
    include: {
      company: { select: { name: true, ticker: true } },
      client: { select: { name: true } },
      milestones: { orderBy: { due_date: 'asc' } },
      spaces: true,
      comparisons: { orderBy: { generated_date: 'desc' }, take: 3 },
    },
  })
  if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(deal)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const deal = await prisma.deal.update({
    where: { id: parseInt(id) },
    data: { ...body, last_updated: new Date() },
  })
  return NextResponse.json(deal)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.dealMilestone.deleteMany({ where: { deal_id: parseInt(id) } })
  await prisma.dealSpace.deleteMany({ where: { deal_id: parseInt(id) } })
  await prisma.propertyComparison.deleteMany({ where: { deal_id: parseInt(id) } })
  await prisma.deal.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ ok: true })
}
