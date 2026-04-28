import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'
import { extractFilingData, summarizeFiling } from '@/lib/claude'

export const maxDuration = 300

const USER_AGENT = 'CRE Intelligence cre@example.com'
const EDGAR_BASE = 'https://data.sec.gov'

const SEED_COMPANIES = [
  { ticker: 'TGT', cik: '0000027419' },
  { ticker: 'UNH', cik: '0000072971' },
  { ticker: 'BBY', cik: '0000764478' },
  { ticker: 'MMM', cik: '0000066740' },
  { ticker: 'AMP', cik: '0001267238' },
  { ticker: 'USB', cik: '0000036104' },
  { ticker: 'XEL', cik: '0000081100' },
  { ticker: 'FAST', cik: '0000815556' },
  { ticker: 'TTC', cik: '0000098362' },
  { ticker: 'PII', cik: '0000078814' },
  { ticker: 'DCI', cik: '0000029644' },
  { ticker: 'PIPR', cik: '0000895648' },
  { ticker: 'GGG', cik: '0000850693' },
  { ticker: 'WGO', cik: '0000107687', override: true, reason: 'Major MN manufacturing presence' },
]

const SEED_REITS = [
  { name: 'Prologis', ticker: 'PLD', cik: '0001045609' },
  { name: 'EastGroup Properties', ticker: 'EGP', cik: '0000049600' },
  { name: 'Terreno Realty', ticker: 'TRNO', cik: '0001476150' },
  { name: 'Highwoods Properties', ticker: 'HIW', cik: '0000921082' },
  { name: 'Cousins Properties', ticker: 'CUZ', cik: '0000025232' },
  { name: 'Piedmont Office Realty', ticker: 'PDM', cik: '0001042776' },
  { name: 'Plymouth Industrial REIT', ticker: 'PLYM', cik: '0001515816' },
  { name: 'Duke Realty', ticker: 'DRE', cik: '0000783280' },
]

const MARKET_QUERIES = [
  { query: 'Minneapolis office market leases 2025', category: 'office' },
  { query: 'Minnesota industrial real estate 2025', category: 'industrial' },
  { query: 'MN corporate relocations expansions 2025', category: 'relocation' },
]

async function runDiscoverCompanies(send: (msg: string) => void) {
  send('=== Company Discovery Starting ===')
  let saved = 0
  for (const seed of SEED_COMPANIES) {
    try {
      const cik = seed.cik.padStart(10, '0')
      const res = await fetch(`${EDGAR_BASE}/submissions/CIK${cik}.json`, {
        headers: { 'User-Agent': USER_AGENT },
      })
      if (!res.ok) continue
      const data = await res.json()
      const biz = data.addresses?.business
      await prisma.company.upsert({
        where: { cik },
        update: { name: data.name, ticker: seed.ticker, hq_state: biz?.stateOrCountry, hq_city: biz?.city },
        create: {
          name: data.name, ticker: seed.ticker, cik,
          source: 'seed-list', hq_state: biz?.stateOrCountry || null, hq_city: biz?.city || null,
          incorporated_state: data.stateOfIncorporation || null,
          include_override: (seed as { override?: boolean }).override || false,
          override_reason: (seed as { reason?: string }).reason || null,
          active: true,
        },
      })
      send(`  ✓ ${data.name} (${seed.ticker})`)
      saved++
      await new Promise((r) => setTimeout(r, 200))
    } catch (err) {
      send(`  ✗ ${seed.ticker}: ${err}`)
    }
  }
  send(`\nDone: ${saved} companies saved`)
}

async function runDiscoverReits(send: (msg: string) => void) {
  send('=== REIT Discovery Starting ===')
  let saved = 0
  for (const reit of SEED_REITS) {
    try {
      const cik = reit.cik.padStart(10, '0')
      await prisma.rEIT.upsert({
        where: { cik },
        update: { name: reit.name, ticker: reit.ticker },
        create: { name: reit.name, ticker: reit.ticker, cik, active: true },
      })
      send(`  ✓ ${reit.name} (${reit.ticker})`)
      saved++
    } catch (err) {
      send(`  ✗ ${reit.name}: ${err}`)
    }
  }
  send(`\nDone: ${saved} REITs saved`)
}

