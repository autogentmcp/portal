import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { EnvSecretManager } from '@/lib/secrets/env-manager'

// PATCH /api/admin/environments/[id] - Update an environment
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const { name, status, baseDomain } = await request.json()

    if (!baseDomain) {
      return NextResponse.json(
        { error: 'Base domain is required' },
        { status: 400 }
      )
    }

    // Check if environment exists
    const environment = await prisma.environment.findUnique({
      where: { id },
    })

    if (!environment) {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 })
    }

    // Update the environment
    const updatedEnvironment = await prisma.environment.update({
      where: { id },
      data: {
        name: name || undefined,
        status: status || undefined,
        // @ts-ignore - baseDomain field issue with Prisma types
        baseDomain,
      },
    })

    return NextResponse.json(updatedEnvironment)
  } catch (error) {
    console.error('Error updating environment:', error)
    return NextResponse.json(
      { error: 'Failed to update environment' },
      { status: 500 }
    )
  }
}

// GET /api/admin/environments/[id] - Get environment details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const environment = await prisma.environment.findUnique({
      where: { id },
      include: {
        apiKeys: true,
        security: true,
      },
    })

    if (!environment) {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 })
    }

    return NextResponse.json(environment)
  } catch (error) {
    console.error('Error fetching environment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch environment details' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/environments/[id] - Delete environment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Check if environment exists and get security settings
    const environment = await prisma.environment.findUnique({
      where: { id },
      include: {
        security: true,
      },
    })

    if (!environment) {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 })
    }

    // Clean up vault key if it exists
    // @ts-ignore - vaultKey field added in recent migration
    if (environment.security?.vaultKey) {
      try {
        const secretManager = new EnvSecretManager()
        await secretManager.init()
        
        if (secretManager.hasProvider()) {
          // @ts-ignore - vaultKey field added in recent migration
          await secretManager.deleteSecuritySetting(environment.security.vaultKey)
          // @ts-ignore - vaultKey field added in recent migration
          console.log(`Deleted vault key ${environment.security.vaultKey} for environment ${id}`)
        }
      } catch (error) {
        // @ts-ignore - vaultKey field added in recent migration
        console.error(`Failed to delete vault key ${environment.security.vaultKey}:`, error)
      }
    }

    // Delete the environment (cascade will handle related records)
    await prisma.environment.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting environment:', error)
    return NextResponse.json(
      { error: 'Failed to delete environment' },
      { status: 500 }
    )
  }
}
