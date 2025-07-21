import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { EnvSecretManager } from '@/lib/secrets/env-manager';

// DELETE /api/admin/data-agents/[id]/environments/[environmentId] - Delete environment and all associated data
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; environmentId: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, environmentId } = await params;

    // Get data agent
    const dataAgent = await prisma.dataAgent.findUnique({
      where: { id },
    });

    if (!dataAgent) {
      return NextResponse.json({ error: 'Data agent not found' }, { status: 404 });
    }

    // Get environment with all related data
    const environment = await (prisma.environment as any).findUnique({
      where: { id: environmentId },
      include: {
        tables: {
          include: {
            columns: true,
            sourceRelations: true,
            targetRelations: true
          }
        },
        relations: true
      }
    });

    if (!environment || environment.dataAgentId !== id) {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 });
    }

    // Start transaction to delete all associated data
    await prisma.$transaction(async (tx) => {
      // Delete all table relationships for this environment
      await (tx.dataAgentRelation as any).deleteMany({
        where: {
          environmentId: environmentId
        }
      });

      // Delete all table columns for tables in this environment
      const tableIds = environment.tables.map((table: any) => table.id);
      if (tableIds.length > 0) {
        await (tx.dataAgentTableColumn as any).deleteMany({
          where: {
            tableId: {
              in: tableIds
            }
          }
        });
      }

      // Delete all tables for this environment
      await (tx.dataAgentTable as any).deleteMany({
        where: {
          environmentId: environmentId
        }
      });

      // Delete the environment itself
      await (tx.environment as any).delete({
        where: { id: environmentId }
      });
    });

    // Clean up vault data if vaultKey exists
    if (environment.vaultKey) {
      try {
        const { SecretManager } = await import('@/lib/secrets');
        const secretManager = SecretManager.getInstance();
        await secretManager.init();
        
        if (secretManager.hasProvider()) {
          // Delete credentials from vault using deleteSecret method
          await secretManager.deleteSecuritySetting(environment.vaultKey);
          console.log(`Deleted vault credentials for key: ${environment.vaultKey}`);
        }
      } catch (vaultError) {
        console.error('Error deleting vault credentials:', vaultError);
        // Don't fail the entire operation if vault cleanup fails
        // The environment data has already been deleted from the database
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Environment and all associated data deleted successfully',
      deletedData: {
        environment: environment.name,
        tablesDeleted: environment.tables?.length || 0,
        relationshipsDeleted: environment.relations?.length || 0,
        vaultKeyDeleted: !!environment.vaultKey
      }
    });

  } catch (error) {
    console.error('Error deleting environment:', error);
    return NextResponse.json(
      { error: 'Failed to delete environment' },
      { status: 500 }
    );
  }
}

// GET /api/admin/data-agents/[id]/environments/[environmentId] - Get environment details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; environmentId: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, environmentId } = await params;

    // Get data agent
    const dataAgent = await prisma.dataAgent.findUnique({
      where: { id },
    });

    if (!dataAgent) {
      return NextResponse.json({ error: 'Data agent not found' }, { status: 404 });
    }

    // Get environment with related data
    const environment = await (prisma.environment as any).findUnique({
      where: { id: environmentId },
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
      }
    });

    if (!environment || environment.dataAgentId !== id) {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 });
    }

    // Get credentials from vault
    let credentials = null
    if (environment.vaultKey) {
      try {
        const secretManager = new EnvSecretManager()
        await secretManager.init()
        
        if (secretManager.hasProvider()) {
          credentials = await secretManager.getCredentials(environment.vaultKey)
        }
      } catch (error) {
        console.error('Error retrieving credentials from vault:', error)
      }
    }

    return NextResponse.json({
      environment,
      credentials: credentials ? {
        username: credentials.username || '',
        // Don't return password for security
        host: credentials.host || '',
        port: credentials.port || '',
        database: credentials.database || ''
      } : null
    });

  } catch (error) {
    console.error('Error fetching environment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch environment' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/data-agents/[id]/environments/[environmentId] - Update environment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; environmentId: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, environmentId } = await params;
    const body = await request.json();
    const { description, connectionConfig, credentials } = body;

    // Get data agent
    const dataAgent = await prisma.dataAgent.findUnique({
      where: { id },
    });

    if (!dataAgent) {
      return NextResponse.json({ error: 'Data agent not found' }, { status: 404 });
    }

    // Get environment
    const environment = await (prisma.environment as any).findUnique({
      where: { id: environmentId }
    });

    if (!environment || environment.dataAgentId !== id) {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    
    if (description !== undefined) {
      updateData.description = description;
    }
    
    if (connectionConfig) {
      updateData.connectionConfig = connectionConfig;
    }

    // Handle credentials update if provided
    let vaultKey = environment.vaultKey;
    if (credentials) {
      try {
        const { SecretManager } = await import('@/lib/secrets');
        const secretManager = SecretManager.getInstance();
        await secretManager.init();
        
        if (secretManager.hasProvider()) {
          // Update credentials in vault
          if (vaultKey) {
            // For updates, we need to store the new credentials with the same key
            await secretManager.storeCredentials(vaultKey, credentials);
          } else {
            // Create new vault entry - need to generate a unique key
            vaultKey = `data-agent-${id}-env-${environmentId}-${Date.now()}`;
            await secretManager.storeCredentials(vaultKey, credentials);
            updateData.vaultKey = vaultKey;
          }
        }
      } catch (vaultError) {
        console.error('Error updating vault credentials:', vaultError);
        return NextResponse.json(
          { error: 'Failed to update credentials in vault' },
          { status: 500 }
        );
      }
    }

    // Update environment
    const updatedEnvironment = await (prisma.environment as any).update({
      where: { id: environmentId },
      data: updateData
    });

    return NextResponse.json({ environment: updatedEnvironment });

  } catch (error) {
    console.error('Error updating environment:', error);
    return NextResponse.json(
      { error: 'Failed to update environment' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/data-agents/[id]/environments/[environmentId] - Edit environment credentials (username/password only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; environmentId: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, environmentId } = await params
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Get the environment
    const environment = await prisma.environment.findFirst({
      where: {
        id: environmentId,
        dataAgent: {
          id: id
        }
      },
      include: {
        dataAgent: true
      }
    })

    if (!environment) {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 })
    }

    // Update credentials in vault
    if (environment.vaultKey) {
      try {
        const secretManager = new EnvSecretManager()
        await secretManager.init()
        
        if (secretManager.hasProvider()) {
          // Get existing credentials
          const existingCredentials = await secretManager.getCredentials(environment.vaultKey) || {}
          
          // Update only username and password
          const updatedCredentials = {
            ...existingCredentials,
            username,
            password
          }
          
          // Store back to vault
          const success = await secretManager.storeCredentials(environment.vaultKey, updatedCredentials)
          
          if (!success) {
            return NextResponse.json(
              { error: 'Failed to update credentials in vault' },
              { status: 500 }
            )
          }
        } else {
          return NextResponse.json(
            { error: 'No vault provider available' },
            { status: 500 }
          )
        }
      } catch (error) {
        console.error('Error updating credentials in vault:', error)
        return NextResponse.json(
          { error: 'Failed to update credentials' },
          { status: 500 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Environment has no vault key' },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Environment credentials updated successfully' 
    })
  } catch (error) {
    console.error('Error updating environment credentials:', error)
    return NextResponse.json(
      { error: 'Failed to update environment credentials' },
      { status: 500 }
    )
  }
}
