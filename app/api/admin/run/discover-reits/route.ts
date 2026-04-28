import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const USER_AGENT = 'CRE Intelligence cre@example.com'
const EDGAR_BASE = 'https://data.sec.gov'

// Known office/industrial REITs with MN presence — hardcoded for reliability
const KNOWN_REITS = [
  { name: 'Prologis', ticker: 'PLD', cik: '0001045609' },
  { name: 'EastGroup Properties', ticker: 'EGP', cik: '0000049600' },
  { name: 'Terreno Realty', ticker: 'TRNO', cik: '0001476150' },
  { name: 'Highwoods Properties', ticker: 'HIW', cik: '0000921082' },
  { name: 'Cousins Properties', ticker: 'CUZ', cik: '0000025232' },
  { name: 'Brandywine Realty Trust', ticker: 'BDN', cik: '0000790816' },
  { name: 'Piedmont Office Realty', ticker: 'PDM', cik: '0001042776' },
  { name: 'Equity Commonwealth', ticker: 'EQC', cik: '0000803649' },
  { name: 'Postal Realty Trust', ticker: 'PSTL', cik: '0001763459' },
  { name: 'Plymouth Industrial REIT', ticker: 'PLYM', cik: '0001515816' },
  { name: 'Duke Realty', ticker: 'DRE', cik: '0000783280' },
  { name: 'NexPoint Real Estate Finance', ticker: 'NREF', cik: '0001690012' },
]

export const maxDuration = 300

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return new Response('Forbidden', { status: 403 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg: string) => controller.enqueue(encoder.encode(msg + '\n'))

      send('=== REIT Discovery Starting ===')
      send(`Seeding ${KNOWN_REITS.length} known office/industrial REITs...`)

      let saved = 0

      for (const reit of KNOWN_REITS) {
        try {
          const paddedCik = reit.cik.padStart(10, '0')
          await prisma.rEIT.upsert({
            where: { cik: paddedCik },
            update: { name: reit.name, ticker: reit.ticker },
            create: { name: reit.name, ticker: reit.ticker, cik: paddedCik, active: true },
          })
          send(`  ✓ ${reit.name} (${reit.ticker})`)
          saved++
          await new Promise((r) => setTimeout(r, 100))
        } catch (err) {
          send(`  ✗ ${reit.name}: ${err}`)
        }
      }

      send(`\n=== Done: ${saved} REITs saved ===`)
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
