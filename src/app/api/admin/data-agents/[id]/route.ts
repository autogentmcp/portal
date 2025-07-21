import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET /api/admin/data-agents/[id] - Get specific data agent
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const dataAgent = await (prisma.dataAgent as any).findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        environments: {
          include: {
            tables: {
              include: {
                columns: {
                  orderBy: {
                    columnName: 'asc'
                  }
                },
                _count: {
                  select: {
                    sourceRelations: true,
                    targetRelations: true
                  }
                }
              },
              orderBy: {
                tableName: 'asc'
              }
            },
            relations: {
              include: {
                sourceTable: true,
                targetTable: true
              },
              orderBy: {
                createdAt: 'desc'
              }
            },
            _count: {
              select: {
                tables: true,
                relations: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!dataAgent) {
      return NextResponse.json({ error: 'Data agent not found' }, { status: 404 })
    }

    // Get credentials from vault if available
    if (dataAgent.vaultKey) {
      try {
        const { SecretManager } = await import('@/lib/secrets')
        const secretManager = SecretManager.getInstance()
        await secretManager.init()
        
        if (secretManager.hasProvider()) {
          const credentials = await secretManager.getCredentials(dataAgent.vaultKey)
          if (credentials) {
            // Add credentials to connection config for display/editing
            const config = dataAgent.connectionConfig as any;
            dataAgent.connectionConfig = {
              ...config,
              credentials
            }
          }
        }
      } catch (error) {
        console.error('Failed to retrieve credentials from vault')
        // Continue without credentials
      }
    }

    return NextResponse.json(dataAgent)
  } catch (error) {
    console.error('Error fetching data agent')
    return NextResponse.json(
      { error: 'Failed to fetch data agent' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/data-agents/[id] - Update data agent
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { name, description, connectionConfig } = await request.json()

    // Check if data agent exists
    const existingAgent = await prisma.dataAgent.findUnique({
      where: { id }
    })

    if (!existingAgent) {
      return NextResponse.json({ error: 'Data agent not found' }, { status: 404 })
    }

    // Update credentials in vault if provided
    let finalConnectionConfig = connectionConfig
    if (connectionConfig?.credentials && existingAgent.vaultKey) {
      try {
        const { SecretManager } = await import('@/lib/secrets')
        const secretManager = SecretManager.getInstance()
        await secretManager.init()
        
        if (secretManager.hasProvider()) {
          await secretManager.storeCredentials(existingAgent.vaultKey, connectionConfig.credentials)
          
          // Remove credentials from config before storing in database
          const { credentials, ...configWithoutCredentials } = connectionConfig
          finalConnectionConfig = configWithoutCredentials
        }
      } catch (error) {
        console.error('Failed to update credentials in vault')
        return NextResponse.json(
          { error: 'Failed to update connection credentials' },
          { status: 500 }
        )
      }
    }

    const updatedAgent = await prisma.dataAgent.update({
      where: { id },
      data: {
        name,
        description,
        connectionConfig: finalConnectionConfig,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    return NextResponse.json(updatedAgent)
  } catch (error) {
    console.error('Error updating data agent')
    return NextResponse.json(
      { error: 'Failed to update data agent' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/data-agents/[id] - Delete data agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if data agent exists
    const existingAgent = await prisma.dataAgent.findUnique({
      where: { id }
    })

    if (!existingAgent) {
      return NextResponse.json({ error: 'Data agent not found' }, { status: 404 })
    }

    // Delete credentials from vault if they exist
    if (existingAgent.vaultKey) {
      try {
        const { SecretManager } = await import('@/lib/secrets')
        const secretManager = SecretManager.getInstance()
        await secretManager.init()
        
        if (secretManager.hasProvider()) {
          await secretManager.deleteSecuritySetting(existingAgent.vaultKey)
        }
      } catch (error) {
        console.error('Failed to delete credentials from vault')
        // Continue with deletion anyway
      }
    }

    // Delete the data agent (cascade will handle related records)
    await prisma.dataAgent.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting data agent')
    return NextResponse.json(
      { error: 'Failed to delete data agent' },
      { status: 500 }
    )
  }
}
