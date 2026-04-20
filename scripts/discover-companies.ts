/**
 * discover-companies.ts — Step 4
 * 3-source company discovery for MN-headquartered companies:
 *   Source 1: EDGAR state=MN filter (ATOM feed)
 *   Source 2: Direct CIK seed list
 *   Source 3: EDGAR full-text search for "headquartered in Minnesota"
 *
 * Run: npx ts-node --skip-project scripts/discover-companies.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const USER_AGENT = 'CRE Intelligence cre@example.com'
const EDGAR_BASE = 'https://data.sec.gov'

// ─── Helpers ────────────────────────────────────────────────────────────────

async function get(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  return res
}

async function getJson(url: string) {
  const res = await get(url)
  return res.json()
}

async function getText(url: string) {
  const res = await get(url)
  return res.text()
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function padCik(cik: string | number) {
  return String(cik).padStart(10, '0')
}

interface CompanyRecord {
  name: string
  ticker: string | null
  cik: string
  hq_state: string | null
  hq_city: string | null
  incorporated_state: string | null
  source: string
  include_override: boolean
  override_reason: string | null
}

// ─── Source 1: EDGAR State=MN filter ────────────────────────────────────────

async function discoverFromEdgarStateFeed(): Promise<CompanyRecord[]> {
  console.log('\n[Source 1] EDGAR State=MN company feed...')
  const results: CompanyRecord[] = []

  try {
    const url =
      'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&State=MN&SIC=&owner=include&count=100&search_text=&output=atom'
    const text = await getText(url)

    // Parse CIKs from ATOM feed
    const cikMatches = text.matchAll(/CIK=(\d+)/g)
    const ciks = new Set<string>()
    for (const m of cikMatches) ciks.add(m[1])

    console.log(`  Found ${ciks.size} CIKs in feed`)

    let i = 0
    for (const cik of ciks) {
      i++
      try {
        const paddedCik = padCik(cik)
        const data = await getJson(`${EDGAR_BASE}/submissions/CIK${paddedCik}.json`)

        // Check for active filings in past 12 months
        const filings = data.filings?.recent
        if (!filings?.filingDate?.length) continue
        const latestDate = new Date(filings.filingDate[0])
        const cutoff = new Date()
        cutoff.setFullYear(cutoff.getFullYear() - 1)
        if (latestDate < cutoff) continue

        // Verify MN principal office
        const stateOfIncorp = data.stateOfIncorporation || null
        const businessAddress = data.addresses?.business
        const bizState = businessAddress?.stateOrCountry || null
        if (bizState !== 'MN') continue

        const tickers = data.tickers || []
        results.push({
          name: data.name,
          ticker: tickers[0] || null,
          cik: paddedCik,
          hq_state: 'MN',
          hq_city: businessAddress?.city || null,
          incorporated_state: stateOfIncorp,
          source: 'EDGAR-MN-Feed',
          include_override: false,
          override_reason: null,
        })

        if (i % 10 === 0) console.log(`  Processed ${i}/${ciks.size}...`)
        await sleep(120)
      } catch {
        // Skip individual failures
      }
    }
  } catch (err) {
    console.error('  Source 1 error:', err)
  }

  console.log(`  Source 1 result: ${results.length} MN companies`)
  return results
}

// ─── Source 2: Direct CIK seed list ─────────────────────────────────────────

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
  {
    ticker: 'WGO',
    cik: '0000107687',
    include_override: true,
    override_reason: 'Major manufacturing and operational presence in MN despite Iowa HQ',
  },
  { ticker: 'DLX', cik: '0000029644' },
  { ticker: 'SRDX', cik: '0000091845' },
  { ticker: 'TCMD', cik: '0001558538' },
]

async function discoverFromSeedList(): Promise<CompanyRecord[]> {
  console.log('\n[Source 2] Direct CIK seed list...')
  const results: CompanyRecord[] = []

  for (const seed of SEED_LIST) {
    try {
      const paddedCik = padCik(seed.cik)
      const data = await getJson(`${EDGAR_BASE}/submissions/CIK${paddedCik}.json`)

      const businessAddress = data.addresses?.business
      const tickers = data.tickers || []

      results.push({
        name: data.name,
        ticker: (seed as { ticker: string }).ticker || tickers[0] || null,
        cik: paddedCik,
        hq_state: businessAddress?.stateOrCountry || null,
        hq_city: businessAddress?.city || null,
        incorporated_state: data.stateOfIncorporation || null,
        source: 'seed-list',
        include_override: (seed as { include_override?: boolean }).include_override || false,
        override_reason: (seed as { override_reason?: string }).override_reason || null,
      })

      console.log(`  ✓ ${data.name} (${seed.ticker})`)
      await sleep(120)
    } catch (err) {
      console.error(`  ✗ ${seed.ticker}: ${err}`)
    }
  }

  console.log(`  Source 2 result: ${results.length} companies`)
  return results
}

// ─── Source 3: EDGAR full-text search ───────────────────────────────────────

async function discoverFromFullTextSearch(): Promise<CompanyRecord[]> {
  console.log('\n[Source 3] EDGAR full-text search...')
  const results: CompanyRecord[] = []
  const queries = [
    '"headquartered in Minnesota"',
    '"headquartered in Minneapolis"',
  ]

  for (const q of queries) {
    try {
      const url = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(q)}&forms=10-K&dateRange=custom&startdt=2024-01-01`
      const data = await getJson(url)
      const hits = data.hits?.hits || []
      console.log(`  "${q}" → ${hits.length} hits`)

      for (const hit of hits.slice(0, 30)) {
        const cik = String(hit._source?.entity_id || '').padStart(10, '0')
        if (!cik || cik === '0000000000') continue

        try {
          const sub = await getJson(`${EDGAR_BASE}/submissions/CIK${cik}.json`)
          const filings = sub.filings?.recent
          if (!filings?.filingDate?.length) continue

          const latestDate = new Date(filings.filingDate[0])
          const cutoff = new Date()
          cutoff.setFullYear(cutoff.getFullYear() - 1)
          if (latestDate < cutoff) continue

          const businessAddress = sub.addresses?.business
          const bizState = businessAddress?.stateOrCountry || null
          // Only MN principal office, or already in results via override
          if (bizState !== 'MN') continue

          const tickers = sub.tickers || []
          results.push({
            name: sub.name,
            ticker: tickers[0] || null,
            cik,
            hq_state: 'MN',
            hq_city: businessAddress?.city || null,
            incorporated_state: sub.stateOfIncorporation || null,
            source: 'EDGAR-fulltext',
            include_override: false,
            override_reason: null,
          })

          await sleep(120)
        } catch {
          // Skip
        }
      }
    } catch (err) {
      console.error(`  Source 3 error for "${q}":`, err)
    }
  }

  console.log(`  Source 3 result: ${results.length} companies`)
  return results
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== CRE Intelligence — Company Discovery ===')

  const [s1, s2, s3] = await Promise.allSettled([
    discoverFromEdgarStateFeed(),
    discoverFromSeedList(),
    discoverFromFullTextSearch(),
  ])

  const allRecords: CompanyRecord[] = [
    ...(s1.status === 'fulfilled' ? s1.value : []),
    ...(s2.status === 'fulfilled' ? s2.value : []),
    ...(s3.status === 'fulfilled' ? s3.value : []),
  ]

  // Deduplicate by CIK — seed-list overrides take priority for override fields
  const byCik = new Map<string, CompanyRecord>()
  for (const r of allRecords) {
    const existing = byCik.get(r.cik)
    if (!existing) {
      byCik.set(r.cik, r)
    } else {
      // Merge: prefer include_override from seed list
      if (r.include_override) {
        byCik.set(r.cik, { ...existing, ...r })
      } else {
        byCik.set(r.cik, { ...r, ...existing })
      }
    }
  }

  console.log(`\n=== Saving ${byCik.size} unique companies to database ===`)

  let saved = 0
  let skipped = 0

  for (const co of byCik.values()) {
    try {
      await prisma.company.upsert({
        where: { cik: co.cik },
        update: {
          name: co.name,
          ticker: co.ticker,
          hq_state: co.hq_state,
          hq_city: co.hq_city,
          incorporated_state: co.incorporated_state,
          include_override: co.include_override,
          override_reason: co.override_reason,
        },
        create: {
          name: co.name,
          ticker: co.ticker,
          cik: co.cik,
          source: co.source,
          hq_state: co.hq_state,
          hq_city: co.hq_city,
          incorporated_state: co.incorporated_state,
          include_override: co.include_override,
          override_reason: co.override_reason,
          active: true,
        },
      })
      saved++
    } catch (err) {
      console.error(`  ✗ ${co.name}: ${err}`)
      skipped++
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`  Total unique CIKs discovered: ${byCik.size}`)
  console.log(`  Saved to DB: ${saved}`)
  console.log(`  Skipped (errors): ${skipped}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
