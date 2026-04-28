import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; spaceId: string }> }) {
  const { spaceId } = await params
  const body = await req.json()
  const space = await prisma.tourSpace.update({
    where: { id: parseInt(spaceId) },
    data: body,
    include: { photos: true },
  })
  return NextResponse.json(space)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; spaceId: string }> }) {
  const { spaceId } = await params
  await prisma.tourPhoto.deleteMany({ where: { space_id: parseInt(spaceId) } })
  await prisma.tourSpace.delete({ where: { id: parseInt(spaceId) } })
  return NextResponse.json({ ok: true })
}

// Add photo to a space (URL-based for now — R2 upload comes later)
export async function POST(req: Request, { params }: { params: Promise<{ id: string; spaceId: string }> }) {
  const { spaceId } = await params
  const { url, caption, is_primary } = await req.json()
  const photo = await prisma.tourPhoto.create({
    data: { space_id: parseInt(spaceId), url, caption: caption || null, is_primary: is_primary || false },
  })
  return NextResponse.json(photo, { status: 201 })
}
