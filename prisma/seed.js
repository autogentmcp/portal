// Seed script to populate the database with sample data
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  try {
    // Clear existing data (optional)
    await prisma.apiKey.deleteMany({})
    await prisma.environmentSecurity.deleteMany({})
    await prisma.environment.deleteMany({})
    await prisma.application.deleteMany({})
    await prisma.user.deleteMany({})
    
    console.log('✅ Cleared existing data')

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN',
        password: await bcrypt.hash('admin123', 10)
      }
    })
    
    console.log('✅ Created admin user:', adminUser.email)

    // Create regular user
    const regularUser = await prisma.user.create({
      data: {
        email: 'user@example.com',
        name: 'Regular User',
        role: 'USER',
        password: await bcrypt.hash('user123', 10)
      }
    })
    
    console.log('✅ Created regular user:', regularUser.email)

    // Create sample applications
    const app1 = await prisma.application.create({
      data: {
        name: 'E-commerce API',
        description: 'REST API for e-commerce platform',
        appKey: 'ecommerce-api-' + Date.now(),
        authenticationMethod: 'oauth2',
        status: 'ACTIVE',
        userId: adminUser.id
      }
    })
    
    const app2 = await prisma.application.create({
      data: {
        name: 'Analytics Dashboard',
        description: 'Analytics and reporting dashboard API',
        appKey: 'analytics-dashboard-' + Date.now(),
        authenticationMethod: 'jwt',
        status: 'ACTIVE',
        userId: regularUser.id
      }
    })
    
    const app3 = await prisma.application.create({
      data: {
        name: 'Mobile App Backend',
        description: 'Backend services for mobile application',
        appKey: 'mobile-backend-' + Date.now(),
        authenticationMethod: 'api_key',
        status: 'ACTIVE',
        userId: adminUser.id
      }
    })
    
    console.log('✅ Created sample applications:', [app1.name, app2.name, app3.name])

    // Create environments for each application
    const environments = []
    
    // App 1 environments
    const app1Prod = await prisma.environment.create({
      data: {
        name: 'Production',
        description: 'Production environment',
        applicationId: app1.id,
        status: 'ACTIVE'
      }
    })
    
    const app1Staging = await prisma.environment.create({
      data: {
        name: 'Staging',
        description: 'Staging environment for testing',
        applicationId: app1.id,
        status: 'ACTIVE'
      }
    })
    
    const app1Dev = await prisma.environment.create({
      data: {
        name: 'Development',
        description: 'Development environment',
        applicationId: app1.id,
        status: 'ACTIVE'
      }
    })
    
    environments.push(app1Prod, app1Staging, app1Dev)
    
    // App 2 environments
    const app2Prod = await prisma.environment.create({
      data: {
        name: 'Production',
        description: 'Production environment',
        applicationId: app2.id,
        status: 'ACTIVE'
      }
    })
    
    const app2Dev = await prisma.environment.create({
      data: {
        name: 'Development',
        description: 'Development environment',
        applicationId: app2.id,
        status: 'ACTIVE'
      }
    })
    
    environments.push(app2Prod, app2Dev)
    
    // App 3 environments
    const app3Prod = await prisma.environment.create({
      data: {
        name: 'Production',
        description: 'Production environment',
        applicationId: app3.id,
        status: 'ACTIVE'
      }
    })
    
    environments.push(app3Prod)
    
    console.log('✅ Created environments:', environments.length)

    // Create environment security settings (rate limiting)
    await prisma.environmentSecurity.create({
      data: {
        environmentId: app1Prod.id,
        rateLimitEnabled: true,
        rateLimitRequests: 1000,
        rateLimitWindow: 60
      }
    })
    
    await prisma.environmentSecurity.create({
      data: {
        environmentId: app1Staging.id,
        rateLimitEnabled: true,
        rateLimitRequests: 500,
        rateLimitWindow: 60
      }
    })
    
    await prisma.environmentSecurity.create({
      data: {
        environmentId: app2Prod.id,
        rateLimitEnabled: true,
        rateLimitRequests: 2000,
        rateLimitWindow: 60
      }
    })
    
    console.log('✅ Created environment security settings')

    // Create API keys
    const apiKeys = []
    
    // Generate some API keys for different environments
    for (const env of environments) {
      const apiKey = await prisma.apiKey.create({
        data: {
          name: `${env.name} API Key`,
          token: `ak_${Math.random().toString(36).substr(2, 32)}`,
          status: 'ACTIVE',
          applicationId: env.applicationId,
          environmentId: env.id,
          userId: env.applicationId === app1.id ? adminUser.id : regularUser.id,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
        }
      })
      apiKeys.push(apiKey)
    }
    
    console.log('✅ Created API keys:', apiKeys.length)

    // Create some sample endpoints
    const endpoints = [
      // E-commerce API endpoints
      {
        name: 'Get Products',
        path: '/api/products',
        method: 'GET',
        description: 'Retrieve all products',
        isPublic: true,
        applicationId: app1.id,
        environmentId: app1Prod.id
      },
      {
        name: 'Create Product',
        path: '/api/products',
        method: 'POST',
        description: 'Create a new product',
        isPublic: false,
        authType: 'API_KEY',
        applicationId: app1.id,
        environmentId: app1Prod.id
      },
      {
        name: 'Get Orders',
        path: '/api/orders',
        method: 'GET',
        description: 'Retrieve user orders',
        isPublic: false,
        authType: 'API_KEY',
        applicationId: app1.id,
        environmentId: app1Prod.id
      },
      // Analytics Dashboard endpoints
      {
        name: 'Get Analytics',
        path: '/api/analytics',
        method: 'GET',
        description: 'Retrieve analytics data',
        isPublic: false,
        authType: 'API_KEY',
        applicationId: app2.id,
        environmentId: app2Prod.id
      },
      {
        name: 'Get Reports',
        path: '/api/reports',
        method: 'GET',
        description: 'Generate reports',
        isPublic: false,
        authType: 'API_KEY',
        applicationId: app2.id,
        environmentId: app2Prod.id
      },
      // Mobile Backend endpoints
      {
        name: 'User Login',
        path: '/api/auth/login',
        method: 'POST',
        description: 'User authentication',
        isPublic: true,
        applicationId: app3.id,
        environmentId: app3Prod.id
      },
      {
        name: 'User Profile',
        path: '/api/user/profile',
        method: 'GET',
        description: 'Get user profile',
        isPublic: false,
        authType: 'API_KEY',
        applicationId: app3.id,
        environmentId: app3Prod.id
      }
    ]
    
    for (const endpoint of endpoints) {
      await prisma.endpoint.create({ data: endpoint })
    }
    
    console.log('✅ Created sample endpoints:', endpoints.length)

    // Summary
    const summary = await prisma.application.findMany({
      include: {
        user: { select: { name: true, email: true } },
        environments: {
          include: {
            apiKeys: { select: { id: true, name: true } },
            security: true
          }
        },
        endpoints: { select: { id: true, name: true, method: true, path: true } }
      }
    })
    
    console.log('\n🎉 Database seeding completed!')
    console.log('📊 Summary:')
    console.log(`   Users: 2`)
    console.log(`   Applications: ${summary.length}`)
    console.log(`   Environments: ${environments.length}`)
    console.log(`   API Keys: ${apiKeys.length}`)
    console.log(`   Endpoints: ${endpoints.length}`)
    
    console.log('\n👤 Login credentials:')
    console.log('   Admin: admin@example.com / admin123')
    console.log('   User:  user@example.com / user123')
    
    console.log('\n🔗 View data at: http://localhost:5555 (Prisma Studio)')
    
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error('Seed script failed:', error)
    process.exit(1)
  })
