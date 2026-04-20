import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const company = await prisma.company.findUnique({
    where: { id: parseInt(id) },
    include: { properties: true, alerts: true, pipeline: true, filings: true },
  })
  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(company)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const company = await prisma.company.update({
    where: { id: parseInt(id) },
    data: body,
  })
  return NextResponse.json(company)
}
