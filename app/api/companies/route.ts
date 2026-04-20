import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const state = searchParams.get('state')
  const search = searchParams.get('search')

  const companies = await prisma.company.findMany({
    where: {
      active: true,
      ...(state ? { hq_state: state } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    include: { _count: { select: { properties: true, alerts: true } } },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(companies)
}

export async function POST(req: Request) {
  const body = await req.json()
  const company = await prisma.company.create({ data: body })
  return NextResponse.json(company, { status: 201 })
}
