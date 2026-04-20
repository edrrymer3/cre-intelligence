import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateDeepResearch } from '@/lib/claude'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { company_id, all_hot } = await req.json()

  if (all_hot) {
    // Run for all hot prospects (score >= 70 or opportunity_score >= 4)
    const companies = await prisma.company.findMany({
      where: {
        OR: [
          { priority_score: { score: { gte: 70 } } },
          { properties: { some: { opportunity_score: { gte: 4 } } } },
        ],
      },
      select: { id: true, name: true, ticker: true },
      take: 10,
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        for (const co of companies) {
          controller.enqueue(encoder.encode(`\nResearching ${co.name}...\n`))
          try {
            const { report, rating } = await generateDeepResearch(co.name, co.ticker)
            await prisma.researchReport.create({
              data: { company_id: co.id, report_text: report, opportunity_rating: rating },
            })
            controller.enqueue(encoder.encode(`✓ ${co.name}: ${rating}\n`))
          } catch (err) {
            controller.enqueue(encoder.encode(`✗ ${co.name}: ${err}\n`))
          }
          await new Promise((r) => setTimeout(r, 1000))
        }
        controller.enqueue(encoder.encode('\n[Done]'))
        controller.close()
      },
    })
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
  }

  const company = await prisma.company.findUnique({ where: { id: company_id } })
  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { report, rating } = await generateDeepResearch(company.name, company.ticker)

  const saved = await prisma.researchReport.create({
    data: { company_id: company.id, report_text: report, opportunity_rating: rating },
  })

  return NextResponse.json(saved)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('company_id')
  if (!companyId) return NextResponse.json([])

  const reports = await prisma.researchReport.findMany({
    where: { company_id: parseInt(companyId) },
    orderBy: { generated_date: 'desc' },
    take: 5,
  })
  return NextResponse.json(reports)
}
