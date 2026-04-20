import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const m = await prisma.dealMilestone.create({ data: { ...body, deal_id: parseInt(id) } })
  return NextResponse.json(m, { status: 201 })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { milestoneId, ...data } = await req.json()
  if (data.completed && !data.completed_date) data.completed_date = new Date()
  const m = await prisma.dealMilestone.update({ where: { id: milestoneId }, data })
  return NextResponse.json(m)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { milestoneId } = await req.json()
  await prisma.dealMilestone.delete({ where: { id: milestoneId } })
  return NextResponse.json({ ok: true })
}
