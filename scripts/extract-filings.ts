/**
 * extract-filings.ts — Step 6
 * For each active company and REIT:
 *   - Pulls latest 10-Q and 8-Ks from past 90 days via EDGAR API
 *   - Extracts relevant sections
 *   - Runs Claude extraction with spec-defined prompts
 *   - Saves Property and Alert records
 *
 * Run: npx ts-node --skip-project scripts/extract-filings.ts
 */

import { PrismaClient } from '@prisma/client'
import Anthropic from '@anthropic-ai/sdk'

const prisma = new PrismaClient()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const USER_AGENT = 'CRE Intelligence cre@example.com'
const EDGAR_BASE = 'https://data.sec.gov'

// 8-K trigger keywords per spec
const EK_KEYWORDS = ['relocation', 'lease', 'headquarters', 'consolidat', 'real estate', 'facility', 'expansion']

// Sections to extract from 10-Qs
const SECTION_KEYWORDS = ['Properties', 'Leases', 'Operating Lease', 'Commitments and Contingencies']

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function getText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  return res.text()
}

async function getJson(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  return res.json()
}

function extractSections(text: string): string {
  // Strip HTML tags
  const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  const lower = clean.toLowerCase()
  const chunks: string[] = []

  for (const keyword of SECTION_KEYWORDS) {
    const idx = lower.indexOf(keyword.toLowerCase())
    if (idx !== -1) {
      chunks.push(clean.slice(Math.max(0, idx - 200), idx + 8000))
    }
  }

  return chunks.join('\n\n---\n\n').slice(0, 60000)
}

function filter8KText(text: string): string | null {
  const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  const lower = clean.toLowerCase()
  const hasKeyword = EK_KEYWORDS.some((k) => lower.includes(k))
  if (!hasKeyword) return null
  return clean.slice(0, 20000)
}

interface FilingRef {
  form: string
  filingDate: string
  accessionNumber: string
  primaryDocument: string
}

async function getRecentFilings(cik: string): Promise<{ tenQ: FilingRef | null; eightKs: FilingRef[] }> {
  const paddedCik = cik.padStart(10, '0')
  const data = await getJson(`${EDGAR_BASE}/submissions/CIK${paddedCik}.json`)
  const filings = data.filings?.recent

  if (!filings) return { tenQ: null, eightKs: [] }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)

  let tenQ: FilingRef | null = null
  const eightKs: FilingRef[] = []

  for (let i = 0; i < filings.form.length; i++) {
    const form = filings.form[i]
    const date = new Date(filings.filingDate[i])
    const ref: FilingRef = {
      form,
      filingDate: filings.filingDate[i],
      accessionNumber: filings.accessionNumber[i],
      primaryDocument: filings.primaryDocument[i],
    }

    if (form === '10-Q' && !tenQ) {
      tenQ = ref
    }
    if (form === '8-K' && date >= cutoff) {
      eightKs.push(ref)
    }
    if (tenQ && eightKs.length >= 5) break
  }

  return { tenQ, eightKs }
}

function filingUrl(cik: string, accNo: string, doc: string): string {
  const paddedCik = cik.padStart(10, '0')
  const cikNum = parseInt(paddedCik)
  const accNoClean = accNo.replace(/-/g, '')
  return `${EDGAR_BASE}/Archives/edgar/data/${cikNum}/${accNoClean}/${doc}`
}

// ─── Claude prompts per spec ─────────────────────────────────────────────────

async function extractTenantCompanyData(text: string, companyName: string) {
  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a commercial real estate analyst. Extract all real estate intelligence from this SEC filing excerpt for ${companyName}.
Return valid JSON only — no commentary, no markdown.
{
  "locations": [
    {
      "city": string,
      "state": string,
      "sqft": number or null,
      "property_type": "office" or "industrial" only,
      "lease_expiration_year": number or null,
      "lease_type": string or null,
      "notes": string or null
    }
  ],
  "real_estate_strategy": string,
  "trigger_events": [string],
  "opportunity_score": number 1-5,
  "recommended_action": string
}
Only include office and industrial properties.
Exclude retail, multifamily, residential, self-storage.
Return null for any unknown fields.

Filing excerpt:
${text}`,
      },
    ],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}

async function extractREITData(text: string) {
  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a commercial real estate analyst. Extract MN tenant and property data from this REIT SEC filing.
Return valid JSON only — no commentary, no markdown.
{
  "properties": [
    {
      "property_name": string,
      "city": string,
      "state": string,
      "property_type": "office" or "industrial" only,
      "sqft": number or null,
      "occupancy_rate": number or null,
      "occupancy_trend": "Improving" or "Stable" or "Declining",
      "tenants": [
        {
          "tenant_name": string,
          "sqft": number or null,
          "lease_expiration_year": number or null,
          "percent_of_building": number or null
        }
      ]
    }
  ]
}
Only include office and industrial properties in Minnesota.
Return null for unknown fields.

Filing excerpt:
${text}`,
      },
    ],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}

// ─── Process companies ────────────────────────────────────────────────────────

