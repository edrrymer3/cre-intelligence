import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// HubSpot-compatible CSV export of portfolio clients + locations
export async function GET() {
  const clients = await prisma.portfolioClient.findMany({
    include: { locations: true },
    orderBy: { name: 'asc' },
  })

  const rows: string[] = []

  // HubSpot Company import headers
  rows.push([
    'Company Name',
    'Industry',
    'Primary Contact',
    'Contact Email',
    'Contact Phone',
    'Property Name',
    'Address',
    'City',
    'State',
    'Property Type',
    'Square Footage',
    'Annual Rent',
    'Lease Expiration',
    'Lease Type',
    'Landlord',
    'Notes',
  ].map((h) => `"${h}"`).join(','))

  for (const client of clients) {
    if (client.locations.length === 0) {
      rows.push([
        client.name,
        client.industry || '',
        client.primary_contact || '',
        client.contact_email || '',
        client.contact_phone || '',
        '', '', '', '', '', '', '', '', '', '',
        client.notes || '',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    } else {
      for (const loc of client.locations) {
        rows.push([
          client.name,
          client.industry || '',
          client.primary_contact || '',
          client.contact_email || '',
          client.contact_phone || '',
          loc.property_name || '',
          loc.address || '',
          loc.city || '',
          loc.state || '',
          loc.property_type || '',
          loc.sqft ? String(loc.sqft) : '',
          loc.annual_rent ? String(loc.annual_rent) : '',
          loc.lease_expiration_date ? new Date(loc.lease_expiration_date).toLocaleDateString() : '',
          loc.lease_type || '',
          loc.landlord || '',
          loc.notes || '',
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      }
    }
  }

  const csv = rows.join('\n')
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="cre-portfolio-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
