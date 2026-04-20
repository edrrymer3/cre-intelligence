import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateLinkedInMessages } from '@/lib/claude'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { company_id, contact_id, property_id } = await req.json()

  const company = await prisma.company.findUnique({ where: { id: company_id } })
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  const contact = contact_id ? await prisma.contact.findUnique({ where: { id: contact_id } }) : null

  const property = property_id
    ? await prisma.property.findUnique({ where: { id: property_id } })
    : await prisma.property.findFirst({
        where: { company_id, opportunity_score: { gte: 1 } },
        orderBy: { opportunity_score: 'desc' },
      })

  const { connectionRequest, followUp } = await generateLinkedInMessages({
    contactName: contact?.name || null,
    contactTitle: contact?.title || null,
    companyName: company.name,
    propertyType: property?.property_type || 'office',
    city: property?.city || company.hq_city || null,
    leaseExpirationYear: property?.lease_expiration_year || null,
    realEstateStrategy: property?.real_estate_strategy || null,
    triggerEvents: property?.trigger_events || [],
  })

  // Save both as outreach emails with channel=linkedin
  const [conn, fu] = await Promise.all([
    prisma.outreachEmail.create({
      data: {
        company_id,
        contact_id: contact_id || null,
        subject: 'LinkedIn Connection Request',
        body: connectionRequest,
        channel: 'linkedin',
      },
    }),
    prisma.outreachEmail.create({
      data: {
        company_id,
        contact_id: contact_id || null,
        subject: 'LinkedIn Follow-up',
        body: followUp,
        channel: 'linkedin',
      },
    }),
  ])

  return NextResponse.json({ connectionRequest, followUp, saved: [conn.id, fu.id] })
}
