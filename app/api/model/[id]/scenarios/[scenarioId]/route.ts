import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateScenario } from '@/lib/leaseModel'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; scenarioId: string }> }) {
  const { id, scenarioId } = await params
  const model = await prisma.leaseModel.findUnique({ where: { id: parseInt(id) } })
  const body = await req.json()

  // Recalculate if financial fields changed
  const financialFields = ['rsf','term_months','base_rent_psf','expenses_psf','rent_escalation','free_rent_months','free_rent_type','ti_allowance_psf','capex_psf','parking_cost_monthly','parking_spaces','start_date']
  const needsRecalc = financialFields.some((f) => f in body)

  let calcData = {}
  if (needsRecalc && model) {
    const existing = await prisma.leaseScenario.findUnique({ where: { id: parseInt(scenarioId) } })
    const merged = { ...existing, ...body }
    const calc = calculateScenario(merged as Parameters<typeof calculateScenario>[0], model.discount_rate)
    calcData = {
      total_occupancy_cost: calc.total_occupancy_cost,
      annual_avg_cost: calc.annual_avg_occupancy_cost,
      avg_cost_psf: calc.avg_occupancy_cost_psf,
      npv: calc.npv,
      net_effective_rent_psf: calc.net_effective_rent_psf,
      cash_flows: calc.cash_flows as unknown as object[],
    }
  }

  const scenario = await prisma.leaseScenario.update({
    where: { id: parseInt(scenarioId) },
    data: { ...body, ...calcData },
  })
  return NextResponse.json(scenario)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; scenarioId: string }> }) {
  const { scenarioId } = await params
  await prisma.leaseScenario.delete({ where: { id: parseInt(scenarioId) } })
  return NextResponse.json({ ok: true })
}
