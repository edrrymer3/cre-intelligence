/**
 * extract-filings.ts
 * Fetches unprocessed Filing records, downloads text from EDGAR,
 * runs Claude extraction, saves Property records, marks filings processed.
 *
 * Run: npx ts-node --skip-project scripts/extract-filings.ts
 */

import { PrismaClient } from '@prisma/client'
import { extractFilingData, summarizeFiling } from '../lib/claude'

const prisma = new PrismaClient()
const BATCH_SIZE = 5
const EDGAR_USER_AGENT = 'CRE Intelligence cre@example.com'

async function fetchFilingText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': EDGAR_USER_AGENT } })
  if (!res.ok) throw new Error(`Failed to fetch filing: ${res.status} ${url}`)
  return res.text()
}

async function main() {
  const filings = await prisma.filing.findMany({
    where: { processed: false, raw_text_url: { not: null } },
    include: {
      company: { select: { id: true, name: true } },
      reit: { select: { id: true, name: true } },
    },
    take: BATCH_SIZE,
    orderBy: { filing_date: 'desc' },
  })

  if (filings.length === 0) {
    console.log('No unprocessed filings found.')
    return
  }

  console.log(`Processing ${filings.length} filings...`)

  for (const filing of filings) {
    const entityName = filing.company?.name || filing.reit?.name || 'Unknown'
    console.log(`\n→ ${entityName} — ${filing.filing_type} (${filing.filing_date.toISOString().split('T')[0]})`)

    try {
      const text = await fetchFilingText(filing.raw_text_url!)
      console.log(`  Downloaded ${Math.round(text.length / 1000)}KB`)

      // Extract properties
      const properties = await extractFilingData(text, entityName)
      console.log(`  Extracted ${properties.length} properties`)

      // Save each property
      for (const prop of properties) {
        await prisma.property.create({
          data: {
            company_id: filing.company_id ?? undefined,
            reit_id: filing.reit_id ?? undefined,
            tenant_name: prop.tenant_name ?? null,
            property_type: prop.property_type || 'other',
            city: prop.city ?? null,
            state: prop.state ?? null,
            sqft: prop.sqft ?? null,
            lease_expiration_year: prop.lease_expiration_year ?? null,
            lease_type: prop.lease_type ?? null,
            percent_of_building: prop.percent_of_building ?? null,
            occupancy_trend: prop.occupancy_trend ?? null,
            real_estate_strategy: prop.real_estate_strategy ?? null,
            trigger_events: prop.trigger_events ?? [],
            opportunity_score: prop.opportunity_score ?? null,
            recommended_action: prop.recommended_action ?? null,
            filing_date: filing.filing_date,
            filing_url: filing.raw_text_url,
          },
        })
      }

      // If company filing, create an alert summary
      if (filing.company_id && properties.length > 0) {
        const summary = await summarizeFiling(text, entityName)
        await prisma.alert.create({
          data: {
            company_id: filing.company_id,
            alert_type: filing.filing_type,
            summary,
            filing_date: filing.filing_date,
            filing_url: filing.raw_text_url,
          },
        })
        console.log(`  Created alert`)
      }

      // Mark processed
      await prisma.filing.update({
        where: { id: filing.id },
        data: { processed: true, processed_date: new Date() },
      })

      console.log(`  ✓ Done`)
    } catch (err) {
      console.error(`  ✗ Error: ${err}`)
    }

    // Brief pause between filings
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log('\nAll done.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
