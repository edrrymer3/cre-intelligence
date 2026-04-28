import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { analyzeProposal } from '@/lib/claude'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  // If pasting CoStar/PDF text, parse it first
  if (body.costar_text) {
    const parsed = await analyzeProposal(body.costar_text, body.building_name || 'Space')
    const count = await prisma.tourSpace.count({ where: { tour_id: parseInt(id) } })
    const space = await prisma.tourSpace.create({
      data: {
        tour_id: parseInt(id),
        order_index: count,
        building_name: body.building_name || parsed.building_name || null,
        address: parsed.building_name || null,
        city: parsed.city || null,
        state: parsed.state || null,
        sqft: parsed.sqft || null,
        asking_rate_psf: parsed.base_rent_psf || null,
        lease_type: null,
        term_years: parsed.term_years || null,
        landlord: parsed.landlord || null,
        notes: parsed.summary || null,
      },
      include: { photos: true },
    })
    return NextResponse.json(space, { status: 201 })
  }

  const count = await prisma.tourSpace.count({ where: { tour_id: parseInt(id) } })
  const space = await prisma.tourSpace.create({
    data: { ...body, tour_id: parseInt(id), order_index: body.order_index ?? count },
    include: { photos: true },
  })
  return NextResponse.json(space, { status: 201 })
}
