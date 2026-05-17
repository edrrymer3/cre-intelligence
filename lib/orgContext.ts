/**
 * Multi-tenancy helper — extracts org_id from session for use in API routes
 */
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

export async function getOrgId(): Promise<number> {
  const session = await getServerSession(authOptions)
  // @ts-expect-error — orgId is added via JWT callback
  return session?.user?.orgId || 1
}

export async function requireOrgId(): Promise<number> {
  const orgId = await getOrgId()
  return orgId
}
