import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const USER_AGENT = 'CRE Intelligence cre@example.com'
const EDGAR_BASE = 'https://data.sec.gov'

const SEED_LIST = [
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
  { ticker: 'RGS', cik: '0000083185' },
  { ticker: 'WGO', cik: '0000107687', include_override: true, override_reason: 'Major manufacturing and operational presence in MN despite Iowa HQ' },
  { ticker: 'DLX', cik: '0000028823' },
  { ticker: 'GGG', cik: '0000850693' },
  { ticker: 'ESNT', cik: '0001559865' },
]

export const maxDuration = 300 // 5 min Vercel timeout

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return new Response('Forbidden', { status: 403 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg: string) => controller.enqueue(encoder.encode(msg + '\n'))

      send('=== Company Discovery Starting ===')
      send(`Processing ${SEED_LIST.length} seed companies...`)

      let saved = 0
      let errors = 0

      for (const seed of SEED_LIST) {
        try {
          const paddedCik = seed.cik.padStart(10, '0')
          const res = await fetch(`${EDGAR_BASE}/submissions/CIK${paddedCik}.json`, {
            headers: { 'User-Agent': USER_AGENT },
          })

          if (!res.ok) {
            send(`  ✗ ${seed.ticker}: HTTP ${res.status}`)
            errors++
            continue
          }

          const data = await res.json()
          const businessAddress = data.addresses?.business
          const tickers = data.tickers || []

          await prisma.company.upsert({
            where: { cik: paddedCik },
            update: {
              name: data.name,
              ticker: seed.ticker || tickers[0] || null,
              hq_state: businessAddress?.stateOrCountry || null,
              hq_city: businessAddress?.city || null,
              incorporated_state: data.stateOfIncorporation || null,
              include_override: (seed as { include_override?: boolean }).include_override || false,
              override_reason: (seed as { override_reason?: string }).override_reason || null,
            },
            create: {
              name: data.name,
              ticker: seed.ticker || tickers[0] || null,
              cik: paddedCik,
              source: 'seed-list',
              hq_state: businessAddress?.stateOrCountry || null,
              hq_city: businessAddress?.city || null,
              incorporated_state: data.stateOfIncorporation || null,
              include_override: (seed as { include_override?: boolean }).include_override || false,
              override_reason: (seed as { override_reason?: string }).override_reason || null,
              active: true,
            },
          })

          send(`  ✓ ${data.name} (${seed.ticker})`)
          saved++
          await new Promise((r) => setTimeout(r, 150))
        } catch (err) {
          send(`  ✗ ${seed.ticker}: ${err}`)
          errors++
        }
      }

      send(`\n=== Done: ${saved} saved, ${errors} errors ===`)
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
