import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface FoundContact {
  name: string | null
  title: string | null
  linkedin_url: string | null
  email: string | null
  confidence: string
  source: string
}

const TARGET_TITLES = [
  'CFO',
  'VP Real Estate',
  'COO',
  'Director of Facilities',
  'Head of Corporate Real Estate',
  'VP Facilities',
  'Chief Financial Officer',
  'Chief Operating Officer',
  'Director of Real Estate',
  'VP Operations',
]

export async function findContacts(
  companyName: string,
  ticker?: string | null
): Promise<FoundContact[]> {
  const query = `${companyName}${ticker ? ` (${ticker})` : ''} decision maker contacts: ${TARGET_TITLES.slice(0, 5).join(', ')}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `You are a B2B sales researcher. Find the most likely current decision makers at ${companyName}${ticker ? ` (ticker: ${ticker})` : ''} who would be responsible for corporate real estate decisions.

Target titles: ${TARGET_TITLES.join(', ')}

Based on your knowledge of this company, return a JSON array of likely contacts. Include only people who are likely still in these roles as of 2024-2025. If you don't have confident information, return an empty array rather than guessing.

Return valid JSON only — no commentary, no markdown.
[
  {
    "name": string or null,
    "title": string,
    "linkedin_url": string or null,
    "email": string or null,
    "confidence": "high" | "medium" | "low",
    "source": "public record" | "company website" | "LinkedIn" | "estimated"
  }
]

Company: ${companyName}
Focus on the Minnesota/Twin Cities market context.`,
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return []

  try {
    const results = JSON.parse(match[0])
    return Array.isArray(results) ? results.slice(0, 5) : []
  } catch {
    return []
  }
}
