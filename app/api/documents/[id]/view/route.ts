import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSignedDownloadUrl } from '@/lib/storage'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const doc = await prisma.document.findUnique({ where: { id: parseInt(id) } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!doc.file_url || doc.file_url === 'pending') {
    return NextResponse.json({ error: 'File not available' }, { status: 400 })
  }

  const url = await getSignedDownloadUrl(doc.file_url, 3600)
  return NextResponse.json({ url })
}
