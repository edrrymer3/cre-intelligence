import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface Message {
  role: 'user' | 'assistant'
  content: string
}

async function buildContext(userMessage: string): Promise<string> {
  const msg = userMessage.toLowerCase()
  const contextParts: string[] = []

  // Always pull summary stats
  const [companyCount, propertyCount, alertCount, pipelineCount, contactCount, clientCount] = await Promise.all([
    prisma.company.count({ where: { active: true } }),
    prisma.property.count(),
    prisma.alert.count({ where: { reviewed: false } }),
    prisma.pipeline.count(),
    prisma.contact.count(),
    prisma.client.count(),
  ])

  contextParts.push(`DATABASE SUMMARY: ${companyCount} companies tracked, ${propertyCount} properties, ${alertCount} unreviewed alerts, ${pipelineCount} pipeline deals, ${contactCount} contacts, ${clientCount} clients.`)

  // Prospect / company queries
  if (msg.includes('prospect') || msg.includes('compan') || msg.includes('lease') || msg.includes('opportunit') || msg.includes('score') || msg.includes('who should')) {
    const topProps = await prisma.property.findMany({
      where: { opportunity_score: { gte: 3 }, company_id: { not: null } },
      include: {
        company: { select: { name: true, ticker: true, hq_city: true } },
      },
      orderBy: { opportunity_score: 'desc' },
      take: 15,
    })
    contextParts.push(`TOP PROSPECTS:\n${topProps.map((p) =>
      `- ${p.company?.name} (${p.company?.ticker || 'n/a'}): ${p.property_type} in ${p.city || p.company?.hq_city}, exp ${p.lease_expiration_year || 'unknown'}, score ${p.opportunity_score}/5. Triggers: ${p.trigger_events?.join(', ') || 'none'}`
    ).join('\n')}`)
  }

  // Contacts / CFO / who is
  if (msg.includes('contact') || msg.includes('cfo') || msg.includes('coo') || msg.includes('vp') || msg.includes('who is')) {
    const contacts = await prisma.contact.findMany({
      include: { company: { select: { name: true } } },
      orderBy: { added_date: 'desc' },
      take: 20,
    })
    contextParts.push(`CONTACTS:\n${contacts.map((c) =>
      `- ${c.name || 'Unknown'}, ${c.title || 'Unknown title'} @ ${c.company?.name} | email: ${c.email || 'n/a'} | confidence: ${c.confidence}`
    ).join('\n')}`)
  }

  // Pipeline
  if (msg.includes('pipeline') || msg.includes('deal') || msg.includes('status')) {
    const pipeline = await prisma.pipeline.findMany({
      include: { company: { select: { name: true } } },
      orderBy: { last_updated: 'desc' },
    })
    contextParts.push(`PIPELINE:\n${pipeline.map((p) => `- ${p.company?.name}: ${p.status}${p.notes ? ` (${p.notes})` : ''}`).join('\n')}`)
  }

  // Alerts / this week
  if (msg.includes('alert') || msg.includes('this week') || msg.includes('trigger') || msg.includes('8-k')) {
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const alerts = await prisma.alert.findMany({
      where: { reviewed: false },
      include: { company: { select: { name: true } } },
      orderBy: { filing_date: 'desc' },
      take: 10,
    })
    contextParts.push(`RECENT ALERTS:\n${alerts.map((a) => `- ${a.company?.name}: ${a.alert_type} — ${a.summary.slice(0, 120)}`).join('\n')}`)
  }

  // Client leases
  if (msg.includes('client') || msg.includes('expir')) {
    const clients = await prisma.client.findMany({
      include: { locations: { orderBy: { lease_expiration: 'asc' } } },
      take: 10,
    })
    contextParts.push(`CLIENTS:\n${clients.map((c) =>
      `- ${c.name}: ${c.locations.length} locations, nearest expiry: ${c.locations[0]?.lease_expiration ? new Date(c.locations[0].lease_expiration).toLocaleDateString() : 'none'}`
    ).join('\n')}`)
  }

  // Market intel
  if (msg.includes('market') || msg.includes('news') || msg.includes('intel')) {
    const intel = await prisma.marketIntel.findMany({
      where: { relevance_score: { gte: 4 } },
      orderBy: [{ relevance_score: 'desc' }, { added_date: 'desc' }],
      take: 5,
    })
    contextParts.push(`MARKET INTEL:\n${intel.map((i) => `- [${i.category}/${i.relevance_score}] ${i.headline}: ${i.summary.slice(0, 100)}`).join('\n')}`)
  }

  return contextParts.join('\n\n')
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { message, history = [] } = await req.json() as { message: string; history: Message[] }

  const context = await buildContext(message)

  const systemPrompt = `You are an AI copilot for CRE Intelligence, a commercial real estate prospecting platform used by Eddie Rymer at Apex Tenant Advisors / JLL in the Twin Cities.

You have access to real-time data from the platform. Use the context below to answer questions precisely.

If asked to draft an email or outreach, write it directly.
If asked who to call, rank by lease urgency and opportunity score.
Be concise, actionable, and specific. Use actual company names and data from context.

CURRENT DATA CONTEXT:
${context}`

  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: message },
  ]

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 1024,
          system: systemPrompt,
          messages,
          stream: true,
        })

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`\n[Error: ${err}]`))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
