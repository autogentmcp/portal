import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { deleteApiKey } from '@/lib/api-keys'
import { EnvSecretManager } from '@/lib/secrets/env-manager'

// PUT /api/admin/applications/[id] - Update application
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, status } = await request.json()
    
    // In Next.js 14+, we need to await params before accessing its properties
    const { id } = await params

    const application = await prisma.application.update({
      where: { id },
      data: {
        name,
        description,
        status,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            environments: true,
            apiKeys: true,
            endpoints: true,
          },
        },
      },
    })

    return NextResponse.json(application)
  } catch (error) {
    console.error('Error updating application:', error)
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/applications/[id] - Delete application
export async function DELETE(
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

    // Delete related records first (cascade)
    await prisma.auditLog.deleteMany({
      where: { applicationId: id },
    })
    
    // Get all API keys for this application
    const apiKeys = await prisma.apiKey.findMany({
      where: { applicationId: id },
      select: { id: true }
    });
    
    // Delete each API key properly (from both database and vault)
    for (const key of apiKeys) {
      await deleteApiKey(key.id);
    }

    await prisma.endpoint.deleteMany({
      where: { applicationId: id },
    })

    // Get all environments for this application to clean up vault keys
    const environments = await prisma.environment.findMany({
      where: { applicationId: id },
      include: {
        security: true,
      },
    })

    // Clean up vault keys for each environment
    let secretManager: EnvSecretManager | null = null
    try {
      secretManager = new EnvSecretManager()
      await secretManager.init()
      
      if (secretManager.hasProvider()) {
        for (const env of environments) {
          // @ts-ignore - vaultKey field added in recent migration
          if (env.security?.vaultKey) {
            try {
              // @ts-ignore - vaultKey field added in recent migration
              await secretManager.deleteSecuritySetting(env.security.vaultKey)
              // @ts-ignore - vaultKey field added in recent migration
              console.log(`Deleted vault key for environment ${env.id}`)
            } catch (error) {
              // @ts-ignore - vaultKey field added in recent migration
              console.error(`Failed to delete vault key for environment ${env.id}`)
            }
          }
        }
      }
    } catch (error) {
      console.warn('Could not initialize secret manager for cleanup:', error)
    }

    await prisma.environment.deleteMany({
      where: { applicationId: id },
    })

    // Delete the application
    await prisma.application.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting application:', error)
    return NextResponse.json(
      { error: 'Failed to delete application' },
      { status: 500 }
    )
  }
}
