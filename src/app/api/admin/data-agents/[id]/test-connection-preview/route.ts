import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// POST /api/admin/data-agents/[id]/test-connection-preview - Test connection with provided credentials (for creation preview)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { connectionType, connectionConfig, credentials } = await request.json()

    // Get data agent
    const dataAgent = await prisma.dataAgent.findUnique({
      where: { id }
    })

    if (!dataAgent) {
      return NextResponse.json({ error: 'Data agent not found' }, { status: 404 })
    }

    // Validate required fields
    if (!connectionType || !connectionConfig || !credentials) {
      return NextResponse.json({ 
        error: 'Connection type, config, and credentials are required' 
      }, { status: 400 })
    }

    // Test connection with provided credentials (don't store anything)
    const connectionResult = await testConnection(
      connectionType, 
      connectionConfig, 
      credentials
    )

    return NextResponse.json(connectionResult)
  } catch (error) {
    console.error('Error testing connection preview:', error)
    return NextResponse.json(
      { error: 'Failed to test connection' },
      { status: 500 }
    )
  }
}

// Helper function to test different types of connections
async function testConnection(
  connectionType: string, 
  connectionConfig: any, 
  credentials: any
): Promise<{ success: boolean; message?: string; error?: string }> {
  
  try {
    switch (connectionType.toLowerCase()) {
      case 'postgres':
      case 'postgresql':
        return await testPostgresConnection(connectionConfig, credentials)
      
      case 'mysql':
        return await testMySQLConnection(connectionConfig, credentials)
      
      case 'mssql':
      case 'sqlserver':
        return await testMSSQLConnection(connectionConfig, credentials)
      
      default:
        return {
          success: false,
          error: `Unsupported connection type: ${connectionType}`
        }
    }
  } catch (error) {
    console.error('Connection test error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

async function testPostgresConnection(connectionConfig: any, credentials: any) {
  try {
    const { Client } = await import('pg')
    
    const client = new Client({
      host: connectionConfig.host,
      port: parseInt(connectionConfig.port) || 5432,
      database: connectionConfig.database,
      user: credentials.username,
      password: credentials.password,
      connectionTimeoutMillis: 5000,
      ssl: connectionConfig.ssl === 'true' ? { rejectUnauthorized: false } : false
    })
    
    await client.connect()
    
    // Test basic query
    const result = await client.query('SELECT 1 as test')
    
    await client.end()
    
    return {
      success: true,
      message: `Successfully connected to PostgreSQL database '${connectionConfig.database}' on ${connectionConfig.host}:${connectionConfig.port || 5432}`
    }
  } catch (error) {
    console.error('PostgreSQL connection error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to PostgreSQL database'
    }
  }
}

async function testMySQLConnection(connectionConfig: any, credentials: any) {
  // MySQL connection testing would go here
  return {
    success: false,
    error: 'MySQL connection testing not implemented yet'
  }
}

async function testMSSQLConnection(connectionConfig: any, credentials: any) {
  // SQL Server connection testing would go here
  return {
    success: false,
    error: 'SQL Server connection testing not implemented yet'
  }
}
