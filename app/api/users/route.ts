import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { email, name, role, password } = await req.json()
  if (!email || !name || !password) {
    return NextResponse.json({ error: 'Email, name, and password required' }, { status: 400 })
  }
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 })

  const hash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, name, role: role || 'member', password_hash: hash },
    select: { id: true, name: true, email: true, role: true },
  })
  return NextResponse.json(user, { status: 201 })
}
