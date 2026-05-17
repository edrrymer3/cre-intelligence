import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const { name, email, password, brokerage } = await req.json()

  if (!name || !email || !password || !brokerage) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 })
  }

  // Check email not already taken
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })

  // Create org slug from brokerage name
  const slug = brokerage.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) + '-' + Date.now().toString(36)

  // Create org + admin user in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: brokerage, slug, plan: 'free' },
    })
    const hash = await bcrypt.hash(password, 12)
    const user = await tx.user.create({
      data: {
        email,
        name,
        password_hash: hash,
        role: 'admin',
        org_id: org.id,
      },
    })
    return { org, user }
  })

  return NextResponse.json({
    ok: true,
    org: { id: result.org.id, name: result.org.name },
    user: { id: result.user.id, email: result.user.email },
  }, { status: 201 })
}
