import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateOutreachEmail } from '@/lib/claude'

export async function POST(req: Request) {
  const { company_id, contact_id, property_id } = await req.json()

  const company = await prisma.company.findUnique({ where: { id: company_id } })
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  const contact = contact_id
    ? await prisma.contact.findUnique({ where: { id: contact_id } })
    : null

  const property = property_id
    ? await prisma.property.findUnique({ where: { id: property_id } })
    : await prisma.property.findFirst({
        where: { company_id, opportunity_score: { gte: 1 } },
        orderBy: { opportunity_score: 'desc' },
      })

  const result = await generateOutreachEmail({
    contactName: contact?.name || null,
    companyName: company.name,
    propertyType: property?.property_type || 'office',
    city: property?.city || company.hq_city || null,
    state: property?.state || company.hq_state || null,
    leaseExpirationYear: property?.lease_expiration_year || null,
    realEstateStrategy: property?.real_estate_strategy || null,
    triggerEvents: property?.trigger_events || [],
  })

  // Save to DB
  const email = await prisma.outreachEmail.create({
    data: {
      company_id,
      contact_id: contact_id || null,
      subject: result.subject,
      body: result.body,
    },
  })

  return NextResponse.json({ ...email, subject: result.subject, body: result.body })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('company_id')
  if (!companyId) return NextResponse.json([])

  const emails = await prisma.outreachEmail.findMany({
    where: { company_id: parseInt(companyId) },
    include: { contact: { select: { name: true, title: true } } },
    orderBy: { generated_date: 'desc' },
  })
  return NextResponse.json(emails)
}

export async function PATCH(req: Request) {
  const { id, ...data } = await req.json()
  const email = await prisma.outreachEmail.update({ where: { id }, data })
  return NextResponse.json(email)
}
