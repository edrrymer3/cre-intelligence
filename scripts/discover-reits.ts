/**
 * discover-reits.ts — Step 5
 * Pulls all active REITs from EDGAR (SIC 6798), filters to those with
 * MN/Minneapolis/Twin Cities mentions in recent 10-Q, AND office/industrial
 * property types. Excludes retail, multifamily, residential, self-storage.
 *
 * Run: npx ts-node --skip-project scripts/discover-reits.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const USER_AGENT = 'CRE Intelligence cre@example.com'
const EDGAR_BASE = 'https://data.sec.gov'

const MN_KEYWORDS = ['Minnesota', 'Minneapolis', 'Twin Cities']
const OFFICE_INDUSTRIAL_KEYWORDS = ['office', 'industrial', 'warehouse', 'flex']
const EXCLUDE_KEYWORDS = ['retail', 'multifamily', 'residential', 'self-storage', 'self storage', 'apartment']

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function getJson(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  return res.json()
}

async function getText(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  return res.text()
}

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some((k) => lower.includes(k.toLowerCase()))
}

async function getLatest10Q(cik: string): Promise<string | null> {
  try {
    const paddedCik = cik.padStart(10, '0')
    const data = await getJson(`${EDGAR_BASE}/submissions/CIK${paddedCik}.json`)
    const filings = data.filings?.recent
    if (!filings) return null

    for (let i = 0; i < filings.form.length; i++) {
      if (filings.form[i] === '10-Q') {
        const accNo = filings.accessionNumber[i].replace(/-/g, '')
        const doc = filings.primaryDocument[i]
        const cikNum = parseInt(paddedCik)
        const url = `${EDGAR_BASE}/Archives/edgar/data/${cikNum}/${accNo}/${doc}`
        try {
          const text = await getText(url)
          return text
        } catch {
          return null
        }
      }
    }
  } catch {
    // ignore
  }
  return null
}

async function main() {
  console.log('=== CRE Intelligence — REIT Discovery (SIC 6798) ===')

  // Fetch all REITs from EDGAR by SIC code
  const url = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&SIC=6798&owner=include&count=100&search_text=&output=atom`
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  const text = await res.text()

  // Extract CIKs from feed
  const cikMatches = [...text.matchAll(/CIK=(\d+)/g)]
  const ciks = [...new Set(cikMatches.map((m) => m[1]))]
  console.log(`Found ${ciks.length} REITs in SIC 6798 feed\n`)

  let checked = 0
  let passed = 0
  let saved = 0

  for (const cik of ciks) {
    checked++
    try {
      const paddedCik = cik.padStart(10, '0')
      const data = await getJson(`${EDGAR_BASE}/submissions/CIK${paddedCik}.json`)

      // Check active filings in past 12 months
      const filings = data.filings?.recent
      if (!filings?.filingDate?.length) continue
      const latestDate = new Date(filings.filingDate[0])
      const cutoff = new Date()
      cutoff.setFullYear(cutoff.getFullYear() - 1)
      if (latestDate < cutoff) continue

      // Fetch latest 10-Q text
      console.log(`Checking ${data.name} (${paddedCik})...`)
      await sleep(200)
      const filingText = await getLatest10Q(cik)

      if (!filingText) {
        console.log(`  → No 10-Q found, skipping`)
        continue
      }

      // Must mention MN
      if (!containsAny(filingText, MN_KEYWORDS)) {
        console.log(`  → No MN mention, skipping`)
        continue
      }

      // Must mention office/industrial
      if (!containsAny(filingText, OFFICE_INDUSTRIAL_KEYWORDS)) {
        console.log(`  → No office/industrial mention, skipping`)
        continue
      }

      // Must not be primarily retail/multifamily
      // Check by looking at frequency — if exclude keywords dominate, skip
      const lowerText = filingText.toLowerCase()
      const officeCount = OFFICE_INDUSTRIAL_KEYWORDS.reduce((n, k) => n + (lowerText.split(k).length - 1), 0)
      const excludeCount = EXCLUDE_KEYWORDS.reduce((n, k) => n + (lowerText.split(k).length - 1), 0)
      if (excludeCount > officeCount * 2) {
        console.log(`  → Primarily retail/residential, skipping`)
        continue
      }

      passed++
      const tickers = data.tickers || []
      await prisma.rEIT.upsert({
        where: { cik: paddedCik },
        update: { name: data.name, ticker: tickers[0] || null },
        create: {
          name: data.name,
          ticker: tickers[0] || null,
          cik: paddedCik,
          active: true,
        },
      })
      saved++
      console.log(`  ✓ SAVED: ${data.name} (${tickers[0] || 'no ticker'})`)

      await sleep(300)
    } catch (err) {
      console.error(`  ✗ CIK ${cik}: ${err}`)
    }

    if (checked % 10 === 0) console.log(`\n[Progress: ${checked}/${ciks.length} checked, ${passed} passed]\n`)
  }

  console.log(`\n=== Summary ===`)
  console.log(`  REITs checked: ${checked}`)
  console.log(`  Passed MN + office/industrial filter: ${passed}`)
  console.log(`  Saved to database: ${saved}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
