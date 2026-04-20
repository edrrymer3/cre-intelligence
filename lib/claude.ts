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
