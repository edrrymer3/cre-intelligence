import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const model = await prisma.leaseModel.findUnique({
    where: { id: parseInt(id) },
    include: { scenarios: { orderBy: { id: 'asc' } } },
  })
  if (!model) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(model)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const model = await prisma.leaseModel.update({ where: { id: parseInt(id) }, data: body })
  return NextResponse.json(model)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.leaseScenario.deleteMany({ where: { model_id: parseInt(id) } })
  await prisma.leaseModel.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ ok: true })
}
