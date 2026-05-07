import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { analyzeProposal } from '@/lib/claude'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const proposals = await prisma.proposalAnalysis.findMany({
    where: { deal_id: parseInt(id) },
    orderBy: { created_date: 'asc' },
  })
  return NextResponse.json(proposals)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  // If pasting proposal text — extract with Claude
  if (body.proposal_text) {
    const extracted = await analyzeProposal(body.proposal_text, body.file_name || 'Proposal')

    // Calculate metrics inline
    const sqft = extracted.sqft || body.sqft || 0
    const term = extracted.term_years || body.term_years || 0
    const baseRent = extracted.base_rent_psf || 0
    const escalation = (extracted.rent_escalation || 3) / 100
    const freeRent = extracted.free_rent_months || 0
    const ti = extracted.ti_psf || 0

    let totalRent = 0
    for (let y = 0; y < term; y++) {
      totalRent += baseRent * Math.pow(1 + escalation, y) * sqft
    }
    const freeRentValue = baseRent * sqft * (freeRent / 12)
    const totalCost = totalRent - freeRentValue - (ti * sqft)
    const effectiveRentPsf = sqft && term ? totalCost / (sqft * term) : 0

    let npv = 0
    const discountRate = 0.07
    for (let y = 0; y < term; y++) {
      const yearRent = baseRent * Math.pow(1 + escalation, y) * sqft
      const freeRentThisYear = y === 0 ? freeRentValue : 0
      npv += (yearRent - freeRentThisYear) / Math.pow(1 + discountRate, y + 1)
    }
    npv -= ti * sqft

    const proposal = await prisma.proposalAnalysis.create({
      data: {
        deal_id: parseInt(id),
        file_name: body.file_name || extracted.building_name || 'Proposal',
        landlord: extracted.landlord,
        building_name: extracted.building_name,
        city: extracted.city,
        state: extracted.state,
        sqft: extracted.sqft,
        term_years: extracted.term_years,
        base_rent_psf: extracted.base_rent_psf,
        rent_escalation: extracted.rent_escalation,
        free_rent_months: extracted.free_rent_months,
        ti_psf: extracted.ti_psf,
        other_concessions: extracted.other_concessions,
        total_cost: Math.round(totalCost),
        effective_rent_psf: Math.round(effectiveRentPsf * 100) / 100,
        npv: Math.round(npv),
        ai_summary: extracted.summary,
        raw_data: JSON.parse(JSON.stringify(extracted)),
        uploaded_by: 'Eddie',
      },
    })
    return NextResponse.json(proposal, { status: 201 })
  }

  // Manual entry
  const { sqft, term_years, base_rent_psf, rent_escalation, free_rent_months, ti_psf, ...rest } = body
  const s = sqft || 0
  const t = term_years || 0
  const r = base_rent_psf || 0
  const esc = (rent_escalation || 3) / 100
  const fr = free_rent_months || 0
  const ti = ti_psf || 0

  let totalRent = 0
  for (let y = 0; y < t; y++) totalRent += r * Math.pow(1 + esc, y) * s
  const frv = r * s * (fr / 12)
  const totalCost = totalRent - frv - (ti * s)
  const effectiveRentPsf = s && t ? totalCost / (s * t) : 0
  let npv = 0
  for (let y = 0; y < t; y++) {
    npv += (r * Math.pow(1 + esc, y) * s - (y === 0 ? frv : 0)) / Math.pow(1.07, y + 1)
  }
  npv -= ti * s

  const proposal = await prisma.proposalAnalysis.create({
    data: {
      ...rest,
      deal_id: parseInt(id),
      sqft: s || null,
      term_years: t || null,
      base_rent_psf: r || null,
      rent_escalation: rent_escalation || null,
      free_rent_months: fr || null,
      ti_psf: ti || null,
      total_cost: Math.round(totalCost),
      effective_rent_psf: Math.round(effectiveRentPsf * 100) / 100,
      npv: Math.round(npv),
    },
  })
  return NextResponse.json(proposal, { status: 201 })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { proposalId } = await req.json()
  await prisma.proposalAnalysis.delete({ where: { id: proposalId } })
  return NextResponse.json({ ok: true })
}
