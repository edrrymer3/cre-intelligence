/**
 * Lease comparison financial model — matches JLL analysis format
 */

export interface ScenarioInput {
  name: string
  address?: string
  suite?: string
  rsf?: number
  start_date?: string // YYYY-MM-DD
  term_months?: number
  lease_type?: string
  base_rent_psf?: number
  expenses_psf?: number
  rent_escalation?: number // annual % e.g. 3.0
  free_rent_months?: number
  free_rent_type?: string // "Gross" or "Base"
  ti_allowance_psf?: number
  capex_psf?: number
  parking_cost_monthly?: number
  parking_spaces?: number
}

export interface CashFlow {
  year: number
  amount: number
}

export interface ScenarioOutput {
  gross_rent_psf: number
  total_rent_expenses: number
  annual_avg_rent_expenses: number
  avg_rent_expenses_psf: number
  net_capex_psf: number
  net_capex_total: number
  npv: number
  total_occupancy_cost: number
  annual_avg_occupancy_cost: number
  avg_occupancy_cost_psf: number
  net_effective_rent_psf: number
  cash_flows: CashFlow[]
}

export function calculateScenario(input: ScenarioInput, discountRate = 8.0): ScenarioOutput {
  const rsf = input.rsf || 0
  const termMonths = input.term_months || 0
  const termYears = termMonths / 12
  const baseRent = input.base_rent_psf || 0
  const expenses = input.expenses_psf || 0
  const escalation = (input.rent_escalation ?? 3.0) / 100
  const freeRentMonths = input.free_rent_months || 0
  const freeRentType = input.free_rent_type || 'Gross'
  const ti = input.ti_allowance_psf || 0
  const capex = input.capex_psf || 0
  const parkingMonthly = (input.parking_cost_monthly || 0) * (input.parking_spaces || 0)

  const grossRentPsf = baseRent + expenses

  // Calculate annual rent by year (partial years handled)
  const startDate = input.start_date ? new Date(input.start_date) : new Date()
  const endDate = new Date(startDate)
  endDate.setMonth(endDate.getMonth() + termMonths)

  // Build monthly cash flows then aggregate by calendar year
  const monthlyCashFlows: { date: Date; baseRent: number; expenses: number; parking: number }[] = []

  for (let m = 0; m < termMonths; m++) {
    const date = new Date(startDate)
    date.setMonth(date.getMonth() + m)
    const yearIdx = Math.floor(m / 12)
    const escalatedBase = baseRent * Math.pow(1 + escalation, yearIdx)
    const escalatedExpenses = expenses * Math.pow(1 + escalation, yearIdx)

    // Free rent check
    let monthBase = escalatedBase
    let monthExpenses = escalatedExpenses
    if (m < freeRentMonths) {
      if (freeRentType === 'Gross') { monthBase = 0; monthExpenses = 0 }
      else { monthBase = 0 } // Base only free rent
    }

    monthlyCashFlows.push({
      date,
      baseRent: monthBase,
      expenses: monthExpenses,
      parking: parkingMonthly,
    })
  }

  // Aggregate by calendar year
  const byYear: Record<number, number> = {}
  for (const m of monthlyCashFlows) {
    const yr = m.date.getFullYear()
    const monthly = (m.baseRent + m.expenses + m.parking) * rsf / 12
    byYear[yr] = (byYear[yr] || 0) + monthly
  }

  const cashFlows: CashFlow[] = Object.entries(byYear)
    .map(([year, amount]) => ({ year: parseInt(year), amount: Math.round(amount) }))
    .sort((a, b) => a.year - b.year)

  // Total rent & expenses (without parking/capex)
  const totalRentExpenses = monthlyCashFlows.reduce((s, m) => s + (m.baseRent + m.expenses) * rsf / 12, 0)
  const annualAvgRentExpenses = termYears > 0 ? totalRentExpenses / termYears : 0
  const avgRentExpensesPsf = rsf > 0 && termYears > 0 ? totalRentExpenses / (rsf * termYears) : 0

  // Capex
  const netCapexPsf = Math.max(0, capex - ti)
  const netCapexTotal = netCapexPsf * rsf

  // Total occupancy cost (rent + expenses + parking + net capex)
  const totalParking = parkingMonthly * termMonths
  const totalOccupancyCost = totalRentExpenses + totalParking + netCapexTotal
  const annualAvgOccupancyCost = termYears > 0 ? totalOccupancyCost / termYears : 0
  const avgOccupancyCostPsf = rsf > 0 && termYears > 0 ? totalOccupancyCost / (rsf * termYears) : 0

  // NPV of total cost
  const dr = discountRate / 100
  let npv = netCapexTotal // upfront capex at t=0
  for (let m = 0; m < monthlyCashFlows.length; m++) {
    const cf = monthlyCashFlows[m]
    const monthlyAmt = (cf.baseRent + cf.expenses + parkingMonthly / rsf) * rsf / 12
    const t = (m + 1) / 12
    npv += monthlyAmt / Math.pow(1 + dr, t)
  }

  // Net effective rent PSF = (total rent - free rent value + net capex amortized) / (rsf * term years)
  const totalBaseRent = monthlyCashFlows.reduce((s, m) => s + m.baseRent * rsf / 12, 0)
  const netEffectiveRentPsf = rsf > 0 && termYears > 0
    ? (totalBaseRent + netCapexTotal) / (rsf * termYears)
    : 0

  return {
    gross_rent_psf: grossRentPsf,
    total_rent_expenses: Math.round(totalRentExpenses),
    annual_avg_rent_expenses: Math.round(annualAvgRentExpenses),
    avg_rent_expenses_psf: Math.round(avgRentExpensesPsf * 100) / 100,
    net_capex_psf: Math.round(netCapexPsf * 100) / 100,
    net_capex_total: Math.round(netCapexTotal),
    npv: Math.round(npv),
    total_occupancy_cost: Math.round(totalOccupancyCost),
    annual_avg_occupancy_cost: Math.round(annualAvgOccupancyCost),
    avg_occupancy_cost_psf: Math.round(avgOccupancyCostPsf * 100) / 100,
    net_effective_rent_psf: Math.round(netEffectiveRentPsf * 100) / 100,
    cash_flows: cashFlows,
  }
}
