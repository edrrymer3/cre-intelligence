import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('company_id')
  const assignedTo = searchParams.get('assigned_to')

  const assignments = await prisma.teamAssignment.findMany({
    where: {
      ...(companyId ? { company_id: parseInt(companyId) } : {}),
      ...(assignedTo ? { assigned_to: assignedTo } : {}),
    },
    include: { company: { select: { name: true, ticker: true } } },
    orderBy: { assigned_date: 'desc' },
  })
  return NextResponse.json(assignments)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const assignment = await prisma.teamAssignment.create({
    data: { ...body, assigned_by: session.user?.name || session.user?.email || 'Unknown' },
  })
  return NextResponse.json(assignment, { status: 201 })
}
