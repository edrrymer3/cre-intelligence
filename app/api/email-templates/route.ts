import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Built-in template library
const BUILT_IN_TEMPLATES = [
  {
    id: 'cold-office',
    name: 'Cold Outreach — Office Tenant',
    category: 'Cold Outreach',
    subject: 'Helping {{company}} optimize your office footprint',
    body: `Hi {{contact_name}},

I came across {{company}} while researching companies in the {{city}} market and noticed your office lease {{trigger}}.

I'm a tenant rep broker specializing in the Twin Cities market. Unlike landlord brokers, I work exclusively for tenants — meaning my job is to get you the best possible deal, not fill a building.

A few things I can help with:
• Market rate analysis — are you paying above or below market?
• Early renewal strategy — landlords are often willing to offer significant concessions 12–18 months before expiration
• Relocation options — if growth or contraction is on the horizon

I've helped companies similar to {{company}} save an average of 15–20% on their occupancy costs.

Would you have 20 minutes this week for a quick call?

Best,
{{broker_name}}
Apex Tenant Advisors`,
    variables: ['company', 'contact_name', 'city', 'trigger', 'broker_name'],
  },
  {
    id: 'cold-industrial',
    name: 'Cold Outreach — Industrial Tenant',
    category: 'Cold Outreach',
    subject: '{{company}} — industrial space opportunities in {{city}}',
    body: `Hi {{contact_name}},

I noticed {{company}} has industrial operations in the {{city}} area with a lease {{trigger}}.

I specialize in tenant representation for industrial and warehouse users in the Twin Cities. I work exclusively for tenants — never landlords — so my only goal is to get you the best possible deal.

Current market conditions in Twin Cities industrial are creating real opportunities:
• Vacancy rates have ticked up, giving tenants more leverage
• Several new Class A projects are offering significant concessions to land anchor tenants
• Flex/distribution options are more competitive than they've been in years

Whether you're looking to renew, expand, or relocate, I'd love to put together a quick market overview for you at no cost.

Worth a 15-minute call?

Best,
{{broker_name}}
Apex Tenant Advisors`,
    variables: ['company', 'contact_name', 'city', 'trigger', 'broker_name'],
  },
  {
    id: 'expiring-lease',
    name: 'Expiring Lease — Urgent Follow-up',
    category: 'Lease Expiration',
    subject: 'Your lease at {{property}} — time-sensitive opportunity',
    body: `Hi {{contact_name}},

I wanted to reach out directly regarding {{company}}'s lease at {{property}}, which I understand expires {{expiration}}.

At this stage, you have real leverage — but that window closes fast. Landlords know that tenants who wait until the last 6 months are stuck, and they price accordingly.

Here's what I'd recommend doing now:
1. Get a market comp analysis (I'll do this for free, no obligation)
2. Understand what comparable tenants in your building are paying
3. Decide whether renewal or relocation is the right move

I've negotiated dozens of leases in the Twin Cities and consistently deliver 10–25% savings versus going directly to the landlord.

Can we get on a call this week?

Best,
{{broker_name}}
Apex Tenant Advisors`,
    variables: ['company', 'contact_name', 'property', 'expiration', 'broker_name'],
  },
  {
    id: 'reit-tenant',
    name: 'REIT Tenant Outreach',
    category: 'REIT Intelligence',
    subject: 'Market update for {{company}} tenants at {{reit_name}} properties',
    body: `Hi {{contact_name}},

I work with a number of tenants in {{reit_name}}-owned properties across the Twin Cities and wanted to reach out directly to {{company}}.

I noticed your lease at {{property}} in {{city}} {{trigger}}.

As a tenant rep broker, I work exclusively on your side of the table. I can:
• Pull comps from comparable spaces in {{city}} right now
• Help you understand whether your current rate is above or below market
• Run a relocation analysis if that's a better path

There's no cost to you for this analysis — I'm paid by the new or renewed lease transaction.

Would a quick 20-minute call make sense?

Best,
{{broker_name}}
Apex Tenant Advisors`,
    variables: ['company', 'contact_name', 'reit_name', 'property', 'city', 'trigger', 'broker_name'],
  },
  {
    id: 'follow-up-1',
    name: 'Follow-up #1 — No Response',
    category: 'Follow-up',
    subject: 'Re: {{company}} — quick follow-up',
    body: `Hi {{contact_name}},

I sent a note last week about {{company}}'s real estate situation and wanted to circle back.

I know your inbox is busy. I'll keep this short — I help companies in the Twin Cities get better deals on their office and industrial leases. No cost to you unless a deal gets done.

If timing isn't right, totally understand. Just let me know and I'll check back in a few months.

Best,
{{broker_name}}`,
    variables: ['company', 'contact_name', 'broker_name'],
  },
  {
    id: 'follow-up-2',
    name: 'Follow-up #2 — Value Add',
    category: 'Follow-up',
    subject: '{{city}} market update — relevant to {{company}}',
    body: `Hi {{contact_name}},

Wanted to share a quick market note that's directly relevant to {{company}}'s situation.

{{market_note}}

Given your lease {{trigger}}, this is worth a conversation sooner rather than later.

Happy to put together a no-cost market analysis for your specific situation. 30 minutes — your call or mine.

Best,
{{broker_name}}
Apex Tenant Advisors`,
    variables: ['company', 'contact_name', 'city', 'trigger', 'market_note', 'broker_name'],
  },
]

export async function GET() {
  return NextResponse.json(BUILT_IN_TEMPLATES)
}
