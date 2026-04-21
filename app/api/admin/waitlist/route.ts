import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format')

  const entries = await prisma.waitlistEmail.findMany({ orderBy: { submitted_date: 'desc' } })

  if (format === 'csv') {
    const rows = [
      '"Email","Name","Brokerage","Market","Date"',
      ...entries.map((e) =>
        [e.email, e.name || '', e.brokerage || '', e.market || '', new Date(e.submitted_date).toLocaleDateString()]
          .map((v) => `"${v.replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n')
    return new Response(rows, {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="waitlist.csv"' },
    })
  }

  return NextResponse.json(entries)
}