async function processCompanies() {
  const companies = await prisma.company.findMany({ where: { active: true } })
  console.log(`\nProcessing ${companies.length} companies...`)

  for (const company of companies) {
    console.log(`\n→ ${company.name} (CIK: ${company.cik})`)
    try {
      const { tenQ, eightKs } = await getRecentFilings(company.cik)
      await sleep(200)

      // Process 10-Q
      if (tenQ) {
        const url = filingUrl(company.cik, tenQ.accessionNumber, tenQ.primaryDocument)
        try {
          const text = await getText(url)
          const excerpt = extractSections(text)
          const result = await extractTenantCompanyData(excerpt, company.name)

          if (result?.locations?.length) {
            for (const loc of result.locations) {
              await prisma.property.create({
                data: {
                  company_id: company.id,
                  tenant_name: company.name,
                  property_type: loc.property_type || 'office',
                  city: loc.city || null,
                  state: loc.state || null,
                  sqft: loc.sqft || null,
                  lease_expiration_year: loc.lease_expiration_year || null,
                  lease_type: loc.lease_type || null,
                  notes: loc.notes || null,
                  real_estate_strategy: result.real_estate_strategy || null,
                  trigger_events: result.trigger_events || [],
                  opportunity_score: result.opportunity_score || null,
                  recommended_action: result.recommended_action || null,
                  filing_date: new Date(tenQ.filingDate),
                  filing_url: url,
                },
              })
            }
            console.log(`  ✓ 10-Q: ${result.locations.length} locations`)
          }

          // Save filing record
          await prisma.filing.upsert({
            where: { id: -1 }, // force create
            update: {},
            create: {
              company_id: company.id,
              filing_type: '10-Q',
              filing_date: new Date(tenQ.filingDate),
              raw_text_url: url,
              processed: true,
              processed_date: new Date(),
            },
          }).catch(() => prisma.filing.create({
            data: {
              company_id: company.id,
              filing_type: '10-Q',
              filing_date: new Date(tenQ.filingDate),
              raw_text_url: url,
              processed: true,
              processed_date: new Date(),
            },
          }))
        } catch (err) {
          console.error(`  ✗ 10-Q error: ${err}`)
        }
      }

      // Process 8-Ks
      for (const ek of eightKs) {
        const url = filingUrl(company.cik, ek.accessionNumber, ek.primaryDocument)
        try {
          const text = await getText(url)
          const filtered = filter8KText(text)
          if (!filtered) continue

          const summary = await extractTenantCompanyData(filtered, company.name)
          if (summary?.trigger_events?.length) {
            await prisma.alert.create({
              data: {
                company_id: company.id,
                alert_type: '8-K',
                summary: summary.trigger_events.join('; '),
                filing_date: new Date(ek.filingDate),
                filing_url: url,
              },
            })
            console.log(`  ✓ 8-K alert: ${ek.filingDate}`)
          }
          await sleep(500)
        } catch (err) {
          console.error(`  ✗ 8-K error: ${err}`)
        }
      }
    } catch (err) {
      console.error(`  ✗ ${company.name}: ${err}`)
    }
    await sleep(500)
  }
}

// ─── Process REITs ────────────────────────────────────────────────────────────

async function processREITs() {
  const reits = await prisma.rEIT.findMany({ where: { active: true } })
  console.log(`\nProcessing ${reits.length} REITs...`)

  for (const reit of reits) {
    console.log(`\n→ ${reit.name}`)
    try {
      const { tenQ } = await getRecentFilings(reit.cik)
      await sleep(200)

      if (!tenQ) continue

      const url = filingUrl(reit.cik, tenQ.accessionNumber, tenQ.primaryDocument)
      const text = await getText(url)
      const excerpt = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 60000)

      const result = await extractREITData(excerpt)
      if (!result?.properties?.length) continue

      for (const prop of result.properties) {
        if (prop.state !== 'MN' && prop.state !== 'Minnesota') continue

        // Save main property
        const savedProp = await prisma.property.create({
          data: {
            reit_id: reit.id,
            property_type: prop.property_type || 'office',
            city: prop.city || null,
            state: 'MN',
            sqft: prop.sqft || null,
            notes: prop.property_name || null,
            occupancy_trend: prop.occupancy_trend || null,
            filing_date: new Date(tenQ.filingDate),
            filing_url: url,
            trigger_events: [],
          },
        })

        // Save individual tenant rows
        for (const tenant of prop.tenants || []) {
          await prisma.property.create({
            data: {
              reit_id: reit.id,
              tenant_name: tenant.tenant_name,
              property_type: prop.property_type || 'office',
              city: prop.city || null,
              state: 'MN',
              sqft: tenant.sqft || null,
              lease_expiration_year: tenant.lease_expiration_year || null,
              percent_of_building: tenant.percent_of_building || null,
              occupancy_trend: prop.occupancy_trend || null,
              filing_date: new Date(tenQ.filingDate),
              filing_url: url,
              trigger_events: [],
            },
          })
        }

        console.log(`  ✓ ${prop.property_name || prop.city}: ${(prop.tenants || []).length} tenants`)
      }

      await prisma.filing.create({
        data: {
          reit_id: reit.id,
          filing_type: '10-Q',
          filing_date: new Date(tenQ.filingDate),
          raw_text_url: url,
          processed: true,
          processed_date: new Date(),
        },
      })
    } catch (err) {
      console.error(`  ✗ ${reit.name}: ${err}`)
    }
    await sleep(500)
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== CRE Intelligence — Filing Extraction ===')
  await processCompanies()
  await processREITs()
  console.log('\n=== Done ===')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
