import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { analyzeProposal } from '@/lib/claude'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const maxDuration = 120

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const name = file.name.toLowerCase()

  if (name.endsWith('.pdf')) {
    // Dynamic import to avoid issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const result = await pdfParse(buffer)
    return result.text as string
  }

  if (name.endsWith('.docx') || name.endsWith('.doc')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value as string
  }

  if (name.endsWith('.txt')) {
    return buffer.toString('utf-8')
  }

  throw new Error(`Unsupported file type: ${file.name}`)
}

function calcMetrics(data: { sqft?: number | null; term_years?: number | null; base_rent_psf?: number | null; rent_escalation?: number | null; free_rent_months?: number | null; ti_psf?: number | null }) {
  const s = data.sqft || 0
  const t = data.term_years || 0
  const r = data.base_rent_psf || 0
  const esc = ((data.rent_escalation || 3) / 100)
  const fr = data.free_rent_months || 0
  const ti = data.ti_psf || 0

  if (!s || !t || !r) return { totalCost: 0, effectiveRentPsf: 0, npv: 0 }

  let totalRent = 0
  for (let y = 0; y < t; y++) totalRent += r * Math.pow(1 + esc, y) * s
  const frv = r * s * (fr / 12)
  const totalCost = totalRent - frv - (ti * s)
  const effectiveRentPsf = totalCost / (s * t)

  let npv = 0
  for (let y = 0; y < t; y++) {
    npv += (r * Math.pow(1 + esc, y) * s - (y === 0 ? frv : 0)) / Math.pow(1.07, y + 1)
  }
  npv -= ti * s

  return {
    totalCost: Math.round(totalCost),
    effectiveRentPsf: Math.round(effectiveRentPsf * 100) / 100,
    npv: Math.round(npv),
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Extract text from file
  let text: string
  try {
    text = await extractText(file)
  } catch (err) {
    return NextResponse.json({ error: `Could not read file: ${err}` }, { status: 400 })
  }

  if (!text || text.trim().length < 50) {
    return NextResponse.json({ error: 'Could not extract readable text from file' }, { status: 400 })
  }

  // Run Claude extraction
  const extracted = await analyzeProposal(text, file.name)
  const metrics = calcMetrics(extracted)

  const proposal = await prisma.proposalAnalysis.create({
    data: {
      deal_id: parseInt(id),
      file_name: file.name,
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
      total_cost: metrics.totalCost,
      effective_rent_psf: metrics.effectiveRentPsf,
      npv: metrics.npv,
      ai_summary: extracted.summary,
      raw_data: JSON.parse(JSON.stringify(extracted)),
      uploaded_by: session.user?.name || session.user?.email || 'Unknown',
    },
  })

  return NextResponse.json(proposal, { status: 201 })
}
