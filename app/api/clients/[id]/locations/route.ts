import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const loc = await prisma.clientLocation.create({ data: { ...body, client_id: parseInt(id) } })
  return NextResponse.json(loc, { status: 201 })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { locId, ...data } = await req.json()
  const loc = await prisma.clientLocation.update({ where: { id: locId }, data })
  return NextResponse.json(loc)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { locId } = await req.json()
  await prisma.clientLocation.delete({ where: { id: locId } })
  return NextResponse.json({ ok: true })
}
