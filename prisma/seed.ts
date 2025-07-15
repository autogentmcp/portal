import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const password = await bcrypt.hash(adminPassword, 10);

  // Create admin user if not exists
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Administrator',
      role: 'ADMIN',
      password,
    },
  });
  console.log('Admin user created/ensured:', admin.email);

  // Create sample application
  const sampleApp = await prisma.application.upsert({
    where: { appKey: 'app_sample_12345' },
    update: {},
    create: {
      name: 'Sample AI Agent',
      description: 'A sample AI-powered application for demonstration purposes',
      appKey: 'app_sample_12345',
      status: 'ACTIVE',
      userId: admin.id,
    },
  });
  console.log('Sample application created:', sampleApp.name);

  // Create sample environments
  const prodEnvironment = await prisma.environment.upsert({
    where: { 
      applicationId_name: {
        applicationId: sampleApp.id,
        name: 'production'
      }
    },
    update: {},
    create: {
      name: 'production',
      description: 'Production environment',
      status: 'ACTIVE',
      applicationId: sampleApp.id,
    },
  });

  const devEnvironment = await prisma.environment.upsert({
    where: { 
      applicationId_name: {
        applicationId: sampleApp.id,
        name: 'development'
      }
    },
    update: {},
    create: {
      name: 'development',
      description: 'Development environment',
      status: 'ACTIVE',
      applicationId: sampleApp.id,
    },
  });
  console.log('Sample environments created');

  // Create environment security settings
  await prisma.environmentSecurity.create({
    data: {
      environmentId: prodEnvironment.id,
      rateLimitEnabled: true,
      rateLimitRequests: 100,
      rateLimitWindow: 60,
    },
  }).catch(() => {
    console.log('Production environment security already exists, skipping...');
  });

  await prisma.environmentSecurity.create({
    data: {
      environmentId: devEnvironment.id,
      rateLimitEnabled: false,
    },
  }).catch(() => {
    console.log('Development environment security already exists, skipping...');
  });
  console.log('Environment security settings created');

  // Create sample API keys
  const prodApiKey = await prisma.apiKey.upsert({
    where: { token: 'tok_prod_sample_12345' },
    update: {},
    create: {
      name: 'Production API Key',
      token: 'tok_prod_sample_12345',
      status: 'ACTIVE',
      applicationId: sampleApp.id,
      environmentId: prodEnvironment.id,
      userId: admin.id,
    },
  });

  const devApiKey = await prisma.apiKey.upsert({
    where: { token: 'tok_dev_sample_12345' },
    update: {},
    create: {
      name: 'Development API Key',
      token: 'tok_dev_sample_12345',
      status: 'ACTIVE',
      applicationId: sampleApp.id,
      environmentId: devEnvironment.id,
      userId: admin.id,
    },
  });
  console.log('Sample API keys created');

  // Create sample endpoints
  await prisma.endpoint.upsert({
    where: {
      applicationId_environmentId_path_method: {
        applicationId: sampleApp.id,
        environmentId: prodEnvironment.id,
        path: '/api/v1/process',
        method: 'POST'
      }
    },
    update: {},
    create: {
      name: 'Process Data',
      path: '/api/v1/process',
      method: 'POST',
      description: 'Process incoming data using AI agent',
      isPublic: false,
      authType: 'API_KEY',
      applicationId: sampleApp.id,
      environmentId: prodEnvironment.id,
    },
  });

  await prisma.endpoint.upsert({
    where: {
      applicationId_environmentId_path_method: {
        applicationId: sampleApp.id,
        environmentId: prodEnvironment.id,
        path: '/api/v1/health',
        method: 'GET'
      }
    },
    update: {},
    create: {
      name: 'Health Check',
      path: '/api/v1/health',
      method: 'GET',
      description: 'Check agent health and status',
      isPublic: true,
      authType: 'NONE',
      applicationId: sampleApp.id,
      environmentId: prodEnvironment.id,
    },
  });
  console.log('Sample endpoints created');

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
