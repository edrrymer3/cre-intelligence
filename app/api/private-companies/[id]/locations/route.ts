import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const loc = await prisma.privateCompanyLocation.create({ data: { ...body, company_id: parseInt(id) } })
  return NextResponse.json(loc, { status: 201 })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { locId } = await req.json()
  await prisma.privateCompanyLocation.delete({ where: { id: locId } })
  return NextResponse.json({ ok: true })
}
