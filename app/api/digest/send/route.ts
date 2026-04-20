import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmail, buildDigestHtml } from '@/lib/email'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const settings = await prisma.appSettings.findFirst()
  const toEmail = settings?.digest_email || 'eddie@rymer.com'

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [alerts, topOpportunities, urgentLeases] = await Promise.all([
    prisma.alert.findMany({
      where: { filing_date: { gte: sevenDaysAgo }, reviewed: false },
      include: { company: { select: { name: true } } },
      orderBy: { filing_date: 'desc' },
      take: 20,
    }),
    prisma.property.findMany({
      where: { opportunity_score: { gte: 4 } },
      include: { company: { select: { name: true, ticker: true } } },
      orderBy: { opportunity_score: 'desc' },
      take: 8,
    }),
    prisma.portfolioLocation.findMany({
      where: {
        lease_expiration_date: {
          gte: new Date(),
          lte: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      },
      include: { client: { select: { name: true } } },
      orderBy: { lease_expiration_date: 'asc' },
      take: 10,
    }),
  ])

  const weekOf = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const html = buildDigestHtml({
    alerts: alerts.map((a) => ({
      company: a.company,
      alert_type: a.alert_type,
      summary: a.summary,
      filing_date: a.filing_date.toISOString(),
      filing_url: a.filing_url,
    })),
    topOpportunities: topOpportunities.map((p) => ({
      company: p.company,
      property_type: p.property_type,
      city: p.city,
      lease_expiration_year: p.lease_expiration_year,
      opportunity_score: p.opportunity_score,
    })),
    urgentLeases: urgentLeases.map((l) => ({
      client: l.client,
      property_name: l.property_name,
      city: l.city,
      lease_expiration_date: l.lease_expiration_date?.toISOString() || null,
    })),
    weekOf,
  })

  const result = await sendEmail({
    to: toEmail,
    subject: `CRE Intelligence Weekly Briefing — ${weekOf}`,
    html,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sentTo: toEmail })
}
