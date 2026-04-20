import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { deleteFile } from '@/lib/storage'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const doc = await prisma.document.findUnique({
    where: { id: parseInt(id) },
    include: {
      properties: {
        include: {
          tenants: {
            include: {
              matched_company: { select: { id: true, name: true, ticker: true } },
            },
          },
        },
      },
    },
  })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(doc)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const doc = await prisma.document.update({
    where: { id: parseInt(id) },
    data: body,
  })
  return NextResponse.json(doc)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const doc = await prisma.document.findUnique({ where: { id: parseInt(id) } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete from R2
  if (doc.file_url && doc.file_url !== 'pending') {
    await deleteFile(doc.file_url).catch(() => {}) // don't fail if R2 delete fails
  }

  // Delete DB records (cascade)
  await prisma.documentTenant.deleteMany({
    where: { document_property: { document_id: doc.id } },
  })
  await prisma.documentProperty.deleteMany({ where: { document_id: doc.id } })
  await prisma.document.delete({ where: { id: doc.id } })

  return NextResponse.json({ ok: true })
}
