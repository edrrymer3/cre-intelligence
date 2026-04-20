import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { uploadFile, makeStorageKey } from '@/lib/storage'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const docType = searchParams.get('type')
  const propType = searchParams.get('propType')
  const city = searchParams.get('city')
  const state = searchParams.get('state')
  const uploadedBy = searchParams.get('uploadedBy')

  const documents = await prisma.document.findMany({
    where: {
      ...(docType ? { document_type: docType } : {}),
      ...(uploadedBy ? { uploaded_by: uploadedBy } : {}),
      properties: {
        some: {
          ...(propType ? { property_type: propType } : {}),
          ...(city ? { city } : {}),
          ...(state ? { state } : {}),
        },
      },
    },
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
    orderBy: { uploaded_date: 'desc' },
  })

  return NextResponse.json(documents)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const document_type = formData.get('document_type') as string
  const notes = formData.get('notes') as string | null
  const uploaded_by = formData.get('uploaded_by') as string || session.user?.name || 'Unknown'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!['OM', 'Rent Roll'].includes(document_type)) {
    return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
  }

  // Validate file type and size
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
  }
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 50MB' }, { status: 400 })
  }

  // Create document record first to get ID for storage key
  const doc = await prisma.document.create({
    data: {
      file_name: file.name,
      file_url: 'pending', // will update after upload
      document_type,
      uploaded_by,
      notes: notes || null,
      processed: false,
    },
  })

  // Upload to R2
  const buffer = Buffer.from(await file.arrayBuffer())
  const key = makeStorageKey(doc.id, file.name)
  await uploadFile(buffer, key, 'application/pdf')

  // Update with real storage key
  const updated = await prisma.document.update({
    where: { id: doc.id },
    data: { file_url: key },
  })

  return NextResponse.json(updated, { status: 201 })
}
