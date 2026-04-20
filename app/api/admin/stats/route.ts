import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [companies, reits, properties, alerts, filings] = await Promise.all([
    prisma.company.count(),
    prisma.rEIT.count(),
    prisma.property.count(),
    prisma.alert.count({ where: { reviewed: false } }),
    prisma.filing.findFirst({ orderBy: { processed_date: 'desc' }, where: { processed: true } }),
  ])

  return NextResponse.json({ companies, reits, properties, alerts, lastRun: filings?.processed_date || null })
}
