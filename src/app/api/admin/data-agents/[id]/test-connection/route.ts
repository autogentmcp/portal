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

    // Get data agent with its environments
    const dataAgent = await prisma.dataAgent.findUnique({
      where: { id },
      include: {
        // Get associated environments
        environments: {
          where: {
            environmentType: 'DATA_AGENT'
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1 // Get the most recent environment
        }
      }
    })

    if (!dataAgent) {
      return NextResponse.json({ error: 'Data agent not found' }, { status: 404 })
    }

    if (!dataAgent.environments || dataAgent.environments.length === 0) {
      return NextResponse.json({ 
        error: 'No environment configured for this data agent. Please create an environment first.' 
      }, { status: 400 })
    }

    const environment = dataAgent.environments[0]

    // Get credentials from vault using environment's vaultKey
    let credentials = null
    if (environment.vaultKey) {
      try {
        const { SecretManager } = await import('@/lib/secrets')
        const secretManager = SecretManager.getInstance()
        await secretManager.init()
        
        if (secretManager.hasProvider()) {
          credentials = await secretManager.getCredentials(environment.vaultKey)
        }
      } catch (error) {
        console.error('Failed to retrieve credentials:', error)
        return NextResponse.json(
          { error: 'Failed to retrieve connection credentials from vault' },
          { status: 500 }
        )
      }
    }

    if (!credentials) {
      return NextResponse.json(
        { error: 'No credentials found for this data agent. Please reconfigure the environment.' },
        { status: 400 }
      )
    }

    // Test connection using environment's connection config and retrieved credentials
    const connectionResult = await testConnection(
      dataAgent.connectionType, 
      environment.connectionConfig, 
      credentials
    )

    if (connectionResult.success) {
      // Update data agent status
      await prisma.dataAgent.update({
        where: { id },
        data: {
          status: 'ACTIVE'
        }
      })

      // Update environment status and last connected time
      await prisma.environment.update({
        where: { id: environment.id },
        data: {
          status: 'ACTIVE',
          healthStatus: 'HEALTHY',
          lastConnectedAt: new Date()
        }
      })
    } else {
      // Update both data agent and environment status on failure
      await prisma.dataAgent.update({
        where: { id },
        data: {
          status: 'ERROR'
        }
      })

      await prisma.environment.update({
        where: { id: environment.id },
        data: {
          status: 'ERROR',
          healthStatus: 'UNHEALTHY'
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
    
    // Handle SSL configuration based on sslMode
    let sslConfig: any = false;
    if (config.sslMode && config.sslMode !== 'disable') {
      sslConfig = { mode: config.sslMode };
      // For require mode, just enable SSL
      if (config.sslMode === 'require') {
        sslConfig = true;
      }
    }
    
    const client = new Client({
      host: config.host,
      port: config.port || 5432,
      database: config.database,
      user: credentials?.username || credentials?.user,
      password: credentials?.password,
      ssl: sslConfig,
      connectionTimeoutMillis: (config.connectionTimeout || 30) * 1000, // Convert to milliseconds
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
    
    // Handle SSL configuration based on sslMode
    let sslConfig: any = false;
    if (config.sslMode && config.sslMode !== 'disable') {
      if (config.sslMode === 'require') {
        sslConfig = true;
      } else {
        sslConfig = {
          mode: config.sslMode,
          rejectUnauthorized: config.sslMode === 'verify-full'
        };
      }
    }
    
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port || 3306,
      database: config.database,
      user: credentials?.username || credentials?.user,
      password: credentials?.password,
      ssl: sslConfig,
      connectTimeout: (config.connectionTimeout || 30) * 1000, // Convert to milliseconds
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
        ...(config.applicationName && { appName: config.applicationName }),
      },
      connectionTimeout: (config.connectionTimeout || 30) * 1000, // Convert to milliseconds
      requestTimeout: (config.connectionTimeout || 30) * 1000, // Convert to milliseconds
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
    
    console.log('=== BigQuery Connection Debug ===');
    console.log('Config:', JSON.stringify(config, null, 2));
    console.log('Credentials keys:', Object.keys(credentials || {}));
    console.log('Credentials projectId:', credentials?.projectId);
    console.log('Has serviceAccountJson:', !!credentials?.serviceAccountJson);
    console.log('ServiceAccountJson type:', typeof credentials?.serviceAccountJson);
    if (credentials?.serviceAccountJson) {
      console.log('ServiceAccountJson length:', credentials.serviceAccountJson.length);
      console.log('ServiceAccountJson preview:', credentials.serviceAccountJson.substring(0, 100) + '...');
    }
    
    // For BigQuery, the credentials should include serviceAccountJson
    if (!config.projectId) {
      return {
        success: false,
        message: 'BigQuery projectId is required in connection configuration',
        error: 'MISSING_PROJECT_ID'
      };
    }
    
    let bigqueryConfig: any = {
      projectId: config.projectId, // Always use projectId from connection config
    };

    // Handle service account JSON - it could be in config or credentials
    const serviceAccountJson = config.serviceAccountJson || credentials?.serviceAccountJson;
    
    if (serviceAccountJson) {
      try {
        // Parse the service account JSON if it's a string
        const parsedCredentials = typeof serviceAccountJson === 'string' 
          ? JSON.parse(serviceAccountJson) 
          : serviceAccountJson;
        
        console.log('Parsed credentials project_id:', parsedCredentials.project_id);
        console.log('Parsed credentials client_email:', parsedCredentials.client_email);
        console.log('Has private_key:', !!parsedCredentials.private_key);
        
        bigqueryConfig.credentials = parsedCredentials;
        console.log('BigQuery config set with credentials');
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        return {
          success: false,
          message: 'Invalid service account JSON format',
          error: parseError instanceof Error ? parseError.message : 'JSON parsing failed'
        };
      }
    } else if (credentials?.serviceAccountPath) {
      bigqueryConfig.keyFilename = credentials.serviceAccountPath;
      console.log('BigQuery config set with keyFilename');
    } else {
      console.error('No BigQuery credentials found');
      return {
        success: false,
        message: 'BigQuery requires either service account JSON or service account key file path',
        error: 'Missing authentication credentials'
      };
    }

    console.log('Final BigQuery config:', {
      projectId: bigqueryConfig.projectId,
      hasCredentials: !!bigqueryConfig.credentials,
      hasKeyFilename: !!bigqueryConfig.keyFilename
    });

    const bigquery = new BigQuery(bigqueryConfig);

    // Test with a simple query
    const query = 'SELECT 1 as test'
    console.log('Executing BigQuery test query...');
    const [rows] = await bigquery.query({ query, dryRun: true })

    console.log('BigQuery test successful');
    return {
      success: true,
      message: 'BigQuery connection successful'
    }
  } catch (error) {
    console.error('BigQuery connection error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
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
          message: 'IBM DB2 connection failed',
          error: 'DB2 driver has unexpected structure. Please check the ibm_db installation.'
        }
      }
      
      console.log('ibm_db configured, type:', typeof ibmdb)
      
      // Check if the main functions exist
      if (!ibmdb || typeof ibmdb.open !== 'function') {
        console.error('ibm_db.open is not a function. Available methods:', Object.keys(ibmdb || {}))
        return {
          success: false,
          message: 'IBM DB2 connection failed',
          error: 'DB2 driver not properly initialized. The ibm_db package may not be correctly installed.'
        }
      }
    } catch (importError) {
      console.error('Failed to import ibm_db:', importError)
      return {
        success: false,
        message: 'IBM DB2 connection failed',
        error: `DB2 driver not available: ${importError instanceof Error ? importError.message : 'Unknown import error'}. Please ensure ibm_db package is properly installed and configured.`
      }
    }

    // Build connection string with additional parameters to handle connection issues
    const host = config.hostname || config.host;
    const finalHost = host === 'localhost' ? '127.0.0.1' : host;
    const port = config.port || 50000;
    
    let connStr = `DATABASE=${config.database};HOSTNAME=${finalHost};PORT=${port};PROTOCOL=TCPIP;UID=${credentials?.username || credentials?.user};PWD=${credentials?.password};`
    
    // Add additional connection parameters to help with connectivity issues
    connStr += 'CONNECTTIMEOUT=10;QUERYTIMEOUT=30;'
    
    // Force IPv4 if connecting to localhost to avoid IPv6 issues
    if (finalHost === '127.0.0.1' || finalHost === 'localhost') {
      connStr += 'TCPKEEPALIVE=1;'
    }
    
    console.log(`DB2 connection string created for ${finalHost}:${port} (password hidden)`)
    
    return new Promise((resolve) => {
      // Set a timeout for the connection attempt
      const connectionTimeout = setTimeout(() => {
        console.log('DB2 connection timed out')
        resolve({
          success: false,
          message: 'IBM DB2 connection failed',
          error: `Connection timeout: Unable to connect to DB2 database '${config.database}' on ${finalHost}:${port} within 15 seconds. Please check if the server is running and accessible.`
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
1. **DB2 server not running**: The DB2 database server is not started on ${finalHost}:${port}
2. **Wrong port**: DB2 server might be running on a different port (common ports: 50000, 25000, 60000)
3. **Wrong hostname**: The server might be on a different host than '${finalHost}'
4. **Database doesn't exist**: The database '${config.database}' might not exist on the server
5. **Firewall blocking**: Network firewall may be blocking port ${port}

To troubleshoot:
- Verify DB2 server is running: db2 list db directory
- Check if port is open: telnet ${finalHost} ${port}
- Verify database exists and is cataloged
- Check DB2 instance and database are started

Original error: ${err.message}`
              } else {
                errorMessage = `DB2 communication error (SQL30081N): Network connectivity issue.

Please verify:
1. Server hostname/IP: ${finalHost}
2. Port number: ${port}  
3. Database name: ${config.database}
4. Network connectivity and firewall settings

Original error: ${err.message}`
              }
            } else if (err.message && (err.message.includes('SQL30082N') || err.message.includes('security'))) {
              errorMessage = `DB2 authentication failed: Invalid username or password. Please verify your credentials.

Original error: ${err.message}`
            }
            
            resolve({
              success: false,
              message: 'IBM DB2 connection failed',
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
                  message: 'IBM DB2 query test failed',
                  error: err2.message || 'Failed to query DB2 database'
                })
              } else {
                resolve({
                  success: true,
                  message: `Successfully connected to IBM DB2 database '${config.database}' on ${finalHost}:${port}`
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
          message: 'IBM DB2 connection failed',
          error: `Failed to open DB2 connection: ${openError instanceof Error ? openError.message : 'Unknown error'}. Please check your connection configuration.`
        })
      }
    })
  } catch (error) {
    console.error('DB2 connection error:', error)
    return {
      success: false,
      message: 'IBM DB2 connection failed',
      error: error instanceof Error ? error.message : 'Failed to connect to DB2 database'
    }
  }
}


