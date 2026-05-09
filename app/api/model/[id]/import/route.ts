import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateScenario } from '@/lib/leaseModel'
import Anthropic from '@anthropic-ai/sdk'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const maxDuration = 120

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const model = await prisma.leaseModel.findUnique({ where: { id: parseInt(id) } })
  if (!model) return NextResponse.json({ error: 'Model not found' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  // Extract text
  let text = ''
  if (file.name.toLowerCase().endsWith('.pdf')) {
    const buffer = Buffer.from(await file.arrayBuffer())
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const result = await pdfParse(buffer)
    text = result.text
  } else {
    text = await file.text()
  }

  // Ask Claude to extract all scenarios
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are a commercial real estate financial analyst. Extract all lease comparison scenarios from this document.

Return valid JSON only — no commentary, no markdown:
{
  "scenarios": [
    {
      "name": string (scenario name/label),
      "address": string or null,
      "suite": string or null,
      "rsf": number or null,
      "start_date": "YYYY-MM-DD" or null,
      "term_months": number or null,
      "lease_type": "NNN" or "Gross" or "Modified Gross" or null,
      "base_rent_psf": number or null (annual $/SF base rent only, NOT gross),
      "expenses_psf": number or null (annual operating expenses/NNN PSF),
      "rent_escalation": number or null (annual % e.g. 3.0),
      "free_rent_months": number or null,
      "free_rent_type": "Gross" or "Base" or null,
      "ti_allowance_psf": number or null,
      "capex_psf": number or null (total buildout cost PSF),
      "parking_cost_monthly": number or null (per space per month),
      "parking_spaces": number or null,
      "notes": string or null
    }
  ]
}

Extract EVERY scenario/proposal mentioned. Use null for unknown fields.

Document:
${text.slice(0, 50000)}`,
    }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Could not parse scenarios from document' }, { status: 400 })

  let parsed: { scenarios: Parameters<typeof calculateScenario>[0][] }
  try { parsed = JSON.parse(jsonMatch[0]) } catch { return NextResponse.json({ error: 'JSON parse error' }, { status: 400 }) }

  const scenarios = parsed.scenarios || []
  const created = []

  for (const s of scenarios) {
    const calc = calculateScenario(s, model.discount_rate)
    const scenario = await prisma.leaseScenario.create({
      data: {
        model_id: parseInt(id),
        name: s.name || 'Unnamed',
        address: s.address || null,
        suite: s.suite || null,
        rsf: s.rsf || null,
        start_date: s.start_date || null,
        term_months: s.term_months || null,
        lease_type: s.lease_type || 'NNN',
        base_rent_psf: s.base_rent_psf || null,
        expenses_psf: s.expenses_psf || null,
        rent_escalation: s.rent_escalation ?? 3.0,
        free_rent_months: s.free_rent_months ?? 0,
        free_rent_type: s.free_rent_type || 'Gross',
        ti_allowance_psf: s.ti_allowance_psf || null,
        capex_psf: s.capex_psf || null,
        parking_cost_monthly: s.parking_cost_monthly || null,
        parking_spaces: s.parking_spaces || null,
        notes: s.notes || null,
        total_occupancy_cost: calc.total_occupancy_cost,
        annual_avg_cost: calc.annual_avg_occupancy_cost,
        avg_cost_psf: calc.avg_occupancy_cost_psf,
        npv: calc.npv,
        net_effective_rent_psf: calc.net_effective_rent_psf,
        cash_flows: calc.cash_flows as unknown as object[],
      },
    })
    created.push(scenario)
  }

  return NextResponse.json({ imported: created.length, scenarios: created })
}
