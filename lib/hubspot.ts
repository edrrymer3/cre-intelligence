/**
 * lib/hubspot.ts — HubSpot CRM sync
 * Requires: HUBSPOT_API_KEY env var
 */

const HS_BASE = 'https://api.hubapi.com'

async function hsRequest(path: string, method = 'GET', body?: unknown, apiKey?: string) {
  const key = apiKey || process.env.HUBSPOT_API_KEY
  if (!key) throw new Error('HUBSPOT_API_KEY not configured')

  const res = await fetch(`${HS_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`HubSpot ${method} ${path}: ${(err as { message?: string }).message || res.status}`)
  }

  return res.json()
}

export interface HubSpotSyncResult {
  companies: { synced: number; errors: number }
  contacts: { synced: number; errors: number }
  deals: { synced: number; errors: number }
}

export async function syncCompanyToHubSpot(company: {
  id: number; name: string; ticker?: string | null; hq_city?: string | null; hq_state?: string | null
  hubspot_company_id?: string | null
}, apiKey?: string): Promise<string> {
  const properties = {
    name: company.name,
    city: company.hq_city || '',
    state: company.hq_state || '',
    description: company.ticker ? `Ticker: ${company.ticker}` : '',
    industry: 'Real Estate',
  }

  if (company.hubspot_company_id) {
    await hsRequest(`/crm/v3/objects/companies/${company.hubspot_company_id}`, 'PATCH', { properties }, apiKey)
    return company.hubspot_company_id
  } else {
    const result = await hsRequest('/crm/v3/objects/companies', 'POST', { properties }, apiKey)
    return result.id
  }
}

export async function syncContactToHubSpot(contact: {
  id: number; name?: string | null; title?: string | null; email?: string | null
  hubspot_contact_id?: string | null; company_name?: string
}, apiKey?: string): Promise<string> {
  const [firstname, ...rest] = (contact.name || '').split(' ')
  const properties = {
    firstname: firstname || '',
    lastname: rest.join(' ') || '',
    jobtitle: contact.title || '',
    email: contact.email || '',
    company: contact.company_name || '',
  }

  if (contact.hubspot_contact_id) {
    await hsRequest(`/crm/v3/objects/contacts/${contact.hubspot_contact_id}`, 'PATCH', { properties }, apiKey)
    return contact.hubspot_contact_id
  } else {
    const result = await hsRequest('/crm/v3/objects/contacts', 'POST', { properties }, apiKey)
    return result.id
  }
}

export async function syncDealToHubSpot(deal: {
  id: number; deal_name: string; status: string; estimated_commission?: number | null
  hubspot_deal_id?: string | null; company_name?: string
}, apiKey?: string): Promise<string> {
  const stageMap: Record<string, string> = {
    'Prospecting': 'appointmentscheduled',
    'RFP': 'qualifiedtobuy',
    'Touring': 'presentationscheduled',
    'Negotiating': 'decisionmakerboughtin',
    'LOI': 'contractsent',
    'Lease Execution': 'closedwon',
    'Closed': 'closedwon',
    'Lost': 'closedlost',
  }

  const properties = {
    dealname: `${deal.company_name || ''} — ${deal.deal_name}`,
    amount: deal.estimated_commission ? String(deal.estimated_commission) : '0',
    dealstage: stageMap[deal.status] || 'appointmentscheduled',
    pipeline: 'default',
  }

  if (deal.hubspot_deal_id) {
    await hsRequest(`/crm/v3/objects/deals/${deal.hubspot_deal_id}`, 'PATCH', { properties }, apiKey)
    return deal.hubspot_deal_id
  } else {
    const result = await hsRequest('/crm/v3/objects/deals', 'POST', { properties }, apiKey)
    return result.id
  }
}

export async function runFullSync(prisma: {
  company: { findMany: Function; update: Function }
  contact: { findMany: Function; update: Function }
  deal: { findMany: Function; update: Function }
  appSettings: { findFirst: Function; update: Function }
}, apiKey: string): Promise<HubSpotSyncResult> {
  const result: HubSpotSyncResult = {
    companies: { synced: 0, errors: 0 },
    contacts: { synced: 0, errors: 0 },
    deals: { synced: 0, errors: 0 },
  }

  // Sync top companies
  const companies = await prisma.company.findMany({
    where: { active: true, properties: { some: { opportunity_score: { gte: 4 } } } } as never,
    take: 50,
  }) as { id: number; name: string; ticker?: string | null; hq_city?: string | null; hq_state?: string | null; hubspot_company_id?: string | null }[]

  for (const co of companies) {
    try {
      const hsId = await syncCompanyToHubSpot(co, apiKey)
      if (hsId !== co.hubspot_company_id) {
        await prisma.company.update({ where: { id: co.id } as never, data: { hubspot_company_id: hsId } as never })
      }
      result.companies.synced++
    } catch { result.companies.errors++ }
  }

  // Sync contacts
  const contacts = await prisma.contact.findMany({
    include: { company: { select: { name: true } } } as never,
    take: 100,
  }) as { id: number; name?: string | null; title?: string | null; email?: string | null; hubspot_contact_id?: string | null; company?: { name: string } }[]

  for (const c of contacts) {
    try {
      const hsId = await syncContactToHubSpot({ ...c, company_name: c.company?.name }, apiKey)
      if (hsId !== c.hubspot_contact_id) {
        await prisma.contact.update({ where: { id: c.id } as never, data: { hubspot_contact_id: hsId } as never })
      }
      result.contacts.synced++
    } catch { result.contacts.errors++ }
  }

  // Sync active deals
  const deals = await prisma.deal.findMany({
    where: { status: { notIn: ['Closed', 'Lost'] } } as never,
    include: { company: { select: { name: true } } } as never,
  }) as { id: number; deal_name: string; status: string; estimated_commission?: number | null; hubspot_deal_id?: string | null; company?: { name: string } }[]

  for (const d of deals) {
    try {
      const hsId = await syncDealToHubSpot({ ...d, company_name: d.company?.name }, apiKey)
      if (hsId !== d.hubspot_deal_id) {
        await prisma.deal.update({ where: { id: d.id } as never, data: { hubspot_deal_id: hsId } as never })
      }
      result.deals.synced++
    } catch { result.deals.errors++ }
  }

  // Update last synced
  const settings = await prisma.appSettings.findFirst()
  if (settings) {
    await prisma.appSettings.update({ where: { id: (settings as { id: number }).id } as never, data: { hubspot_last_synced: new Date() } as never })
  }

  return result
}
