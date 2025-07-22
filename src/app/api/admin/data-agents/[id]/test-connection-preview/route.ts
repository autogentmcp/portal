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
        return await testSQLServerConnection(connectionConfig, credentials)
      
      case 'bigquery':
        return await testBigQueryConnection(connectionConfig, credentials)
      
      case 'databricks':
        return await testDatabricksConnection(connectionConfig, credentials)
      
      case 'db2':
        return await testDB2Connection(connectionConfig, credentials)
      
      case 'sqlite':
        return await testSQLiteConnection(connectionConfig, credentials)
      
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

async function testMySQLConnection(connectionConfig: any, credentials: any): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const mysql = await import('mysql2/promise')
    
    const connection = await mysql.createConnection({
      host: connectionConfig.host,
      port: parseInt(connectionConfig.port) || 3306,
      database: connectionConfig.database,
      user: credentials.username,
      password: credentials.password,
      connectTimeout: 5000,
      ssl: connectionConfig.ssl === 'true' ? { rejectUnauthorized: false } : undefined
    })
    
    // Test basic query
    const [rows] = await connection.execute('SELECT 1 as test')
    
    await connection.end()
    
    return {
      success: true,
      message: `Successfully connected to MySQL database '${connectionConfig.database}' on ${connectionConfig.host}:${connectionConfig.port || 3306}`
    }
  } catch (error) {
    console.error('MySQL connection error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to MySQL database'
    }
  }
}

async function testSQLServerConnection(connectionConfig: any, credentials: any): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const sql = await import('mssql')
    
    const config = {
      server: connectionConfig.host,
      port: parseInt(connectionConfig.port) || 1433,
      database: connectionConfig.database,
      user: credentials.username,
      password: credentials.password,
      options: {
        encrypt: connectionConfig.ssl === 'true',
        trustServerCertificate: true,
        connectTimeout: 5000,
        requestTimeout: 5000
      }
    }
    
    const pool = new sql.ConnectionPool(config)
    await pool.connect()
    
    // Test basic query
    const result = await pool.request().query('SELECT 1 as test')
    
    await pool.close()
    
    return {
      success: true,
      message: `Successfully connected to SQL Server database '${connectionConfig.database}' on ${connectionConfig.host}:${connectionConfig.port || 1433}`
    }
  } catch (error) {
    console.error('SQL Server connection error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to SQL Server database'
    }
  }
}

async function testBigQueryConnection(connectionConfig: any, credentials: any): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const { BigQuery } = await import('@google-cloud/bigquery')
    
    const bigquery = new BigQuery({
      projectId: connectionConfig.projectId,
      keyFilename: credentials.keyFile, // Path to service account JSON
    })
    
    // Test basic query
    const query = 'SELECT 1 as test'
    const [rows] = await bigquery.query(query)
    
    return {
      success: true,
      message: `Successfully connected to BigQuery project '${connectionConfig.projectId}'`
    }
  } catch (error) {
    console.error('BigQuery connection error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to BigQuery'
    }
  }
}

