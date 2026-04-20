import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import DashboardNav from './nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen bg-gray-100">
      <DashboardNav user={session.user} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
