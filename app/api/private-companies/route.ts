import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')
  const state = searchParams.get('state')

  const companies = await prisma.privateCompany.findMany({
    where: {
      active: true,
      ...(state ? { hq_state: state } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    include: { locations: true },
    orderBy: [{ opportunity_score: 'desc' }, { name: 'asc' }],
  })
  return NextResponse.json(companies)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Auto-calculate opportunity score based on available data
  let score = 1
  if (body.location_count && body.location_count >= 5) score += 2
  else if (body.location_count && body.location_count >= 2) score += 1
  if (body.estimated_sf && body.estimated_sf >= 100000) score += 1
  if (body.employee_count && body.employee_count >= 500) score += 1
  score = Math.min(5, score)

  const company = await prisma.privateCompany.create({
    data: {
      ...body,
      opportunity_score: body.opportunity_score || score,
      added_by: session.user?.name || session.user?.email || 'Unknown',
    },
    include: { locations: true },
  })
  return NextResponse.json(company, { status: 201 })
}
