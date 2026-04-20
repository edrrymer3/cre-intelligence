/**
 * monitor-news.ts — Step 31
 * Monitors every active company for real estate news using Claude.
 * Run: npx ts-node --skip-project scripts/monitor-news.ts
 * Cron: Mondays and Thursdays at 6am CT
 */
import { PrismaClient } from '@prisma/client'
import Anthropic from '@anthropic-ai/sdk'

const prisma = new PrismaClient()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

function isSimilar(a: string, b: string): boolean {
  const na = normalize(a); const nb = normalize(b)
  if (na === nb) return true
  const wordsA = new Set(na.split(' '))
  const wordsB = new Set(nb.split(' '))
  const shared = [...wordsA].filter((w) => wordsB.has(w) && w.length > 4).length
  return shared >= 3
}

async function searchCompanyNews(companyName: string, ticker: string | null): Promise<{
  headline: string; summary: string; relevance_score: number; source_url: string | null; published_date: string | null
}[]> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Search for recent news (past 7 days) about ${companyName}${ticker ? ` (${ticker})` : ''} related to real estate, office, lease, headquarters, relocation, expansion, or restructuring.

Based on your knowledge, list any relevant recent news items. Focus on signals relevant to a commercial real estate tenant rep broker in Minnesota.

Return valid JSON only — no commentary:
[
  {
    "headline": string,
    "summary": string (2-3 sentences, focus on CRE implications),
    "relevance_score": number 1-5,
    "source_url": null,
    "published_date": "YYYY-MM-DD" or null
  }
]

Only include items with relevance_score 3 or higher.
Return empty array [] if no relevant news found.`,
    }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return []
  try { return JSON.parse(match[0]) } catch { return [] }
}

async function main() {
  const companies = await prisma.company.findMany({
    where: { active: true },
    select: { id: true, name: true, ticker: true },
    take: 30, // Process up to 30 per run to avoid rate limits
  })

  console.log(`Monitoring news for ${companies.length} companies...\n`)
  let totalSaved = 0

  for (const co of companies) {
    console.log(`→ ${co.name}`)
    try {
      const items = await searchCompanyNews(co.name, co.ticker)
      let saved = 0

      for (const item of items) {
        if (item.relevance_score < 3) continue

        // Check for duplicates
        const existing = await prisma.companyNews.findFirst({
          where: { company_id: co.id },
          orderBy: { added_date: 'desc' },
          take: 10,
        } as Parameters<typeof prisma.companyNews.findFirst>[0])

        // Get recent headlines for dedup check
        const recentNews = await prisma.companyNews.findMany({
          where: { company_id: co.id, added_date: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
          select: { headline: true },
        })

        const isDuplicate = recentNews.some((n) => isSimilar(n.headline, item.headline))
        if (isDuplicate) continue

        await prisma.companyNews.create({
          data: {
            company_id: co.id,
            headline: item.headline,
            summary: item.summary,
            relevance_score: item.relevance_score,
            source_url: item.source_url,
            published_date: item.published_date ? new Date(item.published_date) : null,
          },
        })
        saved++
        totalSaved++
        console.log(`  ✓ [${item.relevance_score}/5] ${item.headline.slice(0, 60)}`)
      }

      if (items.length === 0 || saved === 0) console.log('  → No new items')
      await new Promise((r) => setTimeout(r, 800))
    } catch (err) {
      console.error(`  ✗ Error: ${err}`)
    }
  }

  console.log(`\nDone. ${totalSaved} news items saved.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
