/**
 * seed.ts — Seeds the admin user
 * Run: npx ts-node --skip-project scripts/seed.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = 'Apex2025!'
  const hash = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { email: 'eddie@rymer.com' },
    update: {},
    create: {
      email: 'eddie@rymer.com',
      password_hash: hash,
      name: 'Eddie Rymer',
      role: 'admin',
    },
  })

  console.log(`✓ Admin user: ${user.email} (${user.role})`)
  console.log(`  Password: ${password}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
