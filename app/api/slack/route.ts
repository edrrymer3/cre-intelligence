import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendTestMessage } from '@/lib/slack'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, webhook_url } = await req.json()

  if (action === 'test') {
    const url = webhook_url || (await prisma.appSettings.findFirst())?.slack_webhook_url
    if (!url) return NextResponse.json({ error: 'No webhook URL configured' }, { status: 400 })
    const ok = await sendTestMessage(url)
    return NextResponse.json({ ok })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
