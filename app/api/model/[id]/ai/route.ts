import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'
import { calculateScenario } from '@/lib/leaseModel'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { id } = await params
  const { message, history = [] } = await req.json()

  const model = await prisma.leaseModel.findUnique({
    where: { id: parseInt(id) },
    include: { scenarios: true },
  })
  if (!model) return new Response('Model not found', { status: 404 })

  // Build context from current scenarios
  const scenarioSummaries = model.scenarios.map((s) => {
    const calc = calculateScenario(s as Parameters<typeof calculateScenario>[0], model.discount_rate)
    return `${s.name}: ${s.rsf?.toLocaleString()} SF, $${s.base_rent_psf}/SF base, ${s.term_months}mo term, ${s.free_rent_months}mo free rent, $${s.ti_allowance_psf} TI, NPV $${calc.npv.toLocaleString()}, Net Eff Rent $${calc.net_effective_rent_psf.toFixed(2)}/SF`
  }).join('\n')

  const systemPrompt = `You are a commercial real estate financial analyst assistant helping Eddie Rymer (tenant rep broker at JLL) analyze lease scenarios.

Current model: "${model.title}" (${model.discount_rate}% discount rate)

Current scenarios:
${scenarioSummaries || 'No scenarios yet'}

When the user asks about changes (e.g. "what if we get 3 months more free rent on NLG"), calculate the impact and explain it clearly. 
Be specific with numbers. Use dollar amounts and PSF figures.
If they want to apply a change, tell them exactly which fields to update.
Keep responses concise and focused on the financial impact.`

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            ...history.map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
            { role: 'user', content: message },
          ],
          stream: true,
        })
        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`Error: ${err}`))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  })
}
