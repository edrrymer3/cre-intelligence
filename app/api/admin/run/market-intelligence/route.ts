import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 300

const QUERIES = [
  { query: 'Minneapolis St Paul office market news 2025', category: 'office' },
  { query: 'Minnesota industrial real estate news 2025', category: 'industrial' },
  { query: 'MN corporate relocation announcements 2025', category: 'relocation' },
  { query: 'Minneapolis office lease signings expansions 2025', category: 'office' },
  { query: 'Minnesota corporate restructuring real estate 2025', category: 'restructuring' },
]

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return new Response('Forbidden', { status: 403 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg: string) => controller.enqueue(encoder.encode(msg + '\n'))

      send('=== Market Intelligence Starting ===')
      let total = 0

      for (const { query, category } of QUERIES) {
        send(`\nSearching: ${query}`)
        try {
          const msg = await client.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 1024,
            messages: [{
              role: 'user',
              content: `Generate 3 specific, factual market intelligence items for a CRE tenant rep broker in Minnesota based on this topic: "${query}"

Return valid JSON only:
[{"headline": string, "summary": string, "category": "${category}", "relevance_score": number 1-5, "published_date": "YYYY-MM-DD" or null}]

Only include items scoring 3 or higher. Return [] if nothing relevant.`,
            }],
          })

          const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
          const match = raw.match(/\[[\s\S]*\]/)
          if (!match) continue
          const items = JSON.parse(match[0])

          for (const item of items) {
            if (item.relevance_score < 3) continue
            const existing = await prisma.marketIntel.findFirst({
              where: { headline: { contains: item.headline.slice(0, 40), mode: 'insensitive' } },
            })
            if (existing) continue
            await prisma.marketIntel.create({
              data: {
                headline: item.headline,
                summary: item.summary,
                category: item.category,
                relevance_score: item.relevance_score,
                published_date: item.published_date ? new Date(item.published_date) : null,
              },
            })
            send(`  ✓ [${item.relevance_score}/5] ${item.headline.slice(0, 60)}`)
            total++
          }
          await new Promise((r) => setTimeout(r, 500))
        } catch (err) {
          send(`  ✗ ${err}`)
        }
      }

      send(`\n=== Done: ${total} items saved ===`)
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
