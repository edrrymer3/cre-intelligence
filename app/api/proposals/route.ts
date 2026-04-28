import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { analyzeProposal, calculateProposalMetrics } from '@/lib/claude'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const analyses = await prisma.proposalAnalysis.findMany({ orderBy: { created_date: 'desc' } })
  return NextResponse.json(analyses)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { text, filename, deal_id } = body

  const data = await analyzeProposal(text, filename)
  const metrics = calculateProposalMetrics(data)

  const analysis = await prisma.proposalAnalysis.create({
    data: {
      file_name: filename,
      deal_id: deal_id || null,
      landlord: data.landlord,
      building_name: data.building_name,
      city: data.city,
      state: data.state,
      sqft: data.sqft,
      term_years: data.term_years,
      base_rent_psf: data.base_rent_psf,
      rent_escalation: data.rent_escalation,
      free_rent_months: data.free_rent_months,
      ti_psf: data.ti_psf,
      other_concessions: data.other_concessions,
      total_cost: metrics.totalCost,
      effective_rent_psf: metrics.effectiveRentPsf,
      npv: metrics.npv,
      ai_summary: data.summary,
      raw_data: JSON.parse(JSON.stringify(data)),
      uploaded_by: session.user?.name || session.user?.email || 'Unknown',
    },
  })

  return NextResponse.json(analysis, { status: 201 })
}
