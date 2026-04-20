import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') || '7')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const skip = (page - 1) * limit
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days)

  // Aggregate multiple activity types into a single feed
  const [notes, contacts, emails, assignments, pipelineChanges, alerts] = await Promise.all([
    prisma.teamNote.findMany({
      where: { created_date: { gte: cutoff } },
      include: { company: { select: { name: true } } },
      orderBy: { created_date: 'desc' },
      take: 20,
    }),
    prisma.contact.findMany({
      where: { added_date: { gte: cutoff } },
      include: { company: { select: { name: true } } },
      orderBy: { added_date: 'desc' },
      take: 20,
    }),
    prisma.outreachEmail.findMany({
      where: { generated_date: { gte: cutoff } },
      include: { company: { select: { name: true } } },
      orderBy: { generated_date: 'desc' },
      take: 20,
    }),
    prisma.teamAssignment.findMany({
      where: { assigned_date: { gte: cutoff } },
      include: { company: { select: { name: true } } },
      orderBy: { assigned_date: 'desc' },
      take: 20,
    }),
    prisma.pipeline.findMany({
      where: { last_updated: { gte: cutoff } },
      include: { company: { select: { name: true } } },
      orderBy: { last_updated: 'desc' },
      take: 20,
    }),
    prisma.alert.findMany({
      where: { filing_date: { gte: cutoff }, reviewed: true },
      include: { company: { select: { name: true } } },
      orderBy: { filing_date: 'desc' },
      take: 10,
    }),
  ])

  // Normalize into unified feed items
  const feed = [
    ...notes.map((n) => ({ type: 'note', date: n.created_date, actor: n.author, company: n.company?.name, description: `Added note: "${n.note.slice(0, 80)}"`, pinned: n.pinned })),
    ...contacts.map((c) => ({ type: 'contact', date: c.added_date, actor: 'System', company: c.company?.name, description: `Contact found: ${c.name || 'Unknown'} — ${c.title}` })),
    ...emails.map((e) => ({ type: 'email', date: e.generated_date, actor: 'System', company: e.company?.name, description: `Outreach generated: ${e.subject?.slice(0, 60) || e.channel}` })),
    ...assignments.map((a) => ({ type: 'assignment', date: a.assigned_date, actor: a.assigned_by, company: a.company?.name, description: `Assigned to ${a.assigned_to}${a.notes ? `: ${a.notes}` : ''}` })),
    ...pipelineChanges.map((p) => ({ type: 'pipeline', date: p.last_updated, actor: 'Team', company: p.company?.name, description: `Pipeline status: ${p.status}` })),
    ...alerts.map((a) => ({ type: 'alert', date: a.filing_date, actor: 'System', company: a.company?.name, description: `Alert reviewed: ${a.alert_type}` })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(skip, skip + limit)

  return NextResponse.json({ feed, total: feed.length + skip })
}
