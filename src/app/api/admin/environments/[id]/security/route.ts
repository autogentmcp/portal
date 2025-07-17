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

    // Extract credentials data for vault storage and non-sensitive config for database
    const credentialsData: Record<string, any> = {}
    const configData: Record<string, any> = {}

    // Handle nested credentials structure - ALL credentials go to vault
    if (body.credentials && typeof body.credentials === 'object') {
      // All credentials are considered sensitive and go to vault
      Object.keys(body.credentials).forEach(key => {
        if (body.credentials[key] !== undefined && body.credentials[key] !== null && body.credentials[key] !== '') {
          credentialsData[key] = body.credentials[key]
          console.log(`Found credential field for vault: ${key}`)
        }
      })
    }

    // Non-credentials data goes to database (rate limiting, etc.)
    Object.keys(body).forEach(key => {
      if (key === 'credentials') return // Skip credentials object, already processed
      
      configData[key] = body[key]
    })

    console.log(`Credentials data keys: ${Object.keys(credentialsData).join(', ')}`)
    console.log(`Config data keys: ${Object.keys(configData).join(', ')}`)

    // Store credentials data in the vault if available
    if (vaultAvailable && secretManager && Object.keys(credentialsData).length > 0) {
      try {
        const vaultKey = `env_${environmentId}_security_settings`
        const success = await secretManager.storeCredentials(vaultKey, credentialsData)
        
        if (success) {
          console.log(`Stored credentials in vault for environment ${environmentId}`)
        } else {
          console.warn('Failed to store credentials in vault')
        }
      } catch (error) {
        console.error('Error storing credentials in vault:', error instanceof Error ? error.message : String(error))
      }
    } else if (Object.keys(credentialsData).length > 0) {
      console.warn(`Vault not available, credentials will be stored in database (not recommended)`)
    }

    // Update or create environment security settings
    // Only store rate limiting and basic configuration in the database
    const securityData = {
      rateLimitEnabled: configData.rateLimitEnabled || false,
      rateLimitRequests: configData.rateLimitRequests || null,
      rateLimitWindow: configData.rateLimitWindow || null,
      vaultKey: vaultAvailable && Object.keys(credentialsData).length > 0 ? `env_${environmentId}_security_settings` : null,
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
    const response: Record<string, any> = { ...environmentSecurity }

    // If vault is available, try to retrieve sensitive data
    if (vaultAvailable && secretManager) {
      try {
        const vaultKey = `env_${environmentId}_security_settings`
        const sensitiveData = await secretManager.getCredentials(vaultKey)
        
        if (sensitiveData) {
          // Create a credentials object to hold sensitive data
          response.credentials = response.credentials || {}
          
          // Merge sensitive data into credentials object
          Object.keys(sensitiveData).forEach(key => {
            if (sensitiveData[key]) {
              response.credentials[key] = sensitiveData[key]
            }
          })
          
          console.log(`Retrieved sensitive environment security settings from vault for environment ${environmentId}`)
        }
      } catch (error) {
        console.error('Error retrieving sensitive data from vault:', error instanceof Error ? error.message : String(error))
        // Continue with non-sensitive data only
      }
    }

    // Parse stored JSON fields back to objects
    if (response.customHeaders) {
      try {
        response.credentials = response.credentials || {}
        response.credentials.customHeaders = JSON.parse(response.customHeaders)
      } catch (error) {
        console.error('Error parsing customHeaders:', error)
      }
    }

    if (response.dynamicFieldsConfig) {
      try {
        response.credentials = response.credentials || {}
        response.credentials.dynamicFieldsConfig = JSON.parse(response.dynamicFieldsConfig)
      } catch (error) {
        console.error('Error parsing dynamicFieldsConfig:', error)
      }
    }

    if (response.customDynamicFields) {
      try {
        response.credentials = response.credentials || {}
        response.credentials.customDynamicFields = JSON.parse(response.customDynamicFields)
      } catch (error) {
        console.error('Error parsing customDynamicFields:', error)
      }
    }

    // Move other non-sensitive fields to credentials object for consistency
    if (response.credentials) {
      const fieldsToMove = [
        'keyVersion', 'uniqueIdentifier', 'signatureAlgorithm', 'signatureHeader', 
        'signatureFormat', 'includeDynamicFields', 'tokenUrl', 'scope', 
        'subscriptionId', 'resourceGroup', 'region', 'projectId', 'apimUrl', 'username'
      ]
      
      fieldsToMove.forEach(field => {
        if (response[field] !== undefined) {
          response.credentials[field] = response[field]
        }
      })
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching environment security:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
