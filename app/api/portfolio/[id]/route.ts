import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const client = await prisma.portfolioClient.findUnique({
    where: { id: parseInt(id) },
    include: { locations: { include: { company: { select: { name: true, ticker: true } } } } },
  })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(client)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const client = await prisma.portfolioClient.update({ where: { id: parseInt(id) }, data: body })
  return NextResponse.json(client)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.portfolioLocation.deleteMany({ where: { client_id: parseInt(id) } })
  await prisma.portfolioClient.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ ok: true })
}
