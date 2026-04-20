import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const REITS = [
  { name: 'Prologis', ticker: 'PLD', cik: '0001045609' },
  { name: 'EastGroup Properties', ticker: 'EGP', cik: '0000049600' },
  { name: 'Plymouth Industrial REIT', ticker: 'PLYM', cik: '0001515816' },
  { name: 'Terreno Realty', ticker: 'TRNO', cik: '0001476150' },
  { name: 'Duke Realty', ticker: 'DRE', cik: '0000783280' },
  { name: 'Highwoods Properties', ticker: 'HIW', cik: '0000921082' },
  { name: 'Cousins Properties', ticker: 'CUZ', cik: '0000025232' },
  { name: 'Brandywine Realty Trust', ticker: 'BDN', cik: '0000790816' },
  { name: 'Piedmont Office Realty', ticker: 'PDM', cik: '0001042776' },
  { name: 'Equity Commonwealth', ticker: 'EQC', cik: '0000803649' },
  { name: 'Columbia Property Trust', ticker: 'CIO', cik: '0001286613' },
  { name: 'Postal Realty Trust', ticker: 'PSTL', cik: '0001763459' },
]

async function main() {
  console.log(`Seeding ${REITS.length} REITs...`)
  for (const reit of REITS) {
    const result = await prisma.rEIT.upsert({
      where: { cik: reit.cik },
      update: { name: reit.name, ticker: reit.ticker },
      create: { name: reit.name, ticker: reit.ticker, cik: reit.cik, active: true },
    })
    console.log(`✓ ${result.name} (${result.ticker})`)
  }
  console.log('Done.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
