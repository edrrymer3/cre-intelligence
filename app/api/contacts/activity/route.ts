import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const activity = await prisma.contactActivity.create({
    data: {
      contact_id: body.contact_id,
      activity_type: body.activity_type,
      summary: body.summary,
      activity_date: new Date(body.activity_date || Date.now()),
      added_by: session.user?.name || session.user?.email || 'Unknown',
      follow_up_date: body.follow_up_date ? new Date(body.follow_up_date) : null,
      follow_up_note: body.follow_up_note || null,
    },
  })
  return NextResponse.json(activity, { status: 201 })
}

export async function PATCH(req: Request) {
  const { id, ...data } = await req.json()
  // Snooze: update follow_up_date by 7 days
  if (data.snooze) {
    const act = await prisma.contactActivity.findUnique({ where: { id } })
    const newDate = new Date((act?.follow_up_date || new Date()).getTime() + 7 * 24 * 60 * 60 * 1000)
    const updated = await prisma.contactActivity.update({ where: { id }, data: { follow_up_date: newDate } })
    return NextResponse.json(updated)
  }
  const updated = await prisma.contactActivity.update({ where: { id }, data })
  return NextResponse.json(updated)
}
