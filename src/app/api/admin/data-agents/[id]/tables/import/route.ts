import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// POST /api/admin/data-agents/[id]/tables/import - Import selected tables
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { tableNames } = body;

    if (!Array.isArray(tableNames) || tableNames.length === 0) {
      return NextResponse.json({ error: 'Table names are required' }, { status: 400 });
    }

    // Get data agent
    const dataAgent = await (prisma.dataAgent as any).findUnique({
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

    // Import tables with their schema information
    const importResults = [];
    
    for (const tableName of tableNames) {
      try {
        const tableInfo = await getTableSchema(
          dataAgent.connectionType,
          dataAgent.connectionConfig,
          credentials,
          tableName
        );

        // Create table record
        const table = await prisma.dataAgentTable.create({
          data: {
            tableName: tableName,
            description: tableInfo.description,
            dataAgentId: id,
            analysisStatus: 'PENDING',
          },
        });

        // Create field records
        await prisma.dataAgentTableColumn.createMany({
          data: tableInfo.fields.map(field => ({
            columnName: field.name,
            dataType: field.dataType,
            isNullable: field.isNullable,
            isPrimaryKey: field.isPrimaryKey,
            comment: field.description,
            isForeignKey: (field as any).isForeignKey || false,
            referencedTable: (field as any).referencedTable || null,
            referencedColumn: (field as any).referencedColumn || null,
            tableId: table.id,
          })),
        });

        importResults.push({
          tableName,
          tableId: table.id,
          fieldCount: tableInfo.fields.length,
          status: 'imported',
        });

      } catch (error) {
        console.error(`Error importing table ${tableName}:`, error);
        importResults.push({
          tableName,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      message: `Imported ${importResults.filter(r => r.status === 'imported').length} of ${tableNames.length} tables`,
      results: importResults,
    });

  } catch (error) {
    console.error('Error importing tables:', error);
    return NextResponse.json(
      { error: 'Failed to import tables' },
      { status: 500 }
    );
  }
}

// Helper function to get table schema information
async function getTableSchema(
  connectionType: string,
  connectionConfig: any,
  credentials: any,
  tableName: string
): Promise<{
  description?: string;
  fields: Array<{
    name: string;
    dataType: string;
    isNullable: boolean;
    isPrimaryKey: boolean;
    description?: string;
  }>;
}> {
  
  try {
    switch (connectionType.toLowerCase()) {
      case 'postgres':
      case 'postgresql':
        return await getPostgresTableSchema(connectionConfig, credentials, tableName);
      
      case 'mysql':
        return await getMySQLTableSchema(connectionConfig, credentials, tableName);
      
      case 'mssql':
      case 'sqlserver':
        return await getMSSQLTableSchema(connectionConfig, credentials, tableName);
      
      case 'bigquery':
        return await getBigQueryTableSchema(connectionConfig, credentials, tableName);
      
      case 'databricks':
        return await getDatabricksTableSchema(connectionConfig, credentials, tableName);
      
      default:
        throw new Error(`Connection type '${connectionType}' is not supported`);
    }
  } catch (error) {
    console.error('Error getting table schema:', error);
    throw error;
  }
}

// PostgreSQL table schema
async function getPostgresTableSchema(config: any, credentials: any, tableName: string) {
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
    
    // Get table comment
    const tableCommentQuery = `
      SELECT obj_description(c.oid) as description
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = $1 AND n.nspname = 'public'
    `;
    const tableResult = await client.query(tableCommentQuery, [tableName]);
    
    // Get column information
    const columnsQuery = `
      SELECT 
        c.column_name as name,
        c.data_type as data_type,
        c.is_nullable = 'YES' as is_nullable,
        CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END as is_primary_key,
        pgd.description
      FROM information_schema.columns c
      LEFT JOIN information_schema.table_constraints tc ON tc.table_name = c.table_name
      LEFT JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name AND kcu.column_name = c.column_name
      LEFT JOIN pg_class pgc ON pgc.relname = c.table_name
      LEFT JOIN pg_description pgd ON pgd.objoid = pgc.oid AND pgd.objsubid = c.ordinal_position
      WHERE c.table_name = $1 AND c.table_schema = 'public'
      ORDER BY c.ordinal_position
    `;
    
    const columnsResult = await client.query(columnsQuery, [tableName]);
    
    return {
      description: tableResult.rows[0]?.description,
      fields: columnsResult.rows.map((row: any) => ({
        name: row.name,
        dataType: row.data_type,
        isNullable: row.is_nullable,
        isPrimaryKey: row.is_primary_key,
        description: row.description,
      })),
    };
  } finally {
    await client.end();
  }
}

// MySQL table schema
async function getMySQLTableSchema(config: any, credentials: any, tableName: string) {
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
    // Get table comment
    const [tableRows] = await connection.execute(`
      SELECT TABLE_COMMENT as description
      FROM information_schema.tables 
      WHERE TABLE_NAME = ? AND TABLE_SCHEMA = ?
    `, [tableName, config.database]);
    
    // Get column information
    const [columnRows] = await connection.execute(`
      SELECT 
        COLUMN_NAME as name,
        DATA_TYPE as data_type,
        IS_NULLABLE = 'YES' as is_nullable,
        COLUMN_KEY = 'PRI' as is_primary_key,
        COLUMN_COMMENT as description
      FROM information_schema.columns
      WHERE TABLE_NAME = ? AND TABLE_SCHEMA = ?
      ORDER BY ORDINAL_POSITION
    `, [tableName, config.database]);
    
    // Get foreign key constraints for this table
    const [fkRows] = await connection.execute(`
      SELECT 
        kcu.COLUMN_NAME,
        kcu.REFERENCED_TABLE_NAME,
        kcu.REFERENCED_COLUMN_NAME,
        rc.CONSTRAINT_NAME
      FROM 
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      INNER JOIN 
        INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc 
        ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
      WHERE 
        kcu.TABLE_SCHEMA = ? AND
        kcu.TABLE_NAME = ? AND
        kcu.REFERENCED_TABLE_NAME IS NOT NULL
    `, [config.database, tableName]);

    // Create foreign key lookup map
    const fkMap = new Map();
    (fkRows as any[]).forEach(row => {
      fkMap.set(row.COLUMN_NAME, {
        referencedTable: row.REFERENCED_TABLE_NAME,
        referencedColumn: row.REFERENCED_COLUMN_NAME,
        constraintName: row.CONSTRAINT_NAME
      });
    });
    
    return {
      description: (tableRows as any[])[0]?.description,
      fields: (columnRows as any[]).map(row => {
        const fkInfo = fkMap.get(row.name);
        return {
          name: row.name,
          dataType: row.data_type,
          isNullable: !!row.is_nullable,
          isPrimaryKey: !!row.is_primary_key,
          description: row.description,
          isForeignKey: !!fkInfo,
          referencedTable: fkInfo?.referencedTable || null,
          referencedColumn: fkInfo?.referencedColumn || null,
          constraintName: fkInfo?.constraintName || null
        };
      }),
    };
  } finally {
    await connection.end();
  }
}

