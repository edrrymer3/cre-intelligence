import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Public endpoint — returns tour by share token
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // id could be numeric ID or share token
  const isNumeric = /^\d+$/.test(id)
  const tour = await prisma.tour.findFirst({
    where: isNumeric ? { id: parseInt(id) } : { share_token: id },
    include: { spaces: { include: { photos: true }, orderBy: { order_index: 'asc' } } },
  })

  if (!tour) return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
  return NextResponse.json(tour)
}

// Client comments — no auth required
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const isNumeric = /^\d+$/.test(id)
  const tour = await prisma.tour.findFirst({
    where: isNumeric ? { id: parseInt(id) } : { share_token: id },
  })
  if (!tour) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const comment = await prisma.clientComment.create({
    data: {
      tour_id: tour.id,
      space_id: body.space_id || null,
      comment: body.comment,
      rating: body.rating || null,
      client_name: body.client_name || null,
    },
  })
  return NextResponse.json(comment, { status: 201 })
}
