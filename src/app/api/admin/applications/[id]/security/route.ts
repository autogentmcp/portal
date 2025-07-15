import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { logError, logInfo } from '@/lib/utils/logger'

// PUT /api/admin/applications/[id]/security - Save application security settings
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await request.json()

    // In Next.js 14+, we need to await params before accessing its properties
    const { id } = await params

    // Check if application exists
    const application = await prisma.application.findUnique({
      where: { id },
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Store credentials in the configured vault if provided
    if (settings.credentials && Object.keys(settings.credentials).length > 0) {
      try {
        // Import the environment-based secret manager
        const { SecretManager } = await import('@/lib/secrets')
        const secretManager = SecretManager.getInstance()
        await secretManager.init()
        
        if (secretManager.hasProvider()) {
          // Generate a unique key for this application's credentials
          const credentialsKey = `app_${id}_auth_credentials`
          
          // Store the credentials in the vault
          await secretManager.storeSecuritySetting(credentialsKey, JSON.stringify(settings.credentials))
          logInfo(`Stored authentication credentials in vault for application ${id}`)
        } else {
          logError('No secret provider available for storing credentials')
          return NextResponse.json(
            { error: 'No vault provider configured for credential storage' },
            { status: 500 }
          )
        }
      } catch (error) {
        logError(`Failed to store credentials in vault: ${error}`)
        return NextResponse.json(
          { error: 'Failed to store credentials in vault' },
          { status: 500 }
        )
      }
    }

    // Update the application with the authentication method
    const updatedApplication = await prisma.application.update({
      where: { id },
      data: {
        authenticationMethod: settings.authenticationMethod,
      },
    })

    logInfo(`Updated application ${id} authentication method to: ${settings.authenticationMethod}`)

    return NextResponse.json({
      message: 'Application security settings saved successfully',
      application: updatedApplication,
    })
  } catch (error) {
    logError(`Error saving application security settings: ${error}`)
    return NextResponse.json(
      { error: 'Failed to save application security settings' },
      { status: 500 }
    )
  }
}

// GET /api/admin/applications/[id]/security - Get application security settings
export async function GET(
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

    const application = await prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        authenticationMethod: true,
      },
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const result: any = {
      authenticationMethod: application.authenticationMethod || '',
      credentials: {}
    }

    // Try to retrieve credentials from vault if available
    try {
      const { SecretManager } = await import('@/lib/secrets')
      const secretManager = SecretManager.getInstance()
      await secretManager.init()
      
      if (secretManager.hasProvider()) {
        const credentialsKey = `app_${id}_auth_credentials`
        const credentialsJson = await secretManager.getSecuritySetting(credentialsKey)
        
        if (credentialsJson) {
          result.credentials = JSON.parse(credentialsJson)
          logInfo(`Retrieved authentication credentials from vault for application ${id}`)
        }
      }
    } catch (error) {
      logError(`Failed to retrieve credentials from vault: ${error}`)
      // Continue without credentials - they'll be empty
    }

    return NextResponse.json(result)
  } catch (error) {
    logError(`Error fetching application security settings: ${error}`)
    return NextResponse.json(
      { error: 'Failed to fetch application security settings' },
      { status: 500 }
    )
  }
}