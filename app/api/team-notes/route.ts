import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('company_id')
  const contactId = searchParams.get('contact_id')
  const clientId = searchParams.get('client_id')

  const notes = await prisma.teamNote.findMany({
    where: {
      ...(companyId ? { company_id: parseInt(companyId) } : {}),
      ...(contactId ? { contact_id: parseInt(contactId) } : {}),
      ...(clientId ? { client_id: parseInt(clientId) } : {}),
    },
    orderBy: [{ pinned: 'desc' }, { created_date: 'desc' }],
  })
  return NextResponse.json(notes)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const note = await prisma.teamNote.create({
    data: { ...body, author: session.user?.name || session.user?.email || 'Unknown' },
  })
  return NextResponse.json(note, { status: 201 })
}

export async function PATCH(req: Request) {
  const { id, ...data } = await req.json()
  const note = await prisma.teamNote.update({ where: { id }, data })
  return NextResponse.json(note)
}

export async function DELETE(req: Request) {
  const { id } = await req.json()
  await prisma.teamNote.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
