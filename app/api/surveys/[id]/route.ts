import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const survey = await prisma.buildingSurvey.findUnique({
    where: { id: parseInt(id) },
    include: { history: { orderBy: { year: 'desc' } }, photos: true },
  })
  if (!survey) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(survey)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { history, ...data } = await req.json()
  const survey = await prisma.buildingSurvey.update({
    where: { id: parseInt(id) },
    data,
    include: { history: { orderBy: { year: 'desc' } }, photos: true },
  })
  return NextResponse.json(survey)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.buildingSurveyYear.deleteMany({ where: { survey_id: parseInt(id) } })
  await prisma.buildingSurveyPhoto.deleteMany({ where: { survey_id: parseInt(id) } })
  await prisma.buildingSurvey.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ ok: true })
}

// Add a year of historical data
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  if (body.photo_url) {
    const photo = await prisma.buildingSurveyPhoto.create({
      data: { survey_id: parseInt(id), url: body.photo_url, caption: body.caption || null },
    })
    return NextResponse.json(photo, { status: 201 })
  }

  const year = await prisma.buildingSurveyYear.create({
    data: { ...body, survey_id: parseInt(id) },
  })
  return NextResponse.json(year, { status: 201 })
}
