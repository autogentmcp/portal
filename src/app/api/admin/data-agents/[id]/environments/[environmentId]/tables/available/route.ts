import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/admin/data-agents/[id]/environments/[environmentId]/tables/available - Get available tables from database
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

    // Get credentials from vault
    let credentials = null;
    if (environment.vaultKey) {
      try {
        const { SecretManager } = await import('@/lib/secrets');
        const secretManager = SecretManager.getInstance();
        await secretManager.init();
        
        if (secretManager.hasProvider()) {
          credentials = await secretManager.getCredentials(environment.vaultKey);
          console.log('Retrieved credentials from vault:', credentials ? 'Present' : 'Missing');
          
          // Ensure password is a string
          if (credentials && credentials.password && typeof credentials.password !== 'string') {
            console.log('Converting password to string');
            credentials.password = String(credentials.password);
          }
        }
      } catch (error) {
        console.error('Error retrieving credentials from vault:', error);
        return NextResponse.json(
          { error: 'Failed to retrieve connection credentials' },
          { status: 500 }
        );
      }
    }

    // Get available tables based on connection type
    console.log(`Fetching tables for connection type: ${dataAgent.connectionType}`);
    let tables = [];
    if (dataAgent.connectionType === 'postgresql') {
      tables = await getPostgreSQLTables(environment.connectionConfig, credentials);
    } else if (dataAgent.connectionType === 'db2') {
      console.log('DEBUG: Starting DB2 table discovery...');
      tables = await getDB2Tables(environment.connectionConfig, credentials);
      console.log(`DEBUG: DB2 table discovery returned ${tables.length} tables`);
      if (tables.length > 0) {
        console.log('DEBUG: Sample table names:', tables.slice(0, 3).map(t => t.name));
      } else {
        console.log('DEBUG: No tables returned from DB2 query');
      }
    } else if (dataAgent.connectionType === 'mysql') {
      tables = await getMySQLTables(environment.connectionConfig, credentials);
    } else if (dataAgent.connectionType === 'mssql' || dataAgent.connectionType === 'sqlserver') {
      tables = await getSQLServerTables(environment.connectionConfig, credentials);
    } else if (dataAgent.connectionType === 'bigquery') {
      tables = await getBigQueryTables(environment.connectionConfig, credentials);
    } else if (dataAgent.connectionType === 'databricks') {
      tables = await getDatabricksTables(environment.connectionConfig, credentials);
    } else {
      return NextResponse.json(
        { error: `Connection type '${dataAgent.connectionType}' is not supported yet for table discovery` },
        { status: 400 }
      );
    }

    console.log(`Tables fetched for ${dataAgent.connectionType}:`, tables.length, 'tables');
    return NextResponse.json(tables);
  } catch (error) {
    console.error('Error fetching available tables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available tables' },
      { status: 500 }
    );
  }
}

