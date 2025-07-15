import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { EnvSecretManager } from '@/lib/secrets/env-manager'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // In Next.js 14+, we need to await params before accessing its properties
    const { id } = await params
    const environmentId = id
    const body = await request.json()

    // Validate the environment exists
    const environment = await prisma.environment.findUnique({
      where: { id: environmentId },
      include: { application: true }
    })

    if (!environment) {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 })
    }

    // Initialize the secret manager to store sensitive credentials in the vault
    let secretManager: EnvSecretManager | null = null
    let vaultAvailable = false

    try {
      secretManager = new EnvSecretManager()
      await secretManager.init()
      vaultAvailable = secretManager.hasProvider()
      console.log(`Secret manager initialized successfully, has provider: ${vaultAvailable}`)
    } catch (error) {
      console.warn('Failed to initialize secret manager, proceeding without vault:', error instanceof Error ? error.message : String(error))
      vaultAvailable = false
    }

    console.log(`Environment security update for ${environmentId}`)
    console.log(`Vault available: ${vaultAvailable}`)

    // Identify sensitive fields that should be stored in the vault
    const sensitiveFields = [
      'azureApimSubscriptionKey',
      'awsSecretKey', 
      'awsSessionToken',
      'gcpKeyFile',
      'oauth2ClientSecret',
      'jwtSecret',
      'signaturePrivateKey',
      'apiKey',
      'bearerToken',
      'basicAuthPassword'
    ]

    // Extract sensitive data for vault storage
    const sensitiveData: Record<string, any> = {}
    const nonSensitiveData: Record<string, any> = {}

    // Separate sensitive and non-sensitive data
    Object.keys(body).forEach(key => {
      if (sensitiveFields.includes(key) && body[key]) {
        sensitiveData[key] = body[key]
        console.log(`Found sensitive field: ${key}`)
      } else {
        nonSensitiveData[key] = body[key]
      }
    })

    console.log(`Sensitive data keys: ${Object.keys(sensitiveData).join(', ')}`)
    console.log(`Non-sensitive data keys: ${Object.keys(nonSensitiveData).join(', ')}`)

    // Store sensitive data in the vault if available
    if (vaultAvailable && secretManager && Object.keys(sensitiveData).length > 0) {
      try {
        const vaultKey = `env_${environmentId}_security_settings`
        const success = await secretManager.storeSecuritySetting(vaultKey, JSON.stringify(sensitiveData))
        
        if (success) {
          console.log(`Stored sensitive environment security settings in vault for environment ${environmentId}`)
        } else {
          console.warn('Failed to store sensitive data in vault')
        }
      } catch (error) {
        console.error('Error storing sensitive data in vault:', error instanceof Error ? error.message : String(error))
      }
    } else if (Object.keys(sensitiveData).length > 0) {
      console.warn(`Vault not available, sensitive data will be stored in database (not recommended)`)
    }

    // Update or create environment security settings
    // Only store rate limiting fields in the database (sensitive data goes to vault)
    const securityData = {
      rateLimitEnabled: nonSensitiveData.rateLimitEnabled || false,
      rateLimitRequests: nonSensitiveData.rateLimitRequests || null,
      rateLimitWindow: nonSensitiveData.rateLimitWindow || null,
    }

    // @ts-ignore - TypeScript might not recognize the model due to dynamic schema loading
    const environmentSecurity = await prisma.environmentSecurity.upsert({
      where: { environmentId },
      update: securityData,
      create: {
        environmentId,
        ...securityData
      }
    })

    return NextResponse.json(environmentSecurity)
  } catch (error) {
    console.error('Error updating environment security:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const environmentId = params.id

    // @ts-ignore - TypeScript might not recognize the model due to dynamic schema loading
    const environmentSecurity = await prisma.environmentSecurity.findUnique({
      where: { environmentId },
      include: {
        environment: {
          include: {
            application: true
          }
        }
      }
    })

    if (!environmentSecurity) {
      return NextResponse.json({ error: 'Environment security not found' }, { status: 404 })
    }

    // Initialize the secret manager to retrieve sensitive credentials from the vault
    let secretManager: EnvSecretManager | null = null
    let vaultAvailable = false

    try {
      secretManager = new EnvSecretManager()
      await secretManager.init()
      vaultAvailable = secretManager.hasProvider()
      console.log(`Secret manager initialized for GET, has provider: ${vaultAvailable}`)
    } catch (error) {
      console.warn('Failed to initialize secret manager for GET, proceeding without vault:', error instanceof Error ? error.message : String(error))
      vaultAvailable = false
    }

    // Create a response object starting with database data
    const response = { ...environmentSecurity }

    // If vault is available, try to retrieve sensitive data
    if (vaultAvailable && secretManager) {
      try {
        const vaultKey = `env_${environmentId}_security_settings`
        const sensitiveDataJson = await secretManager.getSecuritySetting(vaultKey)
        
        if (sensitiveDataJson) {
          const sensitiveData = JSON.parse(sensitiveDataJson)
          
          // Merge sensitive data back into the response
          Object.keys(sensitiveData).forEach(key => {
            if (sensitiveData[key]) {
              response[key] = sensitiveData[key]
            }
          })
          
          console.log(`Retrieved sensitive environment security settings from vault for environment ${environmentId}`)
        }
      } catch (error) {
        console.error('Error retrieving sensitive data from vault:', error instanceof Error ? error.message : String(error))
        // Continue with non-sensitive data only
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching environment security:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
