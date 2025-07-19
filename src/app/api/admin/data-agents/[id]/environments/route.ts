import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { name, description, connectionConfig } = await request.json();
    const dataAgentId = params.id;

    if (!name || !connectionConfig?.host || !connectionConfig?.database) {
      return NextResponse.json(
        { error: 'Name, host, and database are required' },
        { status: 400 }
      );
    }

    // Get the original data agent to copy properties
    const dataAgent = await prisma.dataAgent.findUnique({
      where: { id: dataAgentId },
      include: { user: true }
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
        await secretManager.storeCredentials(vaultKey, {
          host: connectionConfig.host,
          port: String(connectionConfig.port || '5432'),
          database: connectionConfig.database,
          username: String(connectionConfig.username || ''),
          password: String(connectionConfig.password || '')
        });
        
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
    const environment = await prisma.environment.create({
      data: {
        name,
        description: description || null,
        status: 'ACTIVE',
        healthStatus: 'HEALTHY',
        environmentType: 'DATA_AGENT',
        dataAgentId,
        connectionConfig: finalConnectionConfig,
        vaultKey,
        lastConnectedAt: new Date()
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
    const dataAgentId = params.id;

    const environments = await prisma.environment.findMany({
      where: { 
        dataAgentId,
        environmentType: 'DATA_AGENT'
      },
      include: {
        dataAgentTables: {
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
