import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// POST /api/admin/data-agents/[id]/environments/[environmentId]/test-connection - Test environment connection
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; environmentId: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, environmentId } = await params

    // Get data agent
    const dataAgent = await prisma.dataAgent.findUnique({
      where: { id }
    })

    if (!dataAgent) {
      return NextResponse.json({ error: 'Data agent not found' }, { status: 404 })
    }

    // Get environment
    const environment = await (prisma.environment as any).findUnique({
      where: { id: environmentId }
    })

    if (!environment || environment.dataAgentId !== id) {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 })
    }

    // Get credentials from vault
    let credentials = null
    if (environment.vaultKey) {
      try {
        const { SecretManager } = await import('@/lib/secrets')
        const secretManager = SecretManager.getInstance()
        await secretManager.init()
        
        if (secretManager.hasProvider()) {
          credentials = await secretManager.getCredentials(environment.vaultKey)
          
          // Ensure password is a string
          if (credentials && credentials.password && typeof credentials.password !== 'string') {
            credentials.password = String(credentials.password)
          }
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to retrieve connection credentials' },
          { status: 500 }
        )
      }
    }

    // Test connection based on connection type
    const connectionResult = await testConnection(
      dataAgent.connectionType, 
      environment.connectionConfig, 
      credentials
    )

    if (connectionResult.success) {
      // Update environment status
      await (prisma.environment as any).update({
        where: { id: environmentId },
        data: { 
          status: 'ACTIVE',
          healthStatus: 'HEALTHY',
          lastConnectedAt: new Date()
        }
      })
    } else {
      // Update environment status to indicate connection failure
      await (prisma.environment as any).update({
        where: { id: environmentId },
        data: { 
          status: 'INACTIVE',
          healthStatus: 'UNHEALTHY'
        }
      })
    }

    return NextResponse.json(connectionResult)
  } catch (error) {
    console.error('Error testing environment connection:', error)
    return NextResponse.json(
      { error: 'Failed to test connection' },
      { status: 500 }
    )
  }
}

async function testConnection(connectionType: string, connectionConfig: any, credentials: any) {
  try {
    if (connectionType === 'postgresql') {
      return await testPostgreSQLConnection(connectionConfig, credentials)
    }
    
    return {
      success: false,
      error: `Connection type '${connectionType}' is not supported yet`
    }
  } catch (error) {
    console.error('Connection test error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

async function testPostgreSQLConnection(connectionConfig: any, credentials: any) {
  try {
    const { Client } = await import('pg')
    
    // Ensure credentials are properly formatted
    const user = credentials?.username || credentials?.user;
    const password = credentials?.password;
    
    // Validate that we have required credentials
    if (!user || !password) {
      throw new Error('Missing database credentials (username or password)');
    }
    
    // Ensure password is a string
    const passwordStr = typeof password === 'string' ? password : String(password);
    
    const config = {
      host: connectionConfig.host,
      port: parseInt(connectionConfig.port) || 5432,
      database: connectionConfig.database,
      user: user,
      password: passwordStr,
      connectionTimeoutMillis: 5000,
      ssl: connectionConfig.ssl === 'true' ? { rejectUnauthorized: false } : false
    }

    const client = new Client(config)
    
    await client.connect()
    
    // Test basic query
    const result = await client.query('SELECT 1 as test')
    
    await client.end()
    
    return {
      success: true,
      message: 'Connection successful',
      details: `Connected to PostgreSQL database '${connectionConfig.database}' on ${connectionConfig.host}:${connectionConfig.port}`
    }
  } catch (error) {
    console.error('PostgreSQL connection error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to PostgreSQL database'
    }
  }
}
