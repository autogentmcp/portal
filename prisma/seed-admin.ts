import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@autogentmcp.com' },
    update: {},
    create: {
      email: 'admin@autogentmcp.com',
      name: 'Admin User',
      role: 'ADMIN',
      password: hashedPassword,
    },
  })

  console.log('✅ Default admin user created:')
  console.log(`   Email: ${adminUser.email}`)
  console.log(`   Name: ${adminUser.name}`)
  console.log(`   Role: ${adminUser.role}`)
  console.log(`   Password: admin123`)
  console.log('')
  console.log('🔐 You can now login with:')
  console.log('   Email: admin@autogentmcp.com')
  console.log('   Password: admin123')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
