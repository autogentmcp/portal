import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/admin/data-agents/[id]/tables/available - Get available tables from data source
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get data agent
    const dataAgent = await prisma.dataAgent.findUnique({
      where: { id },
    });

    if (!dataAgent) {
      return NextResponse.json({ error: 'Data agent not found' }, { status: 404 });
    }

    // Get credentials from vault
    let credentials = null;
    if (dataAgent.vaultKey) {
      try {
        const { SecretManager } = await import('@/lib/secrets');
        const secretManager = SecretManager.getInstance();
        await secretManager.init();
        
        if (secretManager.hasProvider()) {
          credentials = await secretManager.getCredentials(dataAgent.vaultKey);
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to retrieve connection credentials' },
          { status: 500 }
        );
      }
    }

    // Get available tables based on connection type
    const tables = await getAvailableTables(
      dataAgent.connectionType,
      dataAgent.connectionConfig,
      credentials
    );

    return NextResponse.json(tables);
  } catch (error) {
    console.error('Error fetching available tables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available tables' },
      { status: 500 }
    );
  }
}

// Helper function to get available tables from different data sources
async function getAvailableTables(
  connectionType: string,
  connectionConfig: any,
  credentials: any
): Promise<Array<{ name: string; description?: string; rowCount?: number; schema?: string }>> {
  
  try {
    switch (connectionType.toLowerCase()) {
      case 'postgres':
      case 'postgresql':
        return await getPostgresTables(connectionConfig, credentials);
      
      case 'mysql':
        return await getMySQLTables(connectionConfig, credentials);
      
      case 'mssql':
      case 'sqlserver':
        return await getMSSQLTables(connectionConfig, credentials);
      
      case 'bigquery':
        return await getBigQueryTables(connectionConfig, credentials);
      
      case 'databricks':
        return await getDatabricksTables(connectionConfig, credentials);
      
      case 'db2':
        return await getDB2Tables(connectionConfig, credentials);
      
      default:
        throw new Error(`Connection type '${connectionType}' is not supported`);
    }
  } catch (error) {
    console.error('Error getting available tables:', error);
    throw error;
  }
}

// PostgreSQL tables
async function getPostgresTables(config: any, credentials: any) {
  const { Client } = require('pg');
  
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
    connectionTimeoutMillis: (config.connectionTimeout || 30) * 1000,
  });

  try {
    await client.connect();
    
    // First check what schemas are available to this user
    const schemaQuery = `SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast') ORDER BY schema_name`;
    const schemaResult = await client.query(schemaQuery);
    
    // If no user schemas found, provide helpful error message
    if (schemaResult.rows.length === 0) {
      console.log('[ERROR] User has no access to any schemas. This indicates a permissions issue.');
      console.log('[SOLUTION] Grant permissions with: GRANT USAGE ON SCHEMA public TO ' + (credentials?.username || credentials?.user) + '; GRANT SELECT ON ALL TABLES IN SCHEMA public TO ' + (credentials?.username || credentials?.user) + ';');
      
      // Return a helpful error message instead of empty array
      return [{
        name: 'PERMISSION_ERROR',
        schema: 'system',
        description: `Database user '${credentials?.username || credentials?.user}' lacks permissions to access schemas. Contact your database administrator to grant: GRANT USAGE ON SCHEMA public TO ${credentials?.username || credentials?.user}; GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${credentials?.username || credentials?.user};`,
        rowCount: 0,
      }];
    }
    
    const query = `
      SELECT 
        t.table_name as name,
        t.table_schema as schema,
        obj_description(c.oid) as description,
        s.n_tup_ins + s.n_tup_upd + s.n_tup_del as row_count
      FROM information_schema.tables t
      LEFT JOIN pg_class c ON c.relname = t.table_name
      LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
      WHERE t.table_type = 'BASE TABLE' 
        AND t.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY t.table_schema, t.table_name
    `;
    
    const result = await client.query(query);
    
    return result.rows.map((row: any) => ({
      name: row.name,
      schema: row.schema,
      description: row.description,
      rowCount: row.row_count ? parseInt(row.row_count) : undefined,
    }));
  } finally {
    await client.end();
  }
}

// MySQL tables
async function getMySQLTables(config: any, credentials: any) {
  const mysql = require('mysql2/promise');
  
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
    connectTimeout: (config.connectionTimeout || 30) * 1000,
  });

  try {
    const [rows] = await connection.execute(`
      SELECT 
        TABLE_NAME as name,
        TABLE_COMMENT as description,
        TABLE_ROWS as row_count,
        TABLE_SCHEMA as schema
      FROM information_schema.tables 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `, [config.database]);
    
    return (rows as any[]).map(row => ({
      name: row.name,
      schema: row.schema,
      description: row.description || undefined,
      rowCount: row.row_count ? parseInt(row.row_count) : undefined,
    }));
  } finally {
    await connection.end();
  }
}

