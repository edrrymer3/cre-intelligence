import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const [companies, contacts, clients, documents] = await Promise.all([
    prisma.company.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { ticker: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, ticker: true, hq_state: true },
      take: 5,
    }),
    prisma.contact.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { title: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: { company: { select: { name: true } } },
      take: 5,
    }),
    prisma.client.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      select: { id: true, name: true, industry: true, hq_state: true },
      take: 5,
    }),
    prisma.document.findMany({
      where: { file_name: { contains: q, mode: 'insensitive' } },
      select: { id: true, file_name: true, document_type: true, uploaded_date: true },
      take: 3,
    }),
  ])

  return NextResponse.json({
    results: [
      ...companies.map((c) => ({ type: 'company', id: c.id, label: c.name, sub: c.ticker || c.hq_state, href: '/dashboard/prospects' })),
      ...contacts.map((c) => ({ type: 'contact', id: c.id, label: c.name || 'Unknown', sub: `${c.title || ''} · ${c.company?.name || ''}`, href: '/dashboard/contacts' })),
      ...clients.map((c) => ({ type: 'client', id: c.id, label: c.name, sub: c.industry || c.hq_state, href: '/dashboard/clients' })),
      ...documents.map((d) => ({ type: 'document', id: d.id, label: d.file_name, sub: d.document_type, href: '/dashboard/documents' })),
    ],
  })
}
