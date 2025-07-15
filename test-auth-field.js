// Test script to verify authenticationMethod field exists
const { PrismaClient } = require('@prisma/client')

async function testSchema() {
  const prisma = new PrismaClient()
  
  try {
    // Test if we can query the authenticationMethod field
    const apps = await prisma.application.findMany({
      select: {
        id: true,
        name: true,
        authenticationMethod: true,
      },
      take: 1
    })
    
    console.log('✅ authenticationMethod field exists in database')
    console.log('Sample app:', apps[0] || 'No apps found')
    
    // Test if we can update the authenticationMethod field
    if (apps[0]) {
      await prisma.application.update({
        where: { id: apps[0].id },
        data: { authenticationMethod: 'test_method' }
      })
      console.log('✅ authenticationMethod field can be updated')
    }
    
  } catch (error) {
    console.error('❌ Error testing authenticationMethod field:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testSchema()
