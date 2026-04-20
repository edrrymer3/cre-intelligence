import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const location = await prisma.portfolioLocation.create({
    data: { ...body, client_id: parseInt(id) },
    include: { company: { select: { name: true, ticker: true } } },
  })
  return NextResponse.json(location, { status: 201 })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { locId, ...data } = await req.json()
  const location = await prisma.portfolioLocation.update({
    where: { id: locId },
    data,
    include: { company: { select: { name: true, ticker: true } } },
  })
  return NextResponse.json(location)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { locId } = await req.json()
  await prisma.portfolioLocation.delete({ where: { id: locId } })
  return NextResponse.json({ ok: true })
}
