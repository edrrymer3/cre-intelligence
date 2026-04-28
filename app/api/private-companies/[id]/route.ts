import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const company = await prisma.privateCompany.update({
    where: { id: parseInt(id) },
    data: body,
    include: { locations: true },
  })
  return NextResponse.json(company)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.privateCompanyLocation.deleteMany({ where: { company_id: parseInt(id) } })
  await prisma.privateCompany.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ ok: true })
}
