import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateScenario } from '@/lib/leaseModel'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const model = await prisma.leaseModel.findUnique({ where: { id: parseInt(id) } })
  if (!model) return NextResponse.json({ error: 'Model not found' }, { status: 404 })

  const body = await req.json()
  const calc = calculateScenario(body, model.discount_rate)

  const scenario = await prisma.leaseScenario.create({
    data: {
      model_id: parseInt(id),
      ...body,
      total_occupancy_cost: calc.total_occupancy_cost,
      annual_avg_cost: calc.annual_avg_occupancy_cost,
      avg_cost_psf: calc.avg_occupancy_cost_psf,
      npv: calc.npv,
      net_effective_rent_psf: calc.net_effective_rent_psf,
      cash_flows: calc.cash_flows as unknown as object[],
    },
  })
  return NextResponse.json({ ...scenario, _calc: calc }, { status: 201 })
}
