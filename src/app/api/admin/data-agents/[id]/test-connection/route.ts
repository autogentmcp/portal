import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// POST /api/admin/data-agents/[id]/test-connection - Test data agent connection
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

    // Get data agent
    const dataAgent = await prisma.dataAgent.findUnique({
      where: { id }
    })

    if (!dataAgent) {
      return NextResponse.json({ error: 'Data agent not found' }, { status: 404 })
    }

    // Get credentials from vault
    let credentials = null
    if (dataAgent.vaultKey) {
      try {
        const { SecretManager } = await import('@/lib/secrets')
        const secretManager = SecretManager.getInstance()
        await secretManager.init()
        
        if (secretManager.hasProvider()) {
          credentials = await secretManager.getCredentials(dataAgent.vaultKey)
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
      dataAgent.connectionConfig, 
      credentials
    )

    if (connectionResult.success) {
      // Update data agent status
      await prisma.dataAgent.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          lastConnectedAt: new Date()
        }
      })
    } else {
      await prisma.dataAgent.update({
        where: { id },
        data: {
          status: 'ERROR'
        }
      })
    }

    return NextResponse.json(connectionResult)
  } catch (error) {
    console.error('Error testing connection')
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
): Promise<{ success: boolean; message: string; error?: string }> {
  
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
      
      case 'bigquery':
        return await testBigQueryConnection(connectionConfig, credentials)
      
      case 'databricks':
        return await testDatabricksConnection(connectionConfig, credentials)
      
      case 'db2':
        return await testDB2Connection(connectionConfig, credentials)
      
      default:
        return {
          success: false,
          message: `Connection type '${connectionType}' is not supported yet`,
          error: 'UNSUPPORTED_TYPE'
        }
    }
  } catch (error) {
    return {
      success: false,
      message: 'Connection test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// PostgreSQL connection test
async function testPostgresConnection(config: any, credentials: any) {
  try {
    const { Client } = require('pg')
    
    const client = new Client({
      host: config.host,
      port: config.port || 5432,
      database: config.database,
      user: credentials?.username || credentials?.user,
      password: credentials?.password,
      ssl: config.ssl || false,
      connectionTimeoutMillis: 5000,
    })

    await client.connect()
    await client.query('SELECT 1')
    await client.end()

    return {
      success: true,
      message: 'PostgreSQL connection successful'
    }
  } catch (error) {
    return {
      success: false,
      message: 'PostgreSQL connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// MySQL connection test
async function testMySQLConnection(config: any, credentials: any) {
  try {
    const mysql = require('mysql2/promise')
    
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port || 3306,
      database: config.database,
      user: credentials?.username || credentials?.user,
      password: credentials?.password,
      ssl: config.ssl || false,
      connectTimeout: 5000,
    })

    await connection.execute('SELECT 1')
    await connection.end()

    return {
      success: true,
      message: 'MySQL connection successful'
    }
  } catch (error) {
    return {
      success: false,
      message: 'MySQL connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// MSSQL connection test
async function testMSSQLConnection(config: any, credentials: any) {
  try {
    const sql = require('mssql')
    
    const poolConfig = {
      server: config.server || config.host,
      port: config.port || 1433,
      database: config.database,
      user: credentials?.username || credentials?.user,
      password: credentials?.password,
      options: {
        encrypt: config.encrypt !== false, // Use encryption by default
        trustServerCertificate: config.trustServerCertificate || false,
        enableArithAbort: true,
        instanceName: config.instance || undefined,
      },
      connectionTimeout: 5000,
      requestTimeout: 5000,
    }

    const pool = await sql.connect(poolConfig)
    const result = await pool.request().query('SELECT 1 as test')
    await pool.close()

    return {
      success: true,
      message: 'Microsoft SQL Server connection successful'
    }
  } catch (error) {
    return {
      success: false,
      message: 'Microsoft SQL Server connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// BigQuery connection test
async function testBigQueryConnection(config: any, credentials: any) {
  try {
    const { BigQuery } = require('@google-cloud/bigquery')
    
    const bigquery = new BigQuery({
      projectId: config.projectId,
      keyFilename: credentials?.serviceAccountPath,
      credentials: credentials?.serviceAccountJson ? JSON.parse(credentials.serviceAccountJson) : undefined,
    })

    // Test with a simple query
    const query = 'SELECT 1 as test'
    const [rows] = await bigquery.query({ query, dryRun: true })

    return {
      success: true,
      message: 'BigQuery connection successful'
    }
  } catch (error) {
    return {
      success: false,
      message: 'BigQuery connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Databricks connection test
async function testDatabricksConnection(config: any, credentials: any) {
  try {
    // This would require the Databricks SQL connector
    // For now, we'll implement a basic HTTP API test
    const fetch = require('node-fetch')
    
    const response = await fetch(`${config.serverHostname}/api/2.0/clusters/list`, {
      headers: {
        'Authorization': `Bearer ${credentials?.accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    })

    if (response.ok) {
      return {
        success: true,
        message: 'Databricks connection successful'
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    return {
      success: false,
      message: 'Databricks connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// IBM DB2 connection test
async function testDB2Connection(config: any, credentials: any): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    // Using ibm_db package for DB2 connectivity
    const ibmdb = require('ibm_db')
    
    const connectionString = `DATABASE=${config.database};HOSTNAME=${config.hostname || config.host};PORT=${config.port || 50000};PROTOCOL=TCPIP;UID=${credentials?.username || credentials?.user};PWD=${credentials?.password};`
    
    return new Promise((resolve) => {
      ibmdb.open(connectionString, (err: any, conn: any) => {
        if (err) {
          resolve({
            success: false,
            message: 'IBM DB2 connection failed',
            error: err.message || 'Unknown error'
          })
        } else {
          // Test with a simple query
          conn.query('SELECT 1 FROM SYSIBM.SYSDUMMY1', (err: any, result: any) => {
            conn.close(() => {})
            
            if (err) {
              resolve({
                success: false,
                message: 'IBM DB2 query test failed',
                error: err.message || 'Unknown error'
              })
            } else {
              resolve({
                success: true,
                message: 'IBM DB2 connection successful'
              })
            }
          })
        }
      })
    })
  } catch (error) {
    return {
      success: false,
      message: 'IBM DB2 connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}


