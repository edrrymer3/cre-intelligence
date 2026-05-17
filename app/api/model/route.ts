import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrgId } from '@/lib/orgContext'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const models = await prisma.leaseModel.findMany({
    include: { scenarios: true },
    orderBy: { last_updated: 'desc' },
  })
  return NextResponse.json(models)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const model = await prisma.leaseModel.create({
    data: { ...body, created_by: session.user?.name || session.user?.email || 'Unknown' },
    include: { scenarios: true },
  })
  return NextResponse.json(model, { status: 201 })
}
