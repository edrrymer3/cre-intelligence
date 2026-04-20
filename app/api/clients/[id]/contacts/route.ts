import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const contact = await prisma.clientContact.create({ data: { ...body, client_id: parseInt(id) } })
  return NextResponse.json(contact, { status: 201 })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { contactId, ...data } = await req.json()
  const contact = await prisma.clientContact.update({ where: { id: contactId }, data })
  return NextResponse.json(contact)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { contactId } = await req.json()
  await prisma.clientContact.delete({ where: { id: contactId } })
  return NextResponse.json({ ok: true })
}
