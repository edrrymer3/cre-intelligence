'use client'

import { useEffect, useState } from 'react'

interface AppSettings {
  id: number
  weekly_digest_enabled: boolean
  digest_email: string
  commission_rate_psf: number
  hubspot_api_key?: string | null
  hubspot_auto_sync?: boolean
  hubspot_last_synced?: string | null
  google_access_token?: string | null
  google_sync_followups?: boolean
  google_sync_milestones?: boolean
  google_sync_lease_alerts?: boolean
  slack_webhook_url?: string | null
  slack_notify_alerts?: boolean
  slack_notify_news?: boolean
  slack_notify_digest?: boolean
}

interface User {
  id: number
  name: string
  email: string
  role: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Password change
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [changingPw, setChangingPw] = useState(false)

  // Invite
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviteName, setInviteName] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteResult, setInviteResult] = useState('')

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then(setSettings)
    fetch('/api/users').then((r) => r.json()).then((d) => setUsers(Array.isArray(d) ? d : []))
  }, [])

  async function saveSettings() {
    if (!settings) return
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekly_digest_enabled: settings.weekly_digest_enabled,
        digest_email: settings.digest_email,
        commission_rate_psf: settings.commission_rate_psf,
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSuccess(false)
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return }
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); return }
    setChangingPw(true)
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
    })
    const data = await res.json()
    setChangingPw(false)
    if (!res.ok) { setPwError(data.error); return }
    setPwSuccess(true)
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
  }

  async function inviteUser(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteResult('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole, password: invitePassword }),
    })
    const data = await res.json()
    setInviting(false)
    if (!res.ok) { setInviteResult(`Error: ${data.error}`); return }
    setInviteResult(`✓ ${inviteEmail} added`)
    setInviteEmail(''); setInviteName(''); setInvitePassword('')
    fetch('/api/users').then((r) => r.json()).then((d) => setUsers(Array.isArray(d) ? d : []))
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* App Settings */}
      {settings && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">App Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Weekly Digest Email</label>
              <input type="email" value={settings.digest_email}
                onChange={(e) => setSettings((p) => p ? { ...p, digest_email: e.target.value } : p)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Commission Rate ($ per SF)</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">$</span>
                <input type="number" step="0.25" min="0" value={settings.commission_rate_psf}
                  onChange={(e) => setSettings((p) => p ? { ...p, commission_rate_psf: parseFloat(e.target.value) } : p)}
                  className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                <span className="text-gray-500 text-sm">/ SF</span>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setSettings((p) => p ? { ...p, weekly_digest_enabled: !p.weekly_digest_enabled } : p)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.weekly_digest_enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${settings.weekly_digest_enabled ? 'translate-x-4' : 'translate-x-1'}`} />
              </div>
              <span className="text-sm text-gray-700">Send weekly digest email</span>
            </label>
            <button onClick={saveSettings} disabled={saving}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                saved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
              } disabled:opacity-50`}>
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Change Password</h2>
        <form onSubmit={changePassword} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Current Password</label>
            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">New Password</label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Confirm New Password</label>
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          {pwError && <p className="text-sm text-red-600">{pwError}</p>}
          {pwSuccess && <p className="text-sm text-green-600">✓ Password changed successfully</p>}
          <button type="submit" disabled={changingPw}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50">
            {changingPw ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Team Management */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Team Members</h2>

        {users.length > 0 && (
          <table className="w-full text-sm mb-5">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Email</th>
                <th className="text-left py-2">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-2 font-medium text-gray-900">{u.name}</td>
                  <td className="py-2 text-gray-600">{u.email}</td>
                  <td className="py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Team Member</h3>
        <form onSubmit={inviteUser} className="grid grid-cols-2 gap-3">
          {[
            { key: 'name', label: 'Name', value: inviteName, setter: setInviteName, type: 'text', required: true },
            { key: 'email', label: 'Email', value: inviteEmail, setter: setInviteEmail, type: 'email', required: true },
            { key: 'password', label: 'Initial Password', value: invitePassword, setter: setInvitePassword, type: 'password', required: true },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
              <input type={f.type} required={f.required} value={f.value}
                onChange={(e) => f.setter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {inviteResult && (
            <div className={`col-span-2 text-sm ${inviteResult.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
              {inviteResult}
            </div>
          )}
          <div className="col-span-2">
            <button type="submit" disabled={inviting}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50">
              {inviting ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>

      {/* HubSpot */}
      {settings && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">🔗 HubSpot CRM</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">HubSpot API Key</label>
              <input type="password" placeholder="pat-na1-..." value={settings.hubspot_api_key || ''}
                onChange={(e) => setSettings((p) => p ? { ...p, hubspot_api_key: e.target.value } : p)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => setSettings((p) => p ? { ...p, hubspot_auto_sync: !p.hubspot_auto_sync } : p)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.hubspot_auto_sync ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${settings.hubspot_auto_sync ? 'translate-x-4' : 'translate-x-1'}`} />
              </div>
              <span className="text-sm text-gray-700">Auto-sync after every script run</span>
            </label>
            {settings.hubspot_last_synced && (
              <p className="text-xs text-gray-400">Last synced: {new Date(settings.hubspot_last_synced).toLocaleString()}</p>
            )}
            <div className="flex gap-3">
              <button onClick={saveSettings} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">Save</button>
              <button onClick={async () => {
                const res = await fetch('/api/hubspot', { method: 'POST' })
                const data = await res.json()
                if (res.ok) alert(`Sync complete: ${data.result?.companies?.synced} companies, ${data.result?.contacts?.synced} contacts, ${data.result?.deals?.synced} deals`)
                else alert(`Error: ${data.error}`)
              }} className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition">
                Sync Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Calendar */}
      {settings && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">📅 Google Calendar</h2>
          {settings.google_access_token ? (
            <div className="space-y-3">
              <p className="text-sm text-green-600 font-medium">✓ Connected</p>
              {[['google_sync_followups', 'Sync follow-up reminders'], ['google_sync_milestones', 'Sync deal milestones'], ['google_sync_lease_alerts', 'Sync client lease expiration alerts']].map(([k, l]) => (
                <label key={k} className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setSettings((p) => p ? { ...p, [k]: !(p as unknown as Record<string, unknown>)[k] } : p)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${(settings as unknown as Record<string, unknown>)[k] ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${(settings as unknown as Record<string, unknown>)[k] ? 'translate-x-4' : 'translate-x-1'}`} />
                  </div>
                  <span className="text-sm text-gray-700">{l}</span>
                </label>
              ))}
              <div className="flex gap-3">
                <button onClick={saveSettings} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">Save</button>
                <button onClick={async () => { await fetch('/api/calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'disconnect' }) }); window.location.reload() }}
                  className="border border-red-200 text-red-500 px-4 py-2 rounded-lg text-sm hover:bg-red-50 transition">Disconnect</button>
              </div>
            </div>
          ) : (
            <button onClick={async () => { const res = await fetch('/api/calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'auth_url' }) }); const { url } = await res.json(); window.location.href = url }}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 transition">
              Connect Google Calendar
            </button>
          )}
        </div>
      )}

      {/* Slack */}
      {settings && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">💬 Slack Notifications</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Slack Webhook URL</label>
              <input type="text" placeholder="https://hooks.slack.com/services/..." value={settings.slack_webhook_url || ''}
                onChange={(e) => setSettings((p) => p ? { ...p, slack_webhook_url: e.target.value } : p)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            {[['slack_notify_alerts', '🔴 New 8-K alerts'], ['slack_notify_news', '📰 Company news (score 5)'], ['slack_notify_digest', '📊 Weekly digest summary']].map(([k, l]) => (
              <label key={k} className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setSettings((p) => p ? { ...p, [k]: !(p as unknown as Record<string, unknown>)[k] } : p)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${(settings as unknown as Record<string, unknown>)[k] !== false ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${(settings as unknown as Record<string, unknown>)[k] !== false ? 'translate-x-4' : 'translate-x-1'}`} />
                </div>
                <span className="text-sm text-gray-700">{l}</span>
              </label>
            ))}
            <div className="flex gap-3">
              <button onClick={saveSettings} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">Save</button>
              <button onClick={async () => {
                const res = await fetch('/api/slack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'test', webhook_url: settings.slack_webhook_url }) })
                const data = await res.json()
                alert(data.ok ? 'Test message sent to Slack ✓' : `Error: ${data.error}`)
              }} className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition">
                Send Test Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
