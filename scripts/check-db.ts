import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('Checking database contents:');
  
  // Check users
  const users = await prisma.user.findMany();
  console.log('Users:', users);

  // Check applications
  const applications = await prisma.application.findMany();
  console.log('Applications:', applications);

  // Check environments
  const environments = await prisma.environment.findMany();
  console.log('Environments:', environments);

  // Check API keys
  const apiKeys = await prisma.apiKey.findMany();
  console.log('API Keys:', apiKeys);

  // Check endpoints
  const endpoints = await prisma.endpoint.findMany();
  console.log('Endpoints:', endpoints);

  // Check environment security (if model exists)
  try {
    // @ts-ignore - Handle potential model not existing
    const envSecurity = await prisma.environmentSecurity.findMany();
    console.log('Environment Security:', envSecurity);
  } catch (err) {
    console.log('Environment Security: Model may not exist', err);
  }
}

checkDatabase()
  .catch(e => {
    console.error('Error checking database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
