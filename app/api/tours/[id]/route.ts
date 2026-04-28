import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tour = await prisma.tour.findUnique({
    where: { id: parseInt(id) },
    include: { spaces: { include: { photos: true }, orderBy: { order_index: 'asc' } } },
  })
  if (!tour) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(tour)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const tour = await prisma.tour.update({ where: { id: parseInt(id) }, data: body })
  return NextResponse.json(tour)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.tour.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ ok: true })
}