async function testDB2Connection(connectionConfig: any, credentials: any): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Try to import ibm_db - this is a native module that can be tricky in Next.js
    let ibmdb: any
    try {
      console.log('Attempting to import ibm_db...')
      const ibmdbModule = await import('ibm_db')
      console.log('ibm_db module imported successfully:', typeof ibmdbModule)
      
      // ibm_db exports itself as a function, not an object with methods
      // Check if it's the default export or the module itself
      if (typeof ibmdbModule === 'function') {
        ibmdb = ibmdbModule
      } else if (ibmdbModule.default && typeof ibmdbModule.default === 'function') {
        ibmdb = ibmdbModule.default
      } else if (ibmdbModule.open && typeof ibmdbModule.open === 'function') {
        ibmdb = ibmdbModule
      } else {
        console.error('Unexpected ibm_db module structure:', Object.keys(ibmdbModule))
        return {
          success: false,
          error: 'DB2 driver has unexpected structure. Please check the ibm_db installation.'
        }
      }
      
      console.log('ibm_db configured, type:', typeof ibmdb)
      
      // Check if the main functions exist
      if (!ibmdb || typeof ibmdb.open !== 'function') {
        console.error('ibm_db.open is not a function. Available methods:', Object.keys(ibmdb || {}))
        return {
          success: false,
          error: 'DB2 driver not properly initialized. The ibm_db package may not be correctly installed.'
        }
      }
    } catch (importError) {
      console.error('Failed to import ibm_db:', importError)
      return {
        success: false,
        error: `DB2 driver not available: ${importError instanceof Error ? importError.message : 'Unknown import error'}. Please ensure ibm_db package is properly installed and configured.`
      }
    }
    
    // Build connection string with additional parameters to handle connection issues
    const host = connectionConfig.host === 'localhost' ? '127.0.0.1' : connectionConfig.host;
    const port = connectionConfig.port || 50000;
    
    let connStr = `DATABASE=${connectionConfig.database};HOSTNAME=${host};PORT=${port};PROTOCOL=TCPIP;UID=${credentials.username};PWD=${credentials.password};`
    
    // Add additional connection parameters to help with connectivity issues
    connStr += 'CONNECTTIMEOUT=10;QUERYTIMEOUT=30;'
    
    // Force IPv4 if connecting to localhost to avoid IPv6 issues
    if (host === '127.0.0.1' || host === 'localhost') {
      connStr += 'TCPKEEPALIVE=1;'
    }
    
    console.log(`DB2 connection string created for ${host}:${port} (password hidden)`)
    
    return new Promise((resolve) => {
      // Set a timeout for the connection attempt
      const connectionTimeout = setTimeout(() => {
        console.log('DB2 connection timed out')
        resolve({
          success: false,
          error: `Connection timeout: Unable to connect to DB2 database '${connectionConfig.database}' on ${host}:${port} within 15 seconds. Please check if the server is running and accessible.`
        })
      }, 15000) // 15 second timeout
      
      try {
        ibmdb.open(connStr, (err: any, conn: any) => {
          clearTimeout(connectionTimeout) // Clear timeout on response
          
          if (err) {
            console.error('DB2 connection error:', err)
            
            let errorMessage = err.message || 'Failed to connect to DB2 database'
            
            // Provide specific guidance for common DB2 connection errors
            if (err.message && err.message.includes('SQL30081N')) {
              if (err.message.includes('recv')) {
                errorMessage = `DB2 connection failed (SQL30081N): Cannot establish connection to the database server.

This usually indicates one of the following issues:
1. **DB2 server not running**: The DB2 database server is not started on ${host}:${port}
2. **Wrong port**: DB2 server might be running on a different port (common ports: 50000, 25000, 60000)
3. **Wrong hostname**: The server might be on a different host than '${host}'
4. **Database doesn't exist**: The database '${connectionConfig.database}' might not exist on the server
5. **Firewall blocking**: Network firewall may be blocking port ${port}

To troubleshoot:
- Verify DB2 server is running: db2 list db directory
- Check if port is open: telnet ${host} ${port}
- Verify database exists and is cataloged
- Check DB2 instance and database are started

Original error: ${err.message}`
              } else {
                errorMessage = `DB2 communication error (SQL30081N): Network connectivity issue.

Please verify:
1. Server hostname/IP: ${host}
2. Port number: ${port}  
3. Database name: ${connectionConfig.database}
4. Network connectivity and firewall settings

Original error: ${err.message}`
              }
            } else if (err.message && (err.message.includes('SQL30082N') || err.message.includes('security'))) {
              errorMessage = `DB2 authentication failed: Invalid username or password. Please verify your credentials.

Original error: ${err.message}`
            }
            
            resolve({
              success: false,
              error: errorMessage
            })
          } else {
            // Test basic query
            conn.query('SELECT 1 FROM SYSIBM.SYSDUMMY1', (err2: any, result: any) => {
              conn.close()
              clearTimeout(connectionTimeout) // Clear timeout on successful query
              
              if (err2) {
                resolve({
                  success: false,
                  error: err2.message || 'Failed to query DB2 database'
                })
              } else {
                resolve({
                  success: true,
                  message: `Successfully connected to DB2 database '${connectionConfig.database}' on ${host}:${port}`
                })
              }
            })
          }
        })
      } catch (openError) {
        clearTimeout(connectionTimeout) // Clear timeout on exception
        console.error('DB2 open error:', openError)
        resolve({
          success: false,
          error: `Failed to open DB2 connection: ${openError instanceof Error ? openError.message : 'Unknown error'}. Please check your connection configuration.`
        })
      }
    })
  } catch (error) {
    console.error('DB2 connection error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to DB2 database'
    }
  }
}

async function testSQLiteConnection(connectionConfig: any, credentials: any): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // SQLite is file-based, so we just need to check if the file path is provided
    if (!connectionConfig.filePath) {
      return {
        success: false,
        error: 'SQLite database file path is required'
      }
    }
    
    // For a proper test, we could try to open the file, but for now we'll just validate the path
    return {
      success: true,
      message: `SQLite database connection configured for file: ${connectionConfig.filePath}`
    }
  } catch (error) {
    console.error('SQLite connection error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate SQLite database configuration'
    }
  }
}

async function testDatabricksConnection(config: any, credentials: any): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const serverHostname = config.serverHostname || config.host;
    const httpPath = config.httpPath;
    const accessToken = credentials.accessToken || credentials.token;

    if (!serverHostname || !httpPath || !accessToken) {
      return {
        success: false,
        error: 'Missing required Databricks connection parameters (serverHostname, httpPath, accessToken)'
      };
    }

    // Test connection using Databricks REST API
    const response = await fetch(`https://${serverHostname}/api/2.0/clusters/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return {
        success: true,
        message: 'Databricks connection successful'
      };
    } else {
      return {
        success: false,
        error: `Databricks API request failed: ${response.statusText}`
      };
    }
  } catch (error) {
    console.error('Databricks connection error:', error);
    return {
      success: false,
      message: 'Databricks connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
