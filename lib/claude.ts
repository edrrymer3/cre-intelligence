import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ExtractedProperty {
  tenant_name?: string
  property_type: string
  city?: string
  state?: string
  sqft?: number
  lease_expiration_year?: number
  lease_type?: string
  percent_of_building?: number
  occupancy_trend?: string
  real_estate_strategy?: string
  trigger_events?: string[]
  opportunity_score?: number
  recommended_action?: string
}

export async function extractFilingData(
  filingText: string,
  companyName: string
): Promise<ExtractedProperty[]> {
  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a commercial real estate analyst. Extract lease and property data from this SEC filing for ${companyName}.

Return a JSON array of properties with these fields:
- tenant_name (string or null)
- property_type: "office" | "industrial" | "retail" | "other"
- city (string or null)
- state (2-letter string or null)
- sqft (number or null)
- lease_expiration_year (number or null)
- lease_type (string or null, e.g. "NNN", "Gross")
- percent_of_building (number or null)
- occupancy_trend: "growing" | "stable" | "shrinking" | null
- real_estate_strategy (string)
- trigger_events (string array, e.g. ["lease expiring 2025", "expansion planned"])
- opportunity_score (number 1-10, 10 = highest opportunity for tenant rep)
- recommended_action (string)

Return ONLY the JSON array, no other text.

Filing text:
${filingText.slice(0, 50000)}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []
  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    return []
  }
}

export async function summarizeFiling(filingText: string, companyName: string): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `Summarize any real estate related alerts, expansions, contractions, or lease events for ${companyName} from this SEC filing in 2-3 sentences:\n\n${filingText.slice(0, 10000)}`,
      },
    ],
  })
  return message.content[0].type === 'text' ? message.content[0].text : ''
}

export interface OutreachResult {
  subject: string
  body: string
}

export async function generateOutreachEmail(params: {
  contactName: string | null
  companyName: string
  propertyType: string
  city: string | null
  state: string | null
  leaseExpirationYear: number | null
  realEstateStrategy: string | null
  triggerEvents: string[]
}): Promise<OutreachResult> {
  const { contactName, companyName, propertyType, city, state, leaseExpirationYear, realEstateStrategy, triggerEvents } = params

  const bodyMsg = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are an expert commercial real estate tenant representative broker.
Write a personalized cold outreach email to ${contactName || 'the decision maker'} at ${companyName}.
Use the following intelligence gathered from their SEC filings:
- Property type: ${propertyType}
- Location: ${[city, state].filter(Boolean).join(', ') || 'Twin Cities'}
- Lease expiration: ${leaseExpirationYear || 'upcoming'}
- Real estate strategy: ${realEstateStrategy || 'not specified'}
- Recent trigger events: ${triggerEvents.length > 0 ? triggerEvents.join('; ') : 'none noted'}

The email should:
- Be concise — 4 sentences maximum
- Reference the specific filing intelligence naturally without sounding like you read their SEC filing
- Position Eddie Rymer as a tenant representative at JLL who can help them plan ahead
- End with a soft ask for a 15 minute call
- Sound human, not like an AI wrote it
- Never mention SEC filings or EDGAR directly

Return the email body only — no subject line, no commentary.`,
      },
    ],
  })

  const subjectMsg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 80,
    messages: [
      {
        role: 'user',
        content: `Write a concise, personalized email subject line for a cold outreach to ${companyName} about their ${propertyType} lease in ${city || 'the Twin Cities'} expiring ${leaseExpirationYear || 'soon'}. Return subject line text only, no quotes.`,
      },
    ],
  })

  const body = bodyMsg.content[0].type === 'text' ? bodyMsg.content[0].text.trim() : ''
  const subject = subjectMsg.content[0].type === 'text' ? subjectMsg.content[0].text.trim() : `${companyName} — lease planning`

  return { subject, body }
}
