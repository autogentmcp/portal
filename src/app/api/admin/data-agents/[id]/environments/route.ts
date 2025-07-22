import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { environmentType, description, connectionConfig, connectionTested } = await request.json();
    const { id } = await params;
    const dataAgentId = id;

    if (!environmentType || !connectionConfig?.host || !connectionConfig?.database) {
      return NextResponse.json(
        { error: 'Environment type, host, and database are required' },
        { status: 400 }
      );
    }

    // Get the original data agent to copy properties
    const dataAgent = await prisma.dataAgent.findUnique({
      where: { id: dataAgentId }
    });

    if (!dataAgent) {
      return NextResponse.json(
        { error: 'Data agent not found' },
        { status: 404 }
      );
    }

    // Store credentials in vault
    let vaultKey = null;
    let finalConnectionConfig = connectionConfig;
    
    try {
      const { SecretManager } = await import('@/lib/secrets');
      const secretManager = SecretManager.getInstance();
      await secretManager.init();
      
      if (secretManager.hasProvider()) {
        vaultKey = `data-agent-${dataAgentId}-env-${crypto.randomUUID()}-${Date.now()}`;
        
        const credentialsToStore = {
          host: connectionConfig.host,
          port: String(connectionConfig.port || '5432'),
          database: connectionConfig.database,
          username: String(connectionConfig.username || ''),
          password: String(connectionConfig.password || '')
        };
        
        await secretManager.storeCredentials(vaultKey, credentialsToStore);
        
        // Store config without sensitive data
        finalConnectionConfig = {
          host: connectionConfig.host,
          port: String(connectionConfig.port || '5432'),
          database: connectionConfig.database,
          schema: connectionConfig.schema || ''
        };
      }
    } catch (error) {
      console.error('Failed to store credentials in vault:', error);
    }

    // Create environment in the proper Environment table
    // Set initial status based on whether connection was tested during creation
    const initialStatus = connectionTested ? 'ACTIVE' : 'UNKNOWN';
    const initialHealthStatus = connectionTested ? 'HEALTHY' : 'UNKNOWN';
    
    const environment = await prisma.environment.create({
      data: {
        name: environmentType,
        description: description || null,
        status: initialStatus,
        healthStatus: initialHealthStatus,
        environmentType: 'DATA_AGENT', // Set the type to DATA_AGENT
        dataAgentId: dataAgentId,       // Link to the data agent
        connectionConfig: finalConnectionConfig,
        vaultKey,
        lastConnectedAt: connectionTested ? new Date() : null
      }
    });

    return NextResponse.json(environment);
  } catch (error) {
    console.error('Failed to create environment:', error);
    return NextResponse.json(
      { error: 'Failed to create environment' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const dataAgentId = id;

    const environments = await (prisma.environment as any).findMany({
      where: { 
        dataAgentId,
        environmentType: 'DATA_AGENT'
      },
      include: {
        tables: {
          orderBy: { tableName: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(environments);
  } catch (error) {
    console.error('Failed to fetch environments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch environments' },
      { status: 500 }
    );
  }
}