async function getDB2Tables(connectionConfig: any, credentials: any): Promise<any[]> {
  console.log('DB2 getDB2Tables called with config:', {
    host: connectionConfig.host,
    port: connectionConfig.port,
    database: connectionConfig.database,
    hasCredentials: !!(credentials?.username && credentials?.password)
  });
  
  try {
    // Try to import ibm_db
    let ibmdb: any
    try {
      const ibmdbModule = await import('ibm_db')
      
      if (typeof ibmdbModule === 'function') {
        ibmdb = ibmdbModule
      } else if (ibmdbModule.default && typeof ibmdbModule.default === 'function') {
        ibmdb = ibmdbModule.default
      } else if (ibmdbModule.open && typeof ibmdbModule.open === 'function') {
        ibmdb = ibmdbModule
      } else {
        throw new Error('ibm_db module has unexpected structure')
      }
    } catch (importError) {
      console.warn('DB2 driver not available:', importError instanceof Error ? importError.message : 'Unknown import error');
      return []; // Return empty array when driver not available
    }

    // Build connection string
    const host = connectionConfig.host === 'localhost' ? '127.0.0.1' : connectionConfig.host;
    const port = connectionConfig.port || 50000;
    const connStr = `DATABASE=${connectionConfig.database};HOSTNAME=${host};PORT=${port};PROTOCOL=TCPIP;UID=${credentials.username};PWD=${credentials.password};CONNECTTIMEOUT=10;QUERYTIMEOUT=30;`
    console.log('DB2 connection string built (password hidden)');
    
    return new Promise<any[]>((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        console.warn('DB2 connection timeout: Unable to connect within 15 seconds. Returning empty table list.');
        resolve([]); // Return empty array instead of rejecting
      }, 15000)
      
      try {
        console.log('Attempting DB2 connection...');
        ibmdb.open(connStr, (err: any, conn: any) => {
          clearTimeout(connectionTimeout)
          
          if (err) {
            console.warn(`DB2 connection failed: ${err.message || 'Unknown error'}. Returning empty table list.`);
            resolve([]); // Return empty array instead of rejecting
            return
          }
          
          console.log('DB2 connection successful! Querying tables...');
          
          // Query to get tables information - will get accurate row counts for tables with CARD = -1
          const query = `
            SELECT 
              t.TABNAME as table_name,
              t.TABSCHEMA as table_schema,
              t.CARD as estimated_rows,
              t.REMARKS as table_comment
            FROM SYSCAT.TABLES t
            WHERE t.TABSCHEMA NOT IN ('SYSIBM', 'SYSCAT', 'SYSSTAT', 'SYSTOOLS', 'SYSPROC', 'SYSIBMADM', 'SYSFUN', 'SYSIBMINTERNAL', 'SYSIBMTS')
              AND t.TYPE = 'T'
            ORDER BY t.TABSCHEMA, t.TABNAME
          `
          
          console.log('Executing DB2 query:', query);
          
          conn.query(query, async (queryErr: any, result: any) => {
            if (queryErr) {
              conn.close()
              console.error(`DB2 query failed: ${queryErr.message || 'Unknown error'}`);
              console.error('Query error details:', queryErr);
              resolve([]); // Return empty array instead of rejecting
              return
            }
            
            console.log(`DB2 query successful! Found ${result?.length || 0} rows`);
            console.log('Raw DB2 result sample:', result?.slice(0, 3)); // Log first 3 rows
            
            // Debug: Check what properties are available in the first row
            if (result && result.length > 0) {
              console.log('First row keys:', Object.keys(result[0]));
              console.log('First row values:', result[0]);
            }
            
            // Get accurate row counts for tables where CARD is -1
            const tablesWithCounts = await Promise.all(
              result.map(async (row: any) => {
                const tableName = row.TABNAME || row.table_name || row.TABLE_NAME;
                const schemaName = row.TABSCHEMA || row.table_schema || row.TABLE_SCHEMA;
                let rowCount = parseInt(row.CARD || row.estimated_rows || row.ESTIMATED_ROWS) || 0;
                
                // If CARD is -1 (no statistics), get actual count
                if (rowCount < 0) {
                  try {
                    console.log(`Getting actual row count for ${schemaName}.${tableName}...`);
                    const countQuery = `SELECT COUNT(*) as row_count FROM "${schemaName}"."${tableName}"`;
                    const countResult = await new Promise((countResolve) => {
                      conn.query(countQuery, (countErr: any, countRes: any) => {
                        if (countErr) {
                          console.warn(`Count query failed for ${schemaName}.${tableName}: ${countErr.message}`);
                          countResolve(0);
                        } else {
                          const actualCount = countRes?.[0]?.ROW_COUNT || countRes?.[0]?.row_count || 0;
                          console.log(`Actual row count for ${schemaName}.${tableName}: ${actualCount}`);
                          countResolve(actualCount);
                        }
                      });
                    });
                    rowCount = parseInt(countResult as string) || 0;
                  } catch (countError) {
                    console.warn(`Failed to get row count for ${schemaName}.${tableName}:`, countError);
                    rowCount = 0;
                  }
                }
                
                return {
                  name: tableName,
                  schema: schemaName,
                  rowCount: rowCount,
                  description: row.REMARKS || row.table_comment || row.TABLE_COMMENT || ''
                };
              })
            );
            
            conn.close()
            
            console.log(`Processed DB2 tables:`, tablesWithCounts.slice(0, 3)); // Log first 3 processed tables
            console.log(`Total DB2 tables found: ${tablesWithCounts.length}`);
            
            resolve(tablesWithCounts)
          })
        })
      } catch (openError) {
        clearTimeout(connectionTimeout)
        console.error(`Failed to open DB2 connection: ${openError instanceof Error ? openError.message : 'Unknown error'}`);
        resolve([]); // Return empty array instead of rejecting
      }
    })
  } catch (error) {
    console.warn('DB2 tables fetch error:', error instanceof Error ? error.message : 'Unknown error');
    return []; // Return empty array on any error
  }
}

