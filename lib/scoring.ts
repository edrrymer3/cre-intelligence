import { PrismaClient } from '@prisma/client'

const TRIGGER_SCORES: Record<string, number> = {
  'restructuring': 15,
  'restructur': 15,
  'merger': 12,
  'acquisition': 12,
  'm&a': 12,
  'new cfo': 10,
  'new coo': 10,
  'new vp': 10,
  'appointed': 8,
  'hq move': 15,
  'headquarters': 10,
  'relocation': 12,
  'expansion': 10,
  'expand': 10,
  'consolidat': 8,
  'downsiz': 10,
  'layoff': 10,
}

export async function calculatePriorityScore(
  companyId: number,
  prisma: PrismaClient
): Promise<{ score: number; breakdown: string; lease_points: number; trigger_points: number; market_points: number; engagement_points: number }> {

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      properties: { orderBy: { lease_expiration_year: 'asc' }, take: 5 },
      contacts: { select: { id: true } },
      outreach_emails: { select: { id: true } },
      pipeline: { select: { id: true } },
      document_tenants: { select: { id: true } },
    },
  })

  if (!company) return { score: 0, breakdown: 'Company not found', lease_points: 0, trigger_points: 0, market_points: 0, engagement_points: 0 }

  const breakdownParts: string[] = []
  const now = new Date()
  const currentYear = now.getFullYear()

  // 1. Lease expiration urgency (40 pts max)
  let leasePoints = 0
  const soonestLease = company.properties.find((p) => p.lease_expiration_year)
  if (soonestLease?.lease_expiration_year) {
    const yearsOut = soonestLease.lease_expiration_year - currentYear
    if (yearsOut <= 1) { leasePoints = 40; breakdownParts.push(`Lease expiring ≤12mo (+40)`) }
    else if (yearsOut <= 2) { leasePoints = 30; breakdownParts.push(`Lease expiring ≤24mo (+30)`) }
    else if (yearsOut <= 3) { leasePoints = 20; breakdownParts.push(`Lease expiring ≤36mo (+20)`) }
    else if (yearsOut <= 4) { leasePoints = 10; breakdownParts.push(`Lease expiring ≤48mo (+10)`) }
  }

  // 2. Trigger events (30 pts max)
  let triggerPoints = 0
  const allTriggers = company.properties.flatMap((p) => p.trigger_events || [])
  const triggersText = allTriggers.join(' ').toLowerCase()
  for (const [keyword, pts] of Object.entries(TRIGGER_SCORES)) {
    if (triggersText.includes(keyword)) {
      triggerPoints = Math.min(30, triggerPoints + pts)
    }
  }
  if (triggerPoints > 0) breakdownParts.push(`Trigger events (+${triggerPoints})`)

  // 3. Market signals (20 pts max)
  let marketPoints = 0
  const [inMarketIntel, inDocuments] = await Promise.all([
    prisma.marketIntel.findFirst({
      where: { headline: { contains: company.name, mode: 'insensitive' } },
    }),
    company.document_tenants.length > 0 ? Promise.resolve(true) : Promise.resolve(false),
  ])
  if (inMarketIntel) { marketPoints += 10; breakdownParts.push('In market intel (+10)') }
  if (inDocuments) { marketPoints += 10; breakdownParts.push('In uploaded OM/rent roll (+10)') }

  // 4. Engagement signals (10 pts max)
  let engagementPoints = 0
  if (company.contacts.length > 0) { engagementPoints += 3; breakdownParts.push(`Contact found (+3)`) }
  if (company.outreach_emails.length > 0) { engagementPoints += 3; breakdownParts.push(`Outreach generated (+3)`) }
  if (company.pipeline.length > 0) { engagementPoints += 4; breakdownParts.push(`In pipeline (+4)`) }

  const score = Math.min(100, leasePoints + triggerPoints + marketPoints + engagementPoints)
  const breakdown = breakdownParts.length > 0 ? breakdownParts.join(' · ') : 'No signals detected'

  return { score, breakdown, lease_points: leasePoints, trigger_points: triggerPoints, market_points: marketPoints, engagement_points: engagementPoints }
}

export async function recalculateAllScores(prisma: PrismaClient, onlyHighScore = false) {
  const where = onlyHighScore
    ? { properties: { some: { opportunity_score: { gte: 3 } } } }
    : {}

  const companies = await prisma.company.findMany({
    where,
    select: { id: true },
  })

  console.log(`Recalculating scores for ${companies.length} companies...`)
  let updated = 0

  for (const { id } of companies) {
    try {
      const result = await calculatePriorityScore(id, prisma)
      await prisma.priorityScore.upsert({
        where: { company_id: id },
        update: { ...result, calculated_at: new Date() },
        create: { company_id: id, ...result },
      })
      updated++
    } catch {
      // Skip individual failures
    }
  }

  console.log(`Updated ${updated} priority scores.`)
  return updated
}
