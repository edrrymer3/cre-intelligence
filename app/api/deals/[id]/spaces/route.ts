import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const space = await prisma.dealSpace.create({ data: { ...body, deal_id: parseInt(id) } })
  return NextResponse.json(space, { status: 201 })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { spaceId, ...data } = await req.json()
  const space = await prisma.dealSpace.update({ where: { id: spaceId }, data })
  return NextResponse.json(space)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { spaceId } = await req.json()
  await prisma.dealSpace.delete({ where: { id: spaceId } })
  return NextResponse.json({ ok: true })
}
