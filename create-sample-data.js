// Create a sample application for testing
const { PrismaClient } = require('@prisma/client')

async function createSampleData() {
  const prisma = new PrismaClient()
  
  try {
    // First, create a user
    const user = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN',
        password: 'hashedpassword123'
      }
    })
    
    // Create a sample application
    const app = await prisma.application.create({
      data: {
        name: 'Test Application',
        description: 'Test application for authentication method testing',
        appKey: 'test-app-key-' + Date.now(),
        authenticationMethod: 'oauth2',
        userId: user.id
      }
    })
    
    console.log('✅ Created sample application:', app.id)
    console.log('Authentication method:', app.authenticationMethod)
    
    // Create a sample environment
    const env = await prisma.environment.create({
      data: {
        name: 'Production',
        description: 'Production environment',
        applicationId: app.id
      }
    })
    
    console.log('✅ Created sample environment:', env.id)
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

createSampleData()
