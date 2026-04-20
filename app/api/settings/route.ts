import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  let settings = await prisma.appSettings.findFirst()
  if (!settings) {
    settings = await prisma.appSettings.create({
      data: { weekly_digest_enabled: true, digest_email: 'eddie@rymer.com', commission_rate_psf: 2.00 },
    })
  }
  return NextResponse.json(settings)
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  let settings = await prisma.appSettings.findFirst()

  if (!settings) {
    settings = await prisma.appSettings.create({ data: body })
  } else {
    settings = await prisma.appSettings.update({ where: { id: settings.id }, data: body })
  }

  return NextResponse.json(settings)
}

// Change password endpoint
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { current_password, new_password } = await req.json()
  const user = await prisma.user.findUnique({ where: { email: session.user?.email! } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const valid = await bcrypt.compare(current_password, user.password_hash)
  if (!valid) return NextResponse.json({ error: 'Current password incorrect' }, { status: 400 })

  const hash = await bcrypt.hash(new_password, 12)
  await prisma.user.update({ where: { id: user.id }, data: { password_hash: hash } })

  return NextResponse.json({ ok: true })
}
