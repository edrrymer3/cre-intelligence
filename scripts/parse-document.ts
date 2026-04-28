/**
 * parse-document.ts — Step 12
 * Accepts a document ID, retrieves PDF from R2, sends to Claude for extraction,
 * saves DocumentProperty + DocumentTenant records, marks document processed.
 *
 * Run: npx ts-node --skip-project scripts/parse-document.ts <document_id>
 */

import { PrismaClient } from '@prisma/client'
import Anthropic from '@anthropic-ai/sdk'
import { getSignedDownloadUrl } from '../lib/storage'
import * as pdfParse from 'pdf-parse'

const prisma = new PrismaClient()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Claude prompts per spec ──────────────────────────────────────────────────

async function parseOM(pdfText: string) {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a commercial real estate analyst reviewing an Offering Memorandum.
Extract all available real estate data from this document.
Return valid JSON only — no commentary, no markdown.
{
  "property_name": string or null,
  "address": string or null,
  "city": string or null,
  "state": string or null,
  "property_type": "office" or "industrial" or null,
  "total_sqft": number or null,
  "asking_price": number or null,
  "noi": number or null,
  "cap_rate": number or null,
  "occupancy_rate": number or null,
  "year_built": number or null,
  "tenants": [
    {
      "tenant_name": string or null,
      "sqft": number or null,
      "lease_expiration_year": number or null,
      "lease_expiration_month": number or null,
      "rent_psf": number or null,
      "lease_type": string or null,
      "options": string or null,
      "notes": string or null
    }
  ],
  "notes": string or null
}
Return null for any unknown fields.

Document text:
${pdfText.slice(0, 60000)}`,
      },
    ],
  })
  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

async function parseRentRoll(pdfText: string) {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a commercial real estate analyst reviewing a Rent Roll.
Extract all tenant and lease data from this document.
Return valid JSON only — no commentary, no markdown.
{
  "property_name": string or null,
  "address": string or null,
  "city": string or null,
  "state": string or null,
  "property_type": "office" or "industrial" or null,
  "total_sqft": number or null,
  "occupancy_rate": number or null,
  "tenants": [
    {
      "tenant_name": string or null,
      "sqft": number or null,
      "lease_expiration_year": number or null,
      "lease_expiration_month": number or null,
      "rent_psf": number or null,
      "lease_type": string or null,
      "options": string or null,
      "notes": string or null
    }
  ],
  "notes": string or null
}
Return null for any unknown fields.

Document text:
${pdfText.slice(0, 60000)}`,
      },
    ],
  })
  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

// ─── Fuzzy name match for cross-reference ────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

function similarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1.0

  // Token overlap score
  const ta = new Set(na.split(' '))
  const tb = new Set(nb.split(' '))
  const intersection = [...ta].filter((t) => tb.has(t)).length
  const union = new Set([...ta, ...tb]).size
  const jaccard = intersection / union

  // Substring bonus
  const bonus = na.includes(nb) || nb.includes(na) ? 0.2 : 0
  return Math.min(1.0, jaccard + bonus)
}

async function crossReference(tenantName: string | null): Promise<number | null> {
  if (!tenantName) return null
  const companies = await prisma.company.findMany({ select: { id: true, name: true } })
  let bestId: number | null = null
  let bestScore = 0

  for (const co of companies) {
    const score = similarity(tenantName, co.name)
    if (score > bestScore) {
      bestScore = score
      bestId = co.id
    }
  }

  return bestScore >= 0.8 ? bestId : null
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const docId = parseInt(process.argv[2] || '')
  if (!docId) {
    console.error('Usage: npx ts-node --skip-project scripts/parse-document.ts <document_id>')
    process.exit(1)
  }

  const doc = await prisma.document.findUnique({ where: { id: docId } })
  if (!doc) {
    console.error(`Document ${docId} not found`)
    process.exit(1)
  }

  console.log(`Parsing document: ${doc.file_name} (${doc.document_type})`)

  // Download PDF from R2
  console.log('Downloading from storage...')
  const signedUrl = await getSignedDownloadUrl(doc.file_url)
  const pdfRes = await fetch(signedUrl)
  if (!pdfRes.ok) throw new Error(`Failed to download: ${pdfRes.status}`)
  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer())

  // Extract text from PDF
  console.log('Extracting text from PDF...')
  const parsed = await (pdfParse as unknown as (buf: Buffer) => Promise<{ text: string }>)(pdfBuffer)
  const pdfText = parsed.text
  console.log(`  Extracted ${Math.round(pdfText.length / 1000)}KB of text`)

  // Run Claude extraction
  console.log(`Running Claude extraction (${doc.document_type})...`)
  const result = doc.document_type === 'OM'
    ? await parseOM(pdfText)
    : await parseRentRoll(pdfText)

  if (!result) {
    console.error('Claude returned no parseable JSON')
    process.exit(1)
  }

  // Save DocumentProperty
  const docProp = await prisma.documentProperty.create({
    data: {
      document_id: doc.id,
      property_name: result.property_name ?? null,
      address: result.address ?? null,
      city: result.city ?? null,
      state: result.state ?? null,
      property_type: result.property_type ?? null,
      total_sqft: result.total_sqft ?? null,
      asking_price: result.asking_price ?? null,
      noi: result.noi ?? null,
      cap_rate: result.cap_rate ?? null,
      occupancy_rate: result.occupancy_rate ?? null,
      year_built: result.year_built ?? null,
      notes: result.notes ?? null,
    },
  })

  console.log(`  Saved property: ${result.property_name || '(unnamed)'}`)

  // Save DocumentTenants with cross-reference
  const tenants = result.tenants || []
  console.log(`  Processing ${tenants.length} tenants...`)

  for (const tenant of tenants) {
    const matchedCompanyId = await crossReference(tenant.tenant_name)
    if (matchedCompanyId) {
      console.log(`    ✓ Matched "${tenant.tenant_name}" to company ID ${matchedCompanyId}`)
    }

    await prisma.documentTenant.create({
      data: {
        document_property_id: docProp.id,
        matched_company_id: matchedCompanyId,
        tenant_name: tenant.tenant_name ?? null,
        sqft: tenant.sqft ?? null,
        lease_expiration_year: tenant.lease_expiration_year ?? null,
        lease_expiration_month: tenant.lease_expiration_month ?? null,
        rent_psf: tenant.rent_psf ?? null,
        lease_type: tenant.lease_type ?? null,
        options: tenant.options ?? null,
        notes: tenant.notes ?? null,
      },
    })
  }

  // Mark document processed
  await prisma.document.update({
    where: { id: doc.id },
    data: { processed: true, processed_date: new Date() },
  })

  console.log(`\n✅ Done — ${tenants.length} tenants saved, document marked processed.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