// MSSQL tables
async function getMSSQLTables(config: any, credentials: any) {
  const sql = require('mssql');
  
  const poolConfig = {
    server: config.server || config.host,
    port: config.port || 1433,
    database: config.database,
    user: credentials?.username || credentials?.user,
    password: credentials?.password,
    options: {
      encrypt: config.encrypt !== false,
      trustServerCertificate: config.trustServerCertificate || false,
      enableArithAbort: true,
      instanceName: config.instance || undefined,
    },
    connectionTimeout: 10000,
    requestTimeout: 10000,
  };

  const pool = await sql.connect(poolConfig);
  
  try {
    const result = await pool.request().query(`
      SELECT 
        t.TABLE_NAME as name,
        t.TABLE_SCHEMA as schema,
        ep.value as description,
        p.rows as row_count
      FROM INFORMATION_SCHEMA.TABLES t
      LEFT JOIN sys.tables st ON st.name = t.TABLE_NAME
      LEFT JOIN sys.partitions p ON p.object_id = st.object_id AND p.index_id IN (0,1)
      LEFT JOIN sys.extended_properties ep ON ep.major_id = st.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
      WHERE t.TABLE_TYPE = 'BASE TABLE'
      ORDER BY t.TABLE_SCHEMA, t.TABLE_NAME
    `);
    
    return result.recordset.map((row: any) => ({
      name: row.name,
      schema: row.schema,
      description: row.description,
      rowCount: row.row_count ? parseInt(row.row_count) : undefined,
    }));
  } finally {
    await pool.close();
  }
}

// BigQuery tables
async function getBigQueryTables(config: any, credentials: any) {
  const { BigQuery } = require('@google-cloud/bigquery');
  
  const bigquery = new BigQuery({
    projectId: config.projectId,
    keyFilename: credentials?.serviceAccountPath,
    credentials: credentials?.serviceAccountJson ? JSON.parse(credentials.serviceAccountJson) : undefined,
  });

  const datasets = await bigquery.getDatasets();
  const tables: any[] = [];
  
  for (const dataset of datasets[0]) {
    const [datasetTables] = await dataset.getTables();
    
    for (const table of datasetTables) {
      const [metadata] = await table.getMetadata();
      
      tables.push({
        name: metadata.tableReference.tableId,
        schema: metadata.tableReference.datasetId,
        description: metadata.description,
        rowCount: metadata.numRows ? parseInt(metadata.numRows) : undefined,
      });
    }
  }
  
  return tables;
}

// Databricks tables
async function getDatabricksTables(config: any, credentials: any) {
  // This would require the Databricks SQL connector or REST API
  // For now, return a placeholder implementation
  try {
    const fetch = require('node-fetch');
    
    const response = await fetch(`${config.serverHostname}/api/2.0/sql/warehouses`, {
      headers: {
        'Authorization': `Bearer ${credentials?.accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // This is a simplified implementation - would need proper SQL execution
    return [
      { name: 'sample_table', description: 'Sample table from Databricks', schema: 'default' }
    ];
  } catch (error) {
    throw new Error(`Failed to fetch Databricks tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// IBM DB2 tables
async function getDB2Tables(config: any, credentials: any): Promise<Array<{ name: string; description?: string; rowCount?: number; schema?: string }>> {
  try {
    const ibmdb = require('ibm_db');
    
    const connectionString = `DATABASE=${config.database};HOSTNAME=${config.hostname || config.host};PORT=${config.port || 50000};PROTOCOL=TCPIP;UID=${credentials?.username || credentials?.user};PWD=${credentials?.password};`;
    
    return new Promise((resolve, reject) => {
      ibmdb.open(connectionString, (err: any, conn: any) => {
        if (err) {
          reject(new Error(`Failed to connect to DB2: ${err.message}`));
          return;
        }
        
        // Query to get all tables
        const query = `
          SELECT 
            TABNAME as name,
            TABSCHEMA as schema,
            REMARKS as description,
            CARD as rowCount
          FROM SYSCAT.TABLES 
          WHERE TABSCHEMA NOT IN ('SYSIBM', 'SYSCAT', 'SYSSTAT', 'SYSPROC', 'SYSIBMADM')
          AND TYPE = 'T'
          ORDER BY TABSCHEMA, TABNAME
        `;
        
        conn.query(query, (err: any, results: any) => {
          conn.close(() => {});
          
          if (err) {
            reject(new Error(`Failed to fetch DB2 tables: ${err.message}`));
            return;
          }
          
          const tables = results.map((row: any) => ({
            name: row.NAME,
            schema: row.SCHEMA,
            description: row.DESCRIPTION || undefined,
            rowCount: row.ROWCOUNT || undefined
          }));
          
          resolve(tables);
        });
      });
    });
  } catch (error) {
    throw new Error(`Failed to fetch DB2 tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


