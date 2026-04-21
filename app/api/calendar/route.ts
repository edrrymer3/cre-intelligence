import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUrl, exchangeCode } from '@/lib/calendar'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  if (code) {
    // OAuth callback
    const tokens = await exchangeCode(code)
    const settings = await prisma.appSettings.findFirst()
    if (settings) {
      await prisma.appSettings.update({
        where: { id: settings.id },
        data: {
          google_access_token: tokens.access_token,
          google_refresh_token: tokens.refresh_token,
        },
      })
    }
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings?calendar=connected`)
  }

  // Return connection status
  const settings = await prisma.appSettings.findFirst()
  return NextResponse.json({
    connected: !!settings?.google_access_token,
    syncFollowups: settings?.google_sync_followups,
    syncMilestones: settings?.google_sync_milestones,
    syncLeaseAlerts: settings?.google_sync_lease_alerts,
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json()

  if (action === 'auth_url') {
    const url = getAuthUrl()
    return NextResponse.json({ url })
  }

  if (action === 'disconnect') {
    const settings = await prisma.appSettings.findFirst()
    if (settings) {
      await prisma.appSettings.update({
        where: { id: settings.id },
        data: { google_access_token: null, google_refresh_token: null },
      })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