async function getMySQLTables(connectionConfig: any, credentials: any): Promise<any[]> {
  try {
    const mysql = await import('mysql2/promise')
    
    // Handle SSL configuration based on sslMode
    let sslConfig: any = false;
    if (connectionConfig.sslMode && connectionConfig.sslMode !== 'disable') {
      if (connectionConfig.sslMode === 'require') {
        sslConfig = true;
      } else {
        sslConfig = {
          mode: connectionConfig.sslMode,
          rejectUnauthorized: connectionConfig.sslMode === 'verify-full'
        };
      }
    }
    
    const connection = await mysql.createConnection({
      host: connectionConfig.host,
      port: parseInt(connectionConfig.port) || 3306,
      database: connectionConfig.database,
      user: credentials.username,
      password: credentials.password,
      connectTimeout: (connectionConfig.connectionTimeout || 30) * 1000,
      ssl: sslConfig
    })
    
    // Query to get tables information
    const [rows] = await connection.execute(`
      SELECT 
        TABLE_NAME as table_name,
        TABLE_SCHEMA as table_schema,
        TABLE_ROWS as estimated_rows,
        TABLE_COMMENT as table_comment
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ?
        AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `, [connectionConfig.database])
    
    await connection.end()
    
    return (rows as any[]).map(row => ({
      name: row.table_name,
      schema: row.table_schema,
      rowCount: parseInt(row.estimated_rows) || 0,
      description: row.table_comment
    }))
  } catch (error) {
    console.warn('MySQL tables fetch error:', error instanceof Error ? error.message : 'Unknown error');
    return []; // Return empty array on any error
  }
}

async function getSQLServerTables(connectionConfig: any, credentials: any): Promise<any[]> {
  try {
    const sql = await import('mssql')
    
    const config = {
      server: connectionConfig.host,
      port: parseInt(connectionConfig.port) || 1433,
      database: connectionConfig.database,
      user: credentials.username,
      password: credentials.password,
      options: {
        encrypt: connectionConfig.encrypt !== false,
        trustServerCertificate: connectionConfig.trustServerCertificate || false,
        enableArithAbort: true,
        instanceName: connectionConfig.instance || undefined,
        ...(connectionConfig.applicationName && { appName: connectionConfig.applicationName }),
      },
      connectionTimeout: (connectionConfig.connectionTimeout || 30) * 1000,
      requestTimeout: (connectionConfig.connectionTimeout || 30) * 1000
    }
    
    const pool = new sql.ConnectionPool(config)
    await pool.connect()
    
    // Query to get tables information
    const result = await pool.request().query(`
      SELECT 
        t.TABLE_NAME as table_name,
        t.TABLE_SCHEMA as table_schema,
        p.rows as estimated_rows,
        ep.value as table_comment
      FROM INFORMATION_SCHEMA.TABLES t
      LEFT JOIN sys.tables st ON st.name = t.TABLE_NAME
      LEFT JOIN sys.partitions p ON st.object_id = p.object_id AND p.index_id < 2
      LEFT JOIN sys.extended_properties ep ON st.object_id = ep.major_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
      WHERE t.TABLE_TYPE = 'BASE TABLE'
        AND t.TABLE_SCHEMA NOT IN ('sys', 'information_schema')
      ORDER BY t.TABLE_SCHEMA, t.TABLE_NAME
    `)
    
    await pool.close()
    
    return result.recordset.map((row: any) => ({
      name: row.table_name,
      schema: row.table_schema,
      rowCount: parseInt(row.estimated_rows) || 0,
      description: row.table_comment
    }))
  } catch (error) {
    console.warn('SQL Server tables fetch error:', error instanceof Error ? error.message : 'Unknown error');
    return []; // Return empty array on any error
  }
}

