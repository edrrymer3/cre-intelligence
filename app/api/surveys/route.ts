import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrgId } from '@/lib/orgContext'
import { extractBuildingSurvey } from '@/lib/claude'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  const orgId = await getOrgId()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')
  const type = searchParams.get('type')
  const city = searchParams.get('city')

  const surveys = await prisma.buildingSurvey.findMany({
    where: {
      org_id: orgId,
      ...(type ? { property_type: type } : {}),
      ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
      ...(search ? {
        OR: [
          { address: { contains: search, mode: 'insensitive' } },
          { building_name: { contains: search, mode: 'insensitive' } },
          { landlord: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    },
    include: {
      history: { orderBy: { year: 'desc' } },
      photos: true,
    },
    orderBy: { added_date: 'desc' },
  })

  return NextResponse.json(surveys)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // If parsing from PDF text
  if (body.pdf_text) {
    const extracted = await extractBuildingSurvey(body.pdf_text, body.filename || 'survey.pdf')

    const survey = await prisma.buildingSurvey.create({
      data: {
        address: extracted.address || body.filename || 'Unknown',
        building_name: extracted.building_name,
        city: extracted.city,
        state: extracted.state || 'MN',
        zip: extracted.zip,
        property_type: extracted.property_type,
        building_class: extracted.building_class,
        total_sf: extracted.total_sf,
        floors: extracted.floors,
        year_built: extracted.year_built,
        year_renovated: extracted.year_renovated,
        parking_ratio: extracted.parking_ratio,
        owner: extracted.owner,
        landlord: extracted.landlord,
        property_manager: extracted.property_manager,
        amenities: extracted.amenities,
        notes: extracted.notes,
        source_file: body.filename || null,
        added_by: session.user?.name || session.user?.email || 'Unknown',
        history: {
          create: (extracted.history || []).map((h) => ({
            year: h.year,
            asking_rate_psf: h.asking_rate_psf,
            effective_rate_psf: h.effective_rate_psf,
            cam_psf: h.cam_psf,
            tax_psf: h.tax_psf,
            insurance_psf: h.insurance_psf,
            total_nnn_psf: h.total_nnn_psf,
            occupancy_rate: h.occupancy_rate,
            free_rent_months: h.free_rent_months,
            ti_psf: h.ti_psf,
            notes: h.notes,
          })),
        },
      },
      include: { history: { orderBy: { year: 'desc' } }, photos: true },
    })

    return NextResponse.json(survey, { status: 201 })
  }

  // Manual entry
  const { history, ...surveyData } = body
  const survey = await prisma.buildingSurvey.create({
    data: {
      ...surveyData,
      added_by: session.user?.name || session.user?.email || 'Unknown',
      history: history ? { create: history } : undefined,
    },
    include: { history: { orderBy: { year: 'desc' } }, photos: true },
  })

  return NextResponse.json(survey, { status: 201 })
}
