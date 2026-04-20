import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = await prisma.client.findUnique({
    where: { id: parseInt(id) },
    include: { locations: true, contacts: true },
  })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(client)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const client = await prisma.client.update({ where: { id: parseInt(id) }, data: body })
  return NextResponse.json(client)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.clientContact.deleteMany({ where: { client_id: parseInt(id) } })
  await prisma.clientLocation.deleteMany({ where: { client_id: parseInt(id) } })
  await prisma.client.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ ok: true })
}