async function getPostgreSQLTables(connectionConfig: any, credentials: any): Promise<any[]> {
  try {
    const { Client } = await import('pg');
    
    // Ensure credentials are properly formatted
    const user = credentials?.username || credentials?.user;
    const password = credentials?.password;
    
    // Validate that we have required credentials
    if (!user || !password) {
      throw new Error('Missing database credentials (username or password)');
    }
    
    // Ensure password is a string
    const passwordStr = typeof password === 'string' ? password : String(password);
    
    console.log('Connecting to PostgreSQL with:', {
      host: connectionConfig.host,
      port: connectionConfig.port,
      database: connectionConfig.database,
      user: user,
      passwordPresent: !!passwordStr
    });
    
    // Handle SSL configuration based on sslMode
    let sslConfig: any = false;
    if (connectionConfig.sslMode && connectionConfig.sslMode !== 'disable') {
      sslConfig = { mode: connectionConfig.sslMode };
      // For require mode, just enable SSL
      if (connectionConfig.sslMode === 'require') {
        sslConfig = true;
      }
    }
    
    const config = {
      host: connectionConfig.host,
      port: parseInt(connectionConfig.port) || 5432,
      database: connectionConfig.database,
      user: user,
      password: passwordStr,
      connectionTimeoutMillis: (connectionConfig.connectionTimeout || 30) * 1000,
      ssl: sslConfig
    };

    const client = new Client(config);
    await client.connect();

    const schema = connectionConfig.schema || 'public';
    
    // Get tables with column information
    const query = `
      SELECT 
        t.table_name,
        t.table_schema,
        COALESCE(pg_stat_user_tables.n_tup_ins + pg_stat_user_tables.n_tup_upd + pg_stat_user_tables.n_tup_del, 0) as estimated_rows,
        obj_description(c.oid, 'pg_class') as table_comment
      FROM information_schema.tables t
      LEFT JOIN pg_class c ON c.relname = t.table_name
      LEFT JOIN pg_stat_user_tables ON pg_stat_user_tables.relname = t.table_name
      WHERE t.table_schema = $1
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `;

    const result = await client.query(query, [schema]);
    await client.end();

    return result.rows.map(row => ({
      name: row.table_name,
      schema: row.table_schema,
      rowCount: parseInt(row.estimated_rows) || 0,
      description: row.table_comment
    }));
  } catch (error) {
    console.warn('PostgreSQL tables fetch error:', error instanceof Error ? error.message : 'Unknown error');
    return []; // Return empty array on any error
  }
}

