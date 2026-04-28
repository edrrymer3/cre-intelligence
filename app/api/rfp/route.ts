import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateRFPResponse } from '@/lib/claude'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Get templates and past responses
export async function GET() {
  const [templates, responses] = await Promise.all([
    prisma.rFPTemplate.findMany({ orderBy: { added_date: 'desc' } }),
    prisma.rFPResponse.findMany({ orderBy: { generated_date: 'desc' }, take: 20 }),
  ])
  return NextResponse.json({ templates, responses })
}

// Save a template
export async function PUT(req: Request) {
  const body = await req.json()
  const template = await prisma.rFPTemplate.create({ data: body })
  return NextResponse.json(template, { status: 201 })
}

// Generate an RFP response
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rfpText, companyName, propertyType, targetSF, targetCity, dealId, companyId, filingIntel } = await req.json()

  // Load example responses to learn from
  const examples = await prisma.rFPTemplate.findMany({ where: { is_example: true }, take: 3 })
  const exampleTexts = examples.map((e) => e.content)

  const content = await generateRFPResponse({
    rfpText,
    companyName,
    propertyType,
    targetSF,
    targetCity,
    exampleResponses: exampleTexts,
    filingIntel,
  })

  const response = await prisma.rFPResponse.create({
    data: {
      company_id: companyId || null,
      deal_id: dealId || null,
      title: `RFP Response — ${companyName}`,
      content,
    },
  })

  return NextResponse.json(response, { status: 201 })
}
