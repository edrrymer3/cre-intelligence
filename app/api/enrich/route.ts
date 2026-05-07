import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  // Try to fetch the page content
  let pageContent = ''
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CRE-Intelligence/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const html = await res.text()
      // Strip HTML tags and get plain text
      pageContent = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 8000)
    }
  } catch {
    // If we can't fetch, Claude will use its training knowledge
    pageContent = `URL provided: ${url}`
  }

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Extract company information from this URL and/or page content.

URL: ${url}
Page content: ${pageContent}

Return valid JSON only:
{
  "name": string or null,
  "industry": string or null,
  "hq_city": string or null,
  "hq_state": string or null (2-letter),
  "employee_count": number or null,
  "notes": string or null (1 sentence about what the company does)
}

For industry, use one of: Technology, Healthcare, Financial Services, Manufacturing, Retail, Professional Services, Energy, Transportation & Logistics, Real Estate, Education

Return null for any fields you cannot confidently determine.`,
    }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return NextResponse.json({})
  try {
    return NextResponse.json(JSON.parse(match[0]))
  } catch {
    return NextResponse.json({})
  }
}