async function getBigQueryTables(connectionConfig: any, credentials: any): Promise<any[]> {
  try {
    const { BigQuery } = await import('@google-cloud/bigquery');
    
    console.log('=== BigQuery Tables Debug ===');
    console.log('ConnectionConfig:', JSON.stringify(connectionConfig, null, 2));
    console.log('Credentials keys:', Object.keys(credentials || {}));
    
    // For BigQuery, the credentials should include serviceAccountJson
    let bigqueryConfig: any = {
      projectId: connectionConfig.projectId || credentials?.projectId,
    };

    // Handle service account JSON - it could be in config or credentials
    const serviceAccountJson = connectionConfig.serviceAccountJson || credentials?.serviceAccountJson;
    
    if (serviceAccountJson) {
      try {
        // Parse the service account JSON if it's a string
        const parsedCredentials = typeof serviceAccountJson === 'string' 
          ? JSON.parse(serviceAccountJson) 
          : serviceAccountJson;
        
        bigqueryConfig.credentials = parsedCredentials;
        console.log('BigQuery config set with credentials for tables');
      } catch (parseError) {
        console.error('JSON parsing error in tables:', parseError);
        return [];
      }
    } else if (credentials?.serviceAccountKey) {
      // Legacy support for serviceAccountKey
      const serviceAccount = JSON.parse(credentials.serviceAccountKey);
      bigqueryConfig.credentials = serviceAccount;
      console.log('BigQuery config set with legacy serviceAccountKey');
    } else if (credentials?.keyFile) {
      bigqueryConfig.keyFilename = credentials.keyFile;
      console.log('BigQuery config set with keyFilename for tables');
    } else {
      console.error('No BigQuery credentials found for tables');
      return [];
    }

    const bigquery = new BigQuery(bigqueryConfig);

    // Check for dataset ID in multiple possible fields
    const datasetId = connectionConfig.dataset || connectionConfig.datasetId || connectionConfig.database;
    console.log('Looking for dataset ID in:', {
      dataset: connectionConfig.dataset,
      datasetId: connectionConfig.datasetId,
      database: connectionConfig.database,
      finalDatasetId: datasetId
    });
    
    if (!datasetId) {
      console.warn('No dataset specified for BigQuery tables query. Returning empty table list.');
      return [];
    }

    const dataset = bigquery.dataset(datasetId);
    const [tables] = await dataset.getTables();

    const tableList = await Promise.all(
      tables.map(async (table) => {
        try {
          const [metadata] = await table.getMetadata();
          return {
            name: metadata.tableReference.tableId,
            schema: metadata.tableReference.datasetId,
            rowCount: parseInt(metadata.numRows) || 0,
            description: metadata.description || '',
            type: metadata.type || 'TABLE'
          };
        } catch (error) {
          console.warn(`Failed to get metadata for table ${table.id}:`, error);
          return {
            name: table.id,
            schema: datasetId,
            rowCount: 0,
            description: '',
            type: 'TABLE'
          };
        }
      })
    );

    return tableList.filter(table => table.type === 'TABLE');
  } catch (error) {
    console.warn('BigQuery tables fetch error:', error instanceof Error ? error.message : 'Unknown error');
    return []; // Return empty array on any error
  }
}

async function getDatabricksTables(connectionConfig: any, credentials: any): Promise<any[]> {
  try {
    // Databricks can use SQL connector or REST API
    // For now, we'll use a basic REST API approach
    const serverHostname = connectionConfig.serverHostname || connectionConfig.host;
    const httpPath = connectionConfig.httpPath;
    const accessToken = credentials.accessToken || credentials.token;

    if (!serverHostname || !httpPath || !accessToken) {
      console.warn('Missing required Databricks connection parameters. Returning empty table list.');
      return [];
    }

    const catalog = connectionConfig.catalog || 'hive_metastore';
    const schema = connectionConfig.schema || 'default';

    // Use fetch to query Databricks SQL API
    const query = `SHOW TABLES IN ${catalog}.${schema}`;
    const response = await fetch(`https://${serverHostname}/api/2.0/sql/statements`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        statement: query,
        warehouse_id: connectionConfig.warehouseId
      })
    });

    if (!response.ok) {
      throw new Error(`Databricks API request failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.status?.state === 'SUCCEEDED' && result.result?.data_array) {
      return result.result.data_array.map((row: any[]) => ({
        name: row[1], // table name is usually the second column
        schema: row[0], // database/schema name is usually the first column
        rowCount: 0, // Would need additional queries to get row counts
        description: '',
        type: 'TABLE'
      }));
    }

    return [];
  } catch (error) {
    console.warn('Databricks tables fetch error:', error instanceof Error ? error.message : 'Unknown error');
    return []; // Return empty array on any error
  }
}
