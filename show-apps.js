const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  
  try {
    const applications = await prisma.application.findMany({
      select: {
        id: true,
        name: true,
        appKey: true,
      }
    })
    
    console.log('Applications in database:')
    applications.forEach(app => {
      console.log(`- ID: ${app.id}, Name: ${app.name}, AppKey: ${app.appKey}`)
    })
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
