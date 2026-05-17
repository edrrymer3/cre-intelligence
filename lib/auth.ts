import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './db'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({ where: { email: credentials.email } })
        if (!user || !user.password_hash) return null
        const valid = await bcrypt.compare(credentials.password, user.password_hash)
        if (!valid) return null
        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
          orgId: user.org_id,
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as { id: string; email: string; name: string; role: string; orgId: number }
        token.role = u.role
        token.orgId = u.orgId
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        const u = session.user as { role?: string; orgId?: number }
        u.role = token.role as string
        u.orgId = token.orgId as number
      }
      return session
    },
  },
}

// Helper to get org_id from session
export function getOrgId(session: { user?: { orgId?: number } } | null): number {
  return session?.user?.orgId || 1
}
