/**
 * lib/email.ts — Resend email delivery
 * Requires: RESEND_API_KEY env var
 */

export interface EmailPayload {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: payload.from || 'CRE Intelligence <noreply@cre-intelligence.app>',
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return { success: false, error: (err as { message?: string }).message || `HTTP ${res.status}` }
  }

  return { success: true }
}

export function buildDigestHtml(data: {
  alerts: { company: { name: string }; alert_type: string; summary: string; filing_date: string; filing_url?: string | null }[]
  topOpportunities: { company: { name: string; ticker: string | null } | null; property_type: string; city: string | null; lease_expiration_year: number | null; opportunity_score: number | null }[]
  urgentLeases: { client: { name: string }; property_name: string | null; city: string | null; lease_expiration_date: string | null }[]
  weekOf: string
}): string {
  const { alerts, topOpportunities, urgentLeases, weekOf } = data

  const alertRows = alerts.map((a) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">${a.company.name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;">
        <span style="background:#fff3cd;color:#856404;padding:2px 8px;border-radius:12px;font-size:12px;">${a.alert_type}</span>
      </td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:13px;color:#555;">${a.summary.slice(0, 120)}${a.summary.length > 120 ? '…' : ''}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;color:#999;">${new Date(a.filing_date).toLocaleDateString()}</td>
    </tr>`).join('')

  const oppRows = topOpportunities.slice(0, 8).map((p) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">${p.company?.name || '—'}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;">${p.property_type}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;">${p.city || '—'}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;">${p.lease_expiration_year || '—'}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-weight:700;color:#1d4ed8;">${p.opportunity_score}/5</td>
    </tr>`).join('')

  const leaseRows = urgentLeases.map((l) => {
    const months = l.lease_expiration_date
      ? Math.round((new Date(l.lease_expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
      : null
    return `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">${l.client.name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;">${l.property_name || l.city || '—'}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-weight:700;color:${months !== null && months < 6 ? '#dc2626' : '#ea580c'};">${months !== null ? `${months} months` : '—'}</td>
    </tr>`
  }).join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:700px;margin:0 auto;color:#1a1a1a;">
  <div style="background:#1a1a2e;padding:24px;border-radius:12px 12px 0 0;">
    <h1 style="color:white;margin:0;font-size:22px;">CRE Intelligence</h1>
    <p style="color:#94a3b8;margin:4px 0 0;">Weekly Briefing — ${weekOf}</p>
  </div>

  <div style="padding:24px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">

    ${urgentLeases.length > 0 ? `
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin-bottom:20px;">
      <h2 style="margin:0 0 12px;font-size:15px;color:#c2410c;">⚠️ Portfolio Leases Expiring Soon</h2>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#fff;">
          <th style="text-align:left;padding:6px 8px;font-size:12px;color:#6b7280;">Client</th>
          <th style="text-align:left;padding:6px 8px;font-size:12px;color:#6b7280;">Property</th>
          <th style="text-align:left;padding:6px 8px;font-size:12px;color:#6b7280;">Time Left</th>
        </tr></thead>
        <tbody>${leaseRows}</tbody>
      </table>
    </div>` : ''}

    ${topOpportunities.length > 0 ? `
    <div style="margin-bottom:20px;">
      <h2 style="margin:0 0 12px;font-size:15px;color:#1e40af;">🎯 Top Opportunities</h2>
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
        <thead><tr style="background:#f1f5f9;">
          <th style="text-align:left;padding:8px;font-size:12px;color:#6b7280;">Company</th>
          <th style="text-align:left;padding:8px;font-size:12px;color:#6b7280;">Type</th>
          <th style="text-align:left;padding:8px;font-size:12px;color:#6b7280;">City</th>
          <th style="text-align:left;padding:8px;font-size:12px;color:#6b7280;">Exp Year</th>
          <th style="text-align:left;padding:8px;font-size:12px;color:#6b7280;">Score</th>
        </tr></thead>
        <tbody>${oppRows}</tbody>
      </table>
    </div>` : ''}

    ${alerts.length > 0 ? `
    <div style="margin-bottom:20px;">
      <h2 style="margin:0 0 12px;font-size:15px;color:#374151;">🔔 New 8-K Alerts This Week (${alerts.length})</h2>
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
        <thead><tr style="background:#f1f5f9;">
          <th style="text-align:left;padding:8px;font-size:12px;color:#6b7280;">Company</th>
          <th style="text-align:left;padding:8px;font-size:12px;color:#6b7280;">Type</th>
          <th style="text-align:left;padding:8px;font-size:12px;color:#6b7280;">Summary</th>
          <th style="text-align:left;padding:8px;font-size:12px;color:#6b7280;">Date</th>
        </tr></thead>
        <tbody>${alertRows}</tbody>
      </table>
    </div>` : '<p style="color:#6b7280;">No new alerts this week.</p>'}

    <p style="font-size:12px;color:#9ca3af;margin-top:24px;text-align:center;">
      CRE Intelligence · Apex Tenant Advisors · <a href="#" style="color:#3b82f6;">View Dashboard</a>
    </p>
  </div>
</body>
</html>`
}
