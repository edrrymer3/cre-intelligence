import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runFullSync } from '@/lib/hubspot'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await prisma.appSettings.findFirst()
  const apiKey = settings?.hubspot_api_key
  if (!apiKey) return NextResponse.json({ error: 'HubSpot API key not configured' }, { status: 400 })

  try {
    const result = await runFullSync(prisma as never, apiKey)
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  const settings = await prisma.appSettings.findFirst()
  return NextResponse.json({
    configured: !!settings?.hubspot_api_key,
    lastSynced: settings?.hubspot_last_synced || null,
    autoSync: settings?.hubspot_auto_sync || false,
  })
}
