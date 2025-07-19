import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// PUT /api/admin/data-agents/[id]/environments/[environmentId]/credentials - Update environment credentials
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
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

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

    // Update credentials in vault
    try {
      const { SecretManager } = await import('@/lib/secrets');
      const secretManager = SecretManager.getInstance();
      await secretManager.init();
      
      if (secretManager.hasProvider()) {
        // Get existing credentials to merge with new username/password
        let existingCredentials = {};
        if (environment.vaultKey) {
          try {
            existingCredentials = await secretManager.getCredentials(environment.vaultKey) || {};
          } catch (error) {
            console.log('No existing credentials found, creating new ones');
          }
        }
        
        // Merge existing connection config with new credentials
        const updatedCredentials = {
          ...existingCredentials,
          host: environment.connectionConfig.host,
          port: String(environment.connectionConfig.port || '5432'),
          database: environment.connectionConfig.database,
          username: String(username),
          password: String(password)
        };
        
        if (environment.vaultKey) {
          // Update existing credentials
          await secretManager.storeCredentials(environment.vaultKey, updatedCredentials);
        } else {
          // Create new vault entry
          const vaultKey = `data-agent-${id}-env-${environmentId}-${Date.now()}`;
          await secretManager.storeCredentials(vaultKey, updatedCredentials);
          
          // Update environment with new vault key
          await (prisma.environment as any).update({
            where: { id: environmentId },
            data: { vaultKey }
          });
        }
        
        return NextResponse.json({ 
          success: true,
          message: 'Credentials updated successfully'
        });
      } else {
        return NextResponse.json(
          { error: 'No vault provider configured' },
          { status: 500 }
        );
      }
    } catch (vaultError) {
      console.error('Error updating vault credentials:', vaultError);
      return NextResponse.json(
        { error: 'Failed to update credentials in vault' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error updating credentials:', error);
    return NextResponse.json(
      { error: 'Failed to update credentials' },
      { status: 500 }
    );
  }
}

// GET /api/admin/data-agents/[id]/environments/[environmentId]/credentials - Get credentials info (without passwords)
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

    // Get environment
    const environment = await (prisma.environment as any).findUnique({
      where: { id: environmentId }
    });

    if (!environment || environment.dataAgentId !== id) {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 });
    }

    // Get credentials from vault (without exposing password)
    let hasCredentials = false;
    let username = '';
    
    if (environment.vaultKey) {
      try {
        const { SecretManager } = await import('@/lib/secrets');
        const secretManager = SecretManager.getInstance();
        await secretManager.init();
        
        if (secretManager.hasProvider()) {
          const credentials = await secretManager.getCredentials(environment.vaultKey);
          if (credentials) {
            hasCredentials = true;
            username = credentials.username || credentials.user || '';
          }
        }
      } catch (error) {
        console.error('Error retrieving credentials:', error);
      }
    }

    return NextResponse.json({ 
      hasCredentials,
      username,
      vaultKey: environment.vaultKey
    });

  } catch (error) {
    console.error('Error fetching credentials info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credentials info' },
      { status: 500 }
    );
  }
}
