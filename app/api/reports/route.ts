import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n')
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const report = searchParams.get('report')
  const format = searchParams.get('format') || 'json'

  if (report === 'prospect-pipeline') {
    const props = await prisma.property.findMany({
      where: { opportunity_score: { gte: 4 }, company_id: { not: null } },
      include: {
        company: {
          include: { contacts: { take: 1 } },
        },
      },
      orderBy: [{ lease_expiration_year: 'asc' }, { opportunity_score: 'desc' }],
    })

    if (format === 'csv') {
      const csv = toCsv(
        ['Company', 'Ticker', 'Type', 'City', 'State', 'SF', 'Lease Expiration', 'Score', 'Triggers', 'Recommended Action', 'Contact Name', 'Contact Title', 'Contact Email'],
        props.map((p) => [
          p.company?.name, p.company?.ticker, p.property_type, p.city, p.state,
          p.sqft, p.lease_expiration_year, p.opportunity_score,
          p.trigger_events.join('; '), p.recommended_action,
          p.company?.contacts[0]?.name, p.company?.contacts[0]?.title, p.company?.contacts[0]?.email,
        ])
      )
      return new Response(csv, {
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="prospect-pipeline.csv"' },
      })
    }
    return NextResponse.json(props)
  }

  if (report === 'lease-expiration') {
    const props = await prisma.property.findMany({
      where: {
        lease_expiration_year: { gte: new Date().getFullYear(), lte: new Date().getFullYear() + 5 },
        company_id: { not: null },
      },
      include: { company: { select: { name: true, ticker: true } } },
      orderBy: [{ lease_expiration_year: 'asc' }, { property_type: 'asc' }],
    })

    if (format === 'csv') {
      const csv = toCsv(
        ['Company', 'Ticker', 'Type', 'City', 'State', 'SF', 'Lease Expiration Year'],
        props.map((p) => [p.company?.name, p.company?.ticker, p.property_type, p.city, p.state, p.sqft, p.lease_expiration_year])
      )
      return new Response(csv, {
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="lease-expiration.csv"' },
      })
    }
    return NextResponse.json(props)
  }

  if (report === 'client-portfolio') {
    const clients = await prisma.client.findMany({
      include: { locations: true, contacts: true },
      orderBy: { name: 'asc' },
    })

    if (format === 'csv') {
      const rows: (string | number | null | undefined)[][] = []
      for (const c of clients) {
        for (const loc of c.locations) {
          rows.push([c.name, c.industry, loc.city, loc.state, loc.property_type, loc.sqft, loc.annual_rent, loc.commission_earned,
            loc.lease_expiration ? new Date(loc.lease_expiration).toLocaleDateString() : null, loc.landlord])
        }
        if (c.locations.length === 0) rows.push([c.name, c.industry, '', '', '', '', '', '', '', ''])
      }
      const csv = toCsv(['Client', 'Industry', 'City', 'State', 'Type', 'SF', 'Annual Rent', 'Commission', 'Lease Expiration', 'Landlord'], rows)
      return new Response(csv, {
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="client-portfolio.csv"' },
      })
    }
    return NextResponse.json(clients)
  }

  if (report === 'weekly-activity') {
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const [pipeline, contacts, emails, alerts] = await Promise.all([
      prisma.pipeline.findMany({ where: { last_updated: { gte: sevenDaysAgo } }, include: { company: { select: { name: true } } } }),
      prisma.contact.findMany({ where: { added_date: { gte: sevenDaysAgo } }, include: { company: { select: { name: true } } } }),
      prisma.outreachEmail.findMany({ where: { generated_date: { gte: sevenDaysAgo } }, include: { company: { select: { name: true } } } }),
      prisma.alert.findMany({ where: { reviewed: true, filing_date: { gte: sevenDaysAgo } }, include: { company: { select: { name: true } } } }),
    ])
    return NextResponse.json({ pipeline, contacts, emails, alerts, weekOf: sevenDaysAgo.toLocaleDateString() })
  }

  return NextResponse.json({ error: 'Unknown report' }, { status: 400 })
}
