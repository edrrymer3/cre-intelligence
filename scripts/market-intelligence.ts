/**
 * market-intelligence.ts — Step 22
 * Uses Claude to search for MN CRE market news and save to MarketIntel table.
 * Run: npx ts-node --skip-project scripts/market-intelligence.ts
 */

import { PrismaClient } from '@prisma/client'
import Anthropic from '@anthropic-ai/sdk'

const prisma = new PrismaClient()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SEARCH_QUERIES = [
  { query: 'Minneapolis St Paul office market news 2025', category: 'office' },
  { query: 'Minnesota industrial real estate news 2025', category: 'industrial' },
  { query: 'MN corporate relocation announcements 2025', category: 'relocation' },
  { query: 'Minneapolis office lease signings expansions 2025', category: 'office' },
  { query: 'Minnesota corporate layoffs restructuring real estate 2025', category: 'restructuring' },
  { query: 'Minnesota commercial real estate investment sales 2025', category: 'investment' },
]

interface IntelItem {
  headline: string
  summary: string
  category: string
  relevance_score: number
  source_url: string | null
  published_date: string | null
}

async function searchAndSummarize(query: string, category: string): Promise<IntelItem[]> {
  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `You are a commercial real estate market analyst focused on Minnesota.

Based on your knowledge of the Minnesota/Twin Cities CRE market through early 2025, generate 3-5 relevant market intelligence items for this search topic: "${query}"

For each item, provide:
- A specific, factual headline about something that happened or is happening
- A 2-3 sentence summary with market implications for a tenant rep broker
- Relevance score 1-5 (5 = extremely relevant to tenant rep prospecting)
- Category: ${category}
- Approximate published date if known

Return valid JSON only — no commentary, no markdown.
[
  {
    "headline": string,
    "summary": string,
    "category": "${category}",
    "relevance_score": number,
    "source_url": null,
    "published_date": "YYYY-MM-DD" or null
  }
]`,
      },
    ],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    return JSON.parse(match[0])
  } catch {
    return []
  }
}

async function main() {
  console.log('=== Market Intelligence Scan ===\n')
  let total = 0

  for (const { query, category } of SEARCH_QUERIES) {
    console.log(`Searching: ${query}`)
    try {
      const items = await searchAndSummarize(query, category)
      for (const item of items) {
        // Deduplicate by headline similarity
        const existing = await prisma.marketIntel.findFirst({
          where: { headline: { contains: item.headline.slice(0, 50), mode: 'insensitive' } },
        })
        if (existing) continue

        await prisma.marketIntel.create({
          data: {
            headline: item.headline,
            summary: item.summary,
            category: item.category,
            relevance_score: item.relevance_score,
            source_url: item.source_url,
            published_date: item.published_date ? new Date(item.published_date) : null,
          },
        })
        total++
        console.log(`  ✓ [${item.relevance_score}/5] ${item.headline.slice(0, 60)}`)
      }
    } catch (err) {
      console.error(`  ✗ Error: ${err}`)
    }
    await new Promise((r) => setTimeout(r, 1000))
  }

  console.log(`\nDone. ${total} items saved.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
