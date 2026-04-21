/**
 * lib/calendar.ts — Google Calendar integration
 * Requires: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 */

const GOOGLE_CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    access_type: 'offline',
    prompt: 'consent',
  })
  return `${GOOGLE_AUTH_URL}?${params}`
}

export async function exchangeCode(code: string): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  })
  return res.json()
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json() as { access_token: string }
  return data.access_token
}

async function calendarRequest(path: string, method: string, accessToken: string, body?: unknown) {
  const res = await fetch(`${GOOGLE_CALENDAR_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) throw new Error(`Calendar API ${method} ${path}: ${res.status}`)
  return res.json()
}

export interface CalendarEvent {
  summary: string
  description?: string
  start: { date?: string; dateTime?: string; timeZone?: string }
  end: { date?: string; dateTime?: string; timeZone?: string }
}

export async function createEvent(event: CalendarEvent, accessToken: string): Promise<string> {
  const result = await calendarRequest('/calendars/primary/events', 'POST', accessToken, event) as { id: string }
  return result.id
}

export async function updateEvent(eventId: string, event: Partial<CalendarEvent>, accessToken: string): Promise<void> {
  await calendarRequest(`/calendars/primary/events/${eventId}`, 'PATCH', accessToken, event)
}

export async function deleteEvent(eventId: string, accessToken: string): Promise<void> {
  const res = await fetch(`${GOOGLE_CALENDAR_BASE}/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok && res.status !== 404 && res.status !== 410) throw new Error(`Calendar DELETE: ${res.status}`)
}

export function makeFollowUpEvent(contactName: string, companyName: string, followUpDate: Date, note?: string): CalendarEvent {
  const dateStr = followUpDate.toISOString().split('T')[0]
  return {
    summary: `Follow up: ${contactName} @ ${companyName}`,
    description: `${note || 'Follow up reminder'}\n\nManage in CRE Intelligence: ${process.env.NEXTAUTH_URL}/dashboard/contacts`,
    start: { date: dateStr },
    end: { date: dateStr },
  }
}

export function makeMilestoneEvent(dealName: string, milestone: string, dueDate: Date): CalendarEvent {
  const dateStr = dueDate.toISOString().split('T')[0]
  return {
    summary: `Deal milestone: ${milestone} — ${dealName}`,
    description: `Manage in CRE Intelligence: ${process.env.NEXTAUTH_URL}/dashboard/deals`,
    start: { date: dateStr },
    end: { date: dateStr },
  }
}

export function makeLeaseAlertEvent(clientName: string, propertyName: string, expirationDate: Date): CalendarEvent {
  const dateStr = expirationDate.toISOString().split('T')[0]
  const alertDate = new Date(expirationDate.getTime() - 90 * 24 * 60 * 60 * 1000)
  const alertDateStr = alertDate.toISOString().split('T')[0]
  return {
    summary: `⚠️ Lease expiring: ${clientName} — ${propertyName}`,
    description: `Lease at ${propertyName} expires ${dateStr}.\n\nManage in CRE Intelligence: ${process.env.NEXTAUTH_URL}/dashboard/clients`,
    start: { date: alertDateStr },
    end: { date: alertDateStr },
  }
}