// MSSQL table schema
async function getMSSQLTableSchema(config: any, credentials: any, tableName: string) {
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
      ...(config.applicationName && { appName: config.applicationName }),
    },
    connectionTimeout: (config.connectionTimeout || 30) * 1000,
    requestTimeout: (config.connectionTimeout || 30) * 1000,
  };

  const pool = await sql.connect(poolConfig);
  
  try {
    // Get column information
    const result = await pool.request()
      .input('tableName', sql.NVarChar, tableName)
      .query(`
        SELECT 
          c.COLUMN_NAME as name,
          c.DATA_TYPE as data_type,
          CASE WHEN c.IS_NULLABLE = 'YES' THEN 1 ELSE 0 END as is_nullable,
          CASE WHEN tc.CONSTRAINT_TYPE = 'PRIMARY KEY' THEN 1 ELSE 0 END as is_primary_key,
          ep.value as description
        FROM INFORMATION_SCHEMA.COLUMNS c
        LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu ON kcu.TABLE_NAME = c.TABLE_NAME AND kcu.COLUMN_NAME = c.COLUMN_NAME
        LEFT JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        LEFT JOIN sys.columns sc ON sc.name = c.COLUMN_NAME
        LEFT JOIN sys.tables st ON st.name = c.TABLE_NAME
        LEFT JOIN sys.extended_properties ep ON ep.major_id = st.object_id AND ep.minor_id = sc.column_id AND ep.name = 'MS_Description'
        WHERE c.TABLE_NAME = @tableName
        ORDER BY c.ORDINAL_POSITION
      `);
    
    // Get foreign key constraints for this table
    const fkResult = await pool.request()
      .input('tableName', sql.NVarChar, tableName)
      .query(`
        SELECT 
          fk.name AS constraint_name,
          cp.name AS column_name,
          rt.name AS referenced_table_name,
          rcp.name AS referenced_column_name
        FROM sys.foreign_keys fk
        INNER JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
        INNER JOIN sys.tables t ON t.object_id = fk.parent_object_id
        INNER JOIN sys.tables rt ON rt.object_id = fk.referenced_object_id
        INNER JOIN sys.columns cp ON cp.object_id = t.object_id AND cp.column_id = fkc.parent_column_id
        INNER JOIN sys.columns rcp ON rcp.object_id = rt.object_id AND rcp.column_id = fkc.referenced_column_id
        WHERE t.name = @tableName
      `);

    // Create foreign key lookup map
    const fkMap = new Map();
    fkResult.recordset.forEach((row: any) => {
      fkMap.set(row.column_name, {
        referencedTable: row.referenced_table_name,
        referencedColumn: row.referenced_column_name,
        constraintName: row.constraint_name
      });
    });
    
    return {
      description: undefined, // Could be enhanced to get table description
      fields: result.recordset.map((row: any) => {
        const fkInfo = fkMap.get(row.name);
        return {
          name: row.name,
          dataType: row.data_type,
          isNullable: !!row.is_nullable,
          isPrimaryKey: !!row.is_primary_key,
          description: row.description,
          isForeignKey: !!fkInfo,
          referencedTable: fkInfo?.referencedTable || null,
          referencedColumn: fkInfo?.referencedColumn || null,
          constraintName: fkInfo?.constraintName || null
        };
      }),
    };
  } finally {
    await pool.close();
  }
}