async function runExtractFilings(send: (msg: string) => void) {
  send('=== Filing Extraction Starting ===')
  const companies = await prisma.company.findMany({ where: { active: true }, take: 8 })
  send(`Processing ${companies.length} companies...`)

  for (const co of companies) {
    send(`\n→ ${co.name}`)
    try {
      const cik = co.cik.padStart(10, '0')
      const subRes = await fetch(`${EDGAR_BASE}/submissions/CIK${cik}.json`, {
        headers: { 'User-Agent': USER_AGENT },
      })
      if (!subRes.ok) continue
      const sub = await subRes.json()
      const filings = sub.filings?.recent
      let filingUrl = '', filingDate = ''
      for (let i = 0; i < (filings?.form?.length || 0); i++) {
        if (filings.form[i] === '10-Q') {
          const accNo = filings.accessionNumber[i].replace(/-/g, '')
          filingUrl = `${EDGAR_BASE}/Archives/edgar/data/${parseInt(cik)}/${accNo}/${filings.primaryDocument[i]}`
          filingDate = filings.filingDate[i]
          break
        }
      }
      if (!filingUrl) { send('  No 10-Q found'); continue }

      const textRes = await fetch(filingUrl, { headers: { 'User-Agent': USER_AGENT } })
      if (!textRes.ok) continue
      const raw = await textRes.text()
      const clean = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 35000)

      const props = await extractFilingData(clean, co.name)
      send(`  Found ${props.length} properties`)

      for (const p of props) {
        if (!['office', 'industrial'].includes(p.property_type)) continue
        await prisma.property.create({
          data: {
            company_id: co.id, tenant_name: co.name, property_type: p.property_type,
            city: p.city || null, state: p.state || null, sqft: p.sqft || null,
            lease_expiration_year: p.lease_expiration_year || null,
            real_estate_strategy: p.real_estate_strategy || null,
            trigger_events: p.trigger_events || [],
            opportunity_score: p.opportunity_score ? Math.min(5, Math.ceil((p.opportunity_score as number) / 2)) : null,
            recommended_action: p.recommended_action || null,
            filing_date: new Date(filingDate), filing_url: filingUrl,
          },
        })
      }
      if (props.length > 0) {
        const summary = await summarizeFiling(clean.slice(0, 6000), co.name)
        await prisma.alert.create({
          data: { company_id: co.id, alert_type: '10-Q', summary, filing_date: new Date(filingDate), filing_url: filingUrl },
        })
        send(`  ✓ ${props.length} properties saved`)
      }
      await new Promise((r) => setTimeout(r, 800))
    } catch (err) {
      send(`  ✗ ${err}`)
    }
  }
  send('\nDone')
}

async function runMarketIntelligence(send: (msg: string) => void) {
  send('=== Market Intelligence Starting ===')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let total = 0

  for (const { query, category } of MARKET_QUERIES) {
    send(`\nSearching: ${query}`)
    try {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Generate 3 specific market intelligence items for MN CRE tenant rep brokers about: "${query}". Return JSON only: [{"headline":string,"summary":string,"category":"${category}","relevance_score":number 1-5,"published_date":"YYYY-MM-DD" or null}]. Only score 3+.`,
        }],
      })
      const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
      const match = raw.match(/\[[\s\S]*\]/)
      if (!match) continue
      const items = JSON.parse(match[0])
      for (const item of items) {
        if (item.relevance_score < 3) continue
        const exists = await prisma.marketIntel.findFirst({ where: { headline: { contains: item.headline.slice(0, 40), mode: 'insensitive' } } })
        if (exists) continue
        await prisma.marketIntel.create({
          data: { headline: item.headline, summary: item.summary, category: item.category, relevance_score: item.relevance_score, published_date: item.published_date ? new Date(item.published_date) : null },
        })
        send(`  ✓ [${item.relevance_score}/5] ${item.headline.slice(0, 55)}`)
        total++
      }
      await new Promise((r) => setTimeout(r, 500))
    } catch (err) { send(`  ✗ ${err}`) }
  }
  send(`\nDone: ${total} items saved`)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return new Response('Forbidden', { status: 403 })
  }

  const { script } = await req.json()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg: string) => controller.enqueue(encoder.encode(msg + '\n'))
      try {
        if (script === 'discover-companies') await runDiscoverCompanies(send)
        else if (script === 'discover-reits') await runDiscoverReits(send)
        else if (script === 'extract-filings') await runExtractFilings(send)
        else if (script === 'market-intelligence' || script === 'monitor-news') await runMarketIntelligence(send)
        else send(`Unknown script: ${script}`)
      } catch (err) {
        send(`[Fatal error: ${err}]`)
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' },
  })
}
