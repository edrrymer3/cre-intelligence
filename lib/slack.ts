/**
 * lib/slack.ts — Slack webhook notifications
 * Requires: SLACK_WEBHOOK_URL env var (or passed directly)
 */

export type SlackUrgency = 'urgent' | 'watch' | 'info' | 'digest'

const URGENCY_EMOJI: Record<SlackUrgency, string> = {
  urgent: '🔴',
  watch: '🟡',
  info: '📋',
  digest: '📊',
}

export interface SlackMessage {
  company?: string
  headline: string
  detail?: string
  link?: string
  urgency?: SlackUrgency
}

export async function sendSlackNotification(msg: SlackMessage, webhookUrl?: string): Promise<boolean> {
  const url = webhookUrl || process.env.SLACK_WEBHOOK_URL
  if (!url) return false

  const emoji = URGENCY_EMOJI[msg.urgency || 'info']
  const appUrl = process.env.NEXTAUTH_URL || 'https://cre-intelligence.onrender.com'

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} ${msg.company ? `*${msg.company}*` : ''} ${msg.headline}`,
      },
    },
    ...(msg.detail ? [{
      type: 'section',
      text: { type: 'mrkdwn', text: msg.detail },
    }] : []),
    ...(msg.link ? [{
      type: 'actions',
      elements: [{
        type: 'button',
        text: { type: 'plain_text', text: 'View in App' },
        url: msg.link,
      }],
    }] : []),
  ]

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks }),
  })

  return res.ok
}

export async function sendSlackDigest(items: SlackMessage[], webhookUrl?: string): Promise<boolean> {
  const url = webhookUrl || process.env.SLACK_WEBHOOK_URL
  if (!url) return false

  const appUrl = process.env.NEXTAUTH_URL || 'https://cre-intelligence.onrender.com'
  const lines = items.map((i) => {
    const emoji = URGENCY_EMOJI[i.urgency || 'info']
    return `${emoji} ${i.company ? `*${i.company}*: ` : ''}${i.headline}`
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '📊 CRE Intelligence Weekly Digest' },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: lines.join('\n') || '_No items this week_' },
        },
        {
          type: 'actions',
          elements: [{
            type: 'button',
            text: { type: 'plain_text', text: 'Open Dashboard' },
            url: appUrl,
          }],
        },
      ],
    }),
  })

  return res.ok
}

export async function sendTestMessage(webhookUrl: string): Promise<boolean> {
  return sendSlackNotification({
    headline: 'CRE Intelligence is connected to Slack ✅',
    detail: 'You will receive alerts for 8-K filings, hot prospects, follow-ups, and weekly digests.',
    urgency: 'info',
    link: process.env.NEXTAUTH_URL,
  }, webhookUrl)
}
