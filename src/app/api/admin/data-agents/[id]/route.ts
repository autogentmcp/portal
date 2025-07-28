import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { DatabaseJsonHelper } from '@/lib/database/json-helper'

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

    // Transform environments to parse JSON fields and get vault credentials
    if (dataAgent.environments) {
      // We need to handle vault access for each environment
      const transformedEnvironments = [];
      
      for (const env of dataAgent.environments) {
        const transformedEnv = DatabaseJsonHelper.transformPrismaResult(env, ['connectionConfig']);
        
        // Get credentials from vault if available for this environment
        if (transformedEnv.vaultKey) {
          try {
            const { SecretManager } = await import('@/lib/secrets')
            const secretManager = SecretManager.getInstance()
            await secretManager.init()
            
            if (secretManager.hasProvider()) {
              const credentials = await secretManager.getCredentials(transformedEnv.vaultKey)
              if (credentials && transformedEnv.connectionConfig) {
                // Add credentials to connection config for display/editing
                transformedEnv.connectionConfig = {
                  ...transformedEnv.connectionConfig,
                  credentials
                }
              }
            }
          } catch (error) {
            console.error('Failed to retrieve credentials from vault for environment:', transformedEnv.id, error)
            // Continue without credentials
          }
        }
        
        transformedEnvironments.push(transformedEnv);
      }
      
      dataAgent.environments = transformedEnvironments;
    }

    // Transform tables to parse JSON fields
    if (dataAgent.tables) {
      dataAgent.tables = dataAgent.tables.map((table: any) => 
        DatabaseJsonHelper.transformPrismaResult(table, ['analysisResult'])
      );
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
    const { name, description } = await request.json()

    // Check if data agent exists
    const existingAgent = await prisma.dataAgent.findUnique({
      where: { id }
    })

    if (!existingAgent) {
      return NextResponse.json({ error: 'Data agent not found' }, { status: 404 })
    }

    const updatedAgent = await prisma.dataAgent.update({
      where: { id },
      data: {
        name,
        description,
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
      where: { id },
      include: {
        environments: true
      }
    })

    if (!existingAgent) {
      return NextResponse.json({ error: 'Data agent not found' }, { status: 404 })
    }

    // Delete credentials from vault for all environments if they exist
    if (existingAgent.environments && existingAgent.environments.length > 0) {
      try {
        const { SecretManager } = await import('@/lib/secrets')
        const secretManager = SecretManager.getInstance()
        await secretManager.init()
        
        if (secretManager.hasProvider()) {
          for (const environment of existingAgent.environments) {
            if (environment.vaultKey) {
              await secretManager.deleteSecuritySetting(environment.vaultKey)
            }
          }
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