// BigQuery table schema
async function getBigQueryTableSchema(config: any, credentials: any, tableName: string) {
  const { BigQuery } = require('@google-cloud/bigquery');
  
  const bigquery = new BigQuery({
    projectId: config.projectId,
    keyFilename: credentials?.serviceAccountPath,
    credentials: credentials?.serviceAccountJson ? JSON.parse(credentials.serviceAccountJson) : undefined,
  });

  // Parse table name (might include dataset)
  const [datasetId, tableId] = tableName.includes('.') ? tableName.split('.') : [config.defaultDataset, tableName];
  
  const table = bigquery.dataset(datasetId).table(tableId);
  const [metadata] = await table.getMetadata();
  
  return {
    description: metadata.description,
    fields: metadata.schema.fields.map((field: any) => ({
      name: field.name,
      dataType: field.type,
      isNullable: field.mode !== 'REQUIRED',
      isPrimaryKey: false, // BigQuery doesn't have traditional primary keys
      description: field.description,
    })),
  };
}

// Databricks table schema
async function getDatabricksTableSchema(config: any, credentials: any, tableName: string) {
  // This would require proper Databricks SQL connector
  // For now, return a simplified implementation
  return {
    description: `Table from Databricks: ${tableName}`,
    fields: [
      {
        name: 'id',
        dataType: 'bigint',
        isNullable: false,
        isPrimaryKey: true,
        description: 'Primary key',
      },
      {
        name: 'created_at',
        dataType: 'timestamp',
        isNullable: false,
        isPrimaryKey: false,
        description: 'Creation timestamp',
      },
    ],
  };
}
