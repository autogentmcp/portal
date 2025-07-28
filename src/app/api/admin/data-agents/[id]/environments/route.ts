import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { environmentType, description, customPrompt, connectionConfig, connectionTested } = await request.json();
    const { id } = await params;
    const dataAgentId = id;

    // Get the original data agent to get connection type
    const dataAgent = await prisma.dataAgent.findUnique({
      where: { id: dataAgentId }
    });

    if (!dataAgent) {
      return NextResponse.json(
        { error: 'Data agent not found' },
        { status: 404 }
      );
    }

    // Validate required fields based on connection type
    const connectionType = dataAgent.connectionType?.toLowerCase();
    
    if (!environmentType || !connectionConfig?.database) {
      return NextResponse.json(
        { error: 'Environment type and database are required' },
        { status: 400 }
      );
    }

    // Additional validation for BigQuery
    if (connectionType === 'bigquery') {
      if (!connectionConfig.projectId || !connectionConfig.serviceAccountJson) {
        return NextResponse.json(
          { error: 'Project ID and Service Account JSON are required for BigQuery' },
          { status: 400 }
        );
      }
    } else {
      // For other databases, require host
      if (!connectionConfig.host) {
        return NextResponse.json(
          { error: 'Host is required for this database type' },
          { status: 400 }
        );
      }
    }

    // Store credentials in vault
    let vaultKey = null;
    let finalConnectionConfig = { ...connectionConfig };
    
    try {
      const { SecretManager } = await import('@/lib/secrets');
      const secretManager = SecretManager.getInstance();
      await secretManager.init();
      
      if (secretManager.hasProvider()) {
        vaultKey = `data-agent-${dataAgentId}-env-${crypto.randomUUID()}-${Date.now()}`;
        
        let credentialsToStore;
        
        if (connectionType === 'bigquery') {
          // For BigQuery, store the service account JSON and project info
          credentialsToStore = {
            projectId: connectionConfig.projectId,
            serviceAccountJson: connectionConfig.serviceAccountJson,
            ...(connectionConfig.location && { location: connectionConfig.location })
          };
          
          // Remove sensitive data from config stored in DB
          delete finalConnectionConfig.serviceAccountJson;
        } else {
          // For other databases, store connection credentials
          credentialsToStore = {
            host: connectionConfig.host,
            port: String(connectionConfig.port || getDefaultPort(connectionType)),
            database: connectionConfig.database,
            username: String(connectionConfig.username || ''),
            password: String(connectionConfig.password || ''),
            ...(connectionConfig.schema && { schema: connectionConfig.schema })
          };
          
          // Remove sensitive data from config stored in DB
          delete finalConnectionConfig.username;
          delete finalConnectionConfig.password;
        }
        
        await secretManager.storeCredentials(vaultKey, credentialsToStore);
      }
    } catch (error) {
      console.error('Failed to store credentials in vault:', error);
    }

    // Helper function to get default port
    function getDefaultPort(connectionType: string): string {
      switch (connectionType) {
        case 'postgres':
        case 'postgresql':
          return '5432';
        case 'mysql':
          return '3306';
        case 'mssql':
        case 'sqlserver':
          return '1433';
        case 'db2':
          return '50000';
        default:
          return '5432';
      }
    }

    // Create environment in the proper Environment table
    // Set initial status based on whether connection was tested during creation
    const initialStatus = connectionTested ? 'ACTIVE' : 'UNKNOWN';
    const initialHealthStatus = connectionTested ? 'HEALTHY' : 'UNKNOWN';
    
    const environment = await prisma.environment.create({
      data: {
        name: environmentType,
        description: description || null,
        customPrompt: customPrompt || null,
        status: initialStatus,
        healthStatus: initialHealthStatus,
        environmentType: 'DATA_AGENT', // Set the type to DATA_AGENT
        dataAgentId: dataAgentId,       // Link to the data agent
        connectionConfig: {
          ...finalConnectionConfig,
          // Store additional configuration options
          ...(connectionConfig.sslMode && { sslMode: connectionConfig.sslMode }),
          ...(connectionConfig.encrypt !== undefined && { encrypt: connectionConfig.encrypt }),
          ...(connectionConfig.trustServerCertificate !== undefined && { trustServerCertificate: connectionConfig.trustServerCertificate }),
          ...(connectionConfig.connectionTimeout && { connectionTimeout: connectionConfig.connectionTimeout }),
          ...(connectionConfig.requestTimeout && { requestTimeout: connectionConfig.requestTimeout }),
          ...(connectionConfig.commandTimeout && { commandTimeout: connectionConfig.commandTimeout }),
          ...(connectionConfig.options && { options: connectionConfig.options })
        },
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
