import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params
  const news = await prisma.companyNews.findMany({
    where: { company_id: parseInt(companyId) },
    orderBy: [{ relevance_score: 'desc' }, { added_date: 'desc' }],
    take: 20,
  })
  return NextResponse.json(news)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { id } = await req.json()
  const item = await prisma.companyNews.update({ where: { id }, data: { reviewed: true } })
  return NextResponse.json(item)
}
