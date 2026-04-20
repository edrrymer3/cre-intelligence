/**
 * discover-companies.ts
 * Searches EDGAR for MN-headquartered companies and adds them to the Company table.
 * Uses the EDGAR company search API (no API key needed).
 *
 * Run: npx ts-node --skip-project scripts/discover-companies.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const EDGAR_USER_AGENT = 'CRE Intelligence cre@example.com'

// Known MN-headquartered public companies with significant office/industrial footprints
// Seeded manually since EDGAR full-text search is unreliable for geographic filtering
const MN_COMPANIES = [
  { name: 'UnitedHealth Group', ticker: 'UNH', cik: '0000072971', hq_city: 'Minnetonka', hq_state: 'MN' },
  { name: 'Target Corporation', ticker: 'TGT', cik: '0000027419', hq_city: 'Minneapolis', hq_state: 'MN' },
  { name: 'Best Buy', ticker: 'BBY', cik: '0000764478', hq_city: 'Richfield', hq_state: 'MN' },
  { name: 'General Mills', ticker: 'GIS', cik: '0000040704', hq_city: 'Golden Valley', hq_state: 'MN' },
  { name: 'Ameriprise Financial', ticker: 'AMP', cik: '0001267238', hq_city: 'Minneapolis', hq_state: 'MN' },
  { name: 'Xcel Energy', ticker: 'XEL', cik: '0000081100', hq_city: 'Minneapolis', hq_state: 'MN' },
  { name: 'Fastenal', ticker: 'FAST', cik: '0000815556', hq_city: 'Winona', hq_state: 'MN' },
  { name: 'Toro Company', ticker: 'TTC', cik: '0000098362', hq_city: 'Bloomington', hq_state: 'MN' },
  { name: 'Patterson Companies', ticker: 'PDCO', cik: '0001217430', hq_city: 'Saint Paul', hq_state: 'MN' },
  { name: 'Donaldson Company', ticker: 'DCI', cik: '0000029644', hq_city: 'Minneapolis', hq_state: 'MN' },
  { name: 'Graco', ticker: 'GGG', cik: '0000850693', hq_city: 'Minneapolis', hq_state: 'MN' },
  { name: 'Polaris', ticker: 'PII', cik: '0000078814', hq_city: 'Medina', hq_state: 'MN' },
  { name: 'Regis Corporation', ticker: 'RGS', cik: '0000083185', hq_city: 'Minneapolis', hq_state: 'MN' },
  { name: 'Piper Sandler', ticker: 'PIPR', cik: '0000895648', hq_city: 'Minneapolis', hq_state: 'MN' },
  { name: 'Benchmark Electronics', ticker: 'BHE', cik: '0000864519', hq_city: 'Angoon', hq_state: 'MN' },
]

async function fetchEdgarCompany(cik: string) {
  const paddedCik = cik.replace(/^0+/, '').padStart(10, '0')
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`
  const res = await fetch(url, { headers: { 'User-Agent': EDGAR_USER_AGENT } })
  if (!res.ok) return null
  return res.json()
}

async function main() {
  console.log(`Discovering ${MN_COMPANIES.length} MN companies...`)

  for (const co of MN_COMPANIES) {
    try {
      // Verify CIK exists on EDGAR
      const edgar = await fetchEdgarCompany(co.cik)
      const state = edgar?.stateOfIncorporation || null

      const result = await prisma.company.upsert({
        where: { cik: co.cik },
        update: {
          name: co.name,
          ticker: co.ticker,
          hq_city: co.hq_city,
          hq_state: co.hq_state,
          incorporated_state: state,
        },
        create: {
          name: co.name,
          ticker: co.ticker,
          cik: co.cik,
          source: 'EDGAR',
          hq_city: co.hq_city,
          hq_state: co.hq_state,
          incorporated_state: state,
          active: true,
        },
      })

      console.log(`✓ ${result.name} (${result.ticker}) — CIK ${result.cik}`)

      // Rate limit — EDGAR asks for 10 req/s max
      await new Promise((r) => setTimeout(r, 150))
    } catch (err) {
      console.error(`✗ ${co.name}: ${err}`)
    }
  }

  console.log('Done.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
