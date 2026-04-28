import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { extractFilingData, summarizeFiling } from '@/lib/claude'

const USER_AGENT = 'CRE Intelligence cre@example.com'
const EDGAR_BASE = 'https://data.sec.gov'

export const maxDuration = 300

async function getLatestFiling(cik: string, formType: string) {
  const paddedCik = cik.padStart(10, '0')
  const res = await fetch(`${EDGAR_BASE}/submissions/CIK${paddedCik}.json`, {
    headers: { 'User-Agent': USER_AGENT },
  })
  if (!res.ok) return null
  const data = await res.json()
  const filings = data.filings?.recent
  if (!filings) return null

  for (let i = 0; i < filings.form.length; i++) {
    if (filings.form[i] === formType) {
      const accNo = filings.accessionNumber[i].replace(/-/g, '')
      const doc = filings.primaryDocument[i]
      const cikNum = parseInt(paddedCik)
      return {
        url: `${EDGAR_BASE}/Archives/edgar/data/${cikNum}/${accNo}/${doc}`,
        date: filings.filingDate[i],
        accNo: filings.accessionNumber[i],
      }
    }
  }
  return null
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return new Response('Forbidden', { status: 403 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg: string) => controller.enqueue(encoder.encode(msg + '\n'))

      send('=== Filing Extraction Starting ===')

      const companies = await prisma.company.findMany({
        where: { active: true },
        select: { id: true, name: true, cik: true, ticker: true },
        take: 10, // Process 10 at a time to stay within Vercel timeout
      })

      send(`Processing ${companies.length} companies (batch of 10)...`)

      for (const co of companies) {
        send(`\n→ ${co.name}`)
        try {
          const filing = await getLatestFiling(co.cik, '10-Q')
          if (!filing) { send('  No 10-Q found'); continue }

          const res = await fetch(filing.url, { headers: { 'User-Agent': USER_AGENT } })
          if (!res.ok) { send(`  HTTP ${res.status}`); continue }
          const text = await res.text()
          const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

          send(`  Extracted ${Math.round(clean.length / 1000)}KB — running Claude...`)
          const properties = await extractFilingData(clean.slice(0, 40000), co.name)
          send(`  Found ${properties.length} properties`)

          for (const prop of properties) {
            if (!['office', 'industrial'].includes(prop.property_type)) continue
            await prisma.property.create({
              data: {
                company_id: co.id,
                tenant_name: co.name,
                property_type: prop.property_type,
                city: prop.city || null,
                state: prop.state || null,
                sqft: prop.sqft || null,
                lease_expiration_year: prop.lease_expiration_year || null,
                lease_type: prop.lease_type || null,
                real_estate_strategy: prop.real_estate_strategy || null,
                trigger_events: prop.trigger_events || [],
                opportunity_score: prop.opportunity_score ? Math.min(5, Math.ceil(prop.opportunity_score / 2)) : null,
                recommended_action: prop.recommended_action || null,
                filing_date: new Date(filing.date),
                filing_url: filing.url,
              },
            })
          }

          if (properties.length > 0) {
            const summary = await summarizeFiling(clean.slice(0, 8000), co.name)
            await prisma.alert.create({
              data: {
                company_id: co.id,
                alert_type: '10-Q',
                summary,
                filing_date: new Date(filing.date),
                filing_url: filing.url,
              },
            })
            send(`  ✓ Saved ${properties.length} properties + alert`)
          }

          await new Promise((r) => setTimeout(r, 500))
        } catch (err) {
          send(`  ✗ Error: ${err}`)
        }
      }

      send('\n=== Done ===')
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
