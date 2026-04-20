import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const property = await prisma.property.update({
    where: { id: parseInt(id) },
    data: body,
  })
  return NextResponse.json(property)
}
