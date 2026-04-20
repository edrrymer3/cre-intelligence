import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { findContacts } from '@/lib/contacts'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params
  const contacts = await prisma.contact.findMany({
    where: { company_id: parseInt(companyId) },
    orderBy: { added_date: 'desc' },
  })
  return NextResponse.json(contacts)
}

export async function POST(
  _: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params
  const id = parseInt(companyId)

  const company = await prisma.company.findUnique({ where: { id } })
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  // Run contact finder
  const found = await findContacts(company.name, company.ticker)

  // Save results
  const saved = []
  for (const contact of found) {
    const existing = await prisma.contact.findFirst({
      where: { company_id: id, name: contact.name ?? undefined },
    })
    if (!existing) {
      const c = await prisma.contact.create({
        data: {
          company_id: id,
          name: contact.name,
          title: contact.title,
          linkedin_url: contact.linkedin_url,
          email: contact.email,
          confidence: contact.confidence,
          source: contact.source,
        },
      })
      saved.push(c)
    }
  }

  return NextResponse.json({ found: found.length, saved: saved.length, contacts: saved })
}
