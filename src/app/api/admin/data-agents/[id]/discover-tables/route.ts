import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// POST /api/admin/data-agents/[id]/discover-tables - Discover tables in data source
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

    // Discover tables based on connection type
    const discoveryResult = await discoverTables(
      dataAgent.connectionType, 
      dataAgent.connectionConfig, 
      credentials
    )

    if (!discoveryResult.success) {
      return NextResponse.json(
        { error: discoveryResult.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      tables: discoveryResult.tables,
      totalCount: discoveryResult.tables?.length || 0
    })
  } catch (error) {
    console.error('Error discovering tables')
    return NextResponse.json(
      { error: 'Failed to discover tables' },
      { status: 500 }
    )
  }
}

// Helper function to discover tables in different data sources
async function discoverTables(
  connectionType: string, 
  connectionConfig: any, 
  credentials: any
): Promise<{ success: boolean; tables?: any[]; error?: string }> {
  
  try {
    switch (connectionType.toLowerCase()) {
      case 'postgres':
      case 'postgresql':
        return await discoverPostgresTables(connectionConfig, credentials)
      
      case 'mysql':
        return await discoverMySQLTables(connectionConfig, credentials)
      
      case 'mssql':
      case 'sqlserver':
        return await discoverMSSQLTables(connectionConfig, credentials)
      
      case 'bigquery':
        return await discoverBigQueryTables(connectionConfig, credentials)
      
      case 'databricks':
        return await discoverDatabricksTables(connectionConfig, credentials)
      
      default:
        return {
          success: false,
          error: `Table discovery for '${connectionType}' is not supported yet`
        }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during table discovery'
    }
  }
}

// PostgreSQL table discovery
async function discoverPostgresTables(config: any, credentials: any) {
  try {
    const { Client } = require('pg')
    
    const client = new Client({
      host: config.host,
      port: config.port || 5432,
      database: config.database,
      user: credentials?.username || credentials?.user,
      password: credentials?.password,
      ssl: config.ssl || false,
    })

    await client.connect()

    // Get tables with column information
    const tablesQuery = `
      SELECT 
        t.table_schema,
        t.table_name,
        t.table_type,
        obj_description(c.oid) as table_comment,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = t.table_schema) as column_count
      FROM information_schema.tables t
      LEFT JOIN pg_class c ON c.relname = t.table_name
      WHERE t.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY t.table_schema, t.table_name
    `

    const tablesResult = await client.query(tablesQuery)
    
    const tables = tablesResult.rows.map((row: any) => ({
      schemaName: row.table_schema,
      tableName: row.table_name,
      tableType: row.table_type,
      comment: row.table_comment,
      columnCount: parseInt(row.column_count),
      estimatedRows: null // Could be populated with a separate query
    }))

    await client.end()

    return {
      success: true,
      tables
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PostgreSQL table discovery failed'
    }
  }
}

// MySQL table discovery
async function discoverMySQLTables(config: any, credentials: any) {
  try {
    const mysql = require('mysql2/promise')
    
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port || 3306,
      database: config.database,
      user: credentials?.username || credentials?.user,
      password: credentials?.password,
      ssl: config.ssl || false,
    })

    const [tables] = await connection.execute(`
      SELECT 
        TABLE_SCHEMA as schema_name,
        TABLE_NAME as table_name,
        TABLE_TYPE as table_type,
        TABLE_COMMENT as comment,
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = t.TABLE_NAME AND TABLE_SCHEMA = t.TABLE_SCHEMA) as column_count,
        TABLE_ROWS as estimated_rows
      FROM INFORMATION_SCHEMA.TABLES t
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `, [config.database])

    await connection.end()

    return {
      success: true,
      tables: tables.map((row: any) => ({
        schemaName: row.schema_name,
        tableName: row.table_name,
        tableType: row.table_type,
        comment: row.comment,
        columnCount: row.column_count,
        estimatedRows: row.estimated_rows
      }))
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'MySQL table discovery failed'
    }
  }
}

// MSSQL table discovery
async function discoverMSSQLTables(config: any, credentials: any) {
  try {
    const sql = require('mssql')
    
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
      connectionTimeout: 5000,
      requestTimeout: 5000,
    }

    const pool = await sql.connect(poolConfig)
    
    const result = await pool.request().query(`
      SELECT 
        SCHEMA_NAME(t.schema_id) as schema_name,
        t.name as table_name,
        CASE 
          WHEN t.type = 'U' THEN 'BASE TABLE'
          WHEN t.type = 'V' THEN 'VIEW'
          ELSE 'OTHER'
        END as table_type,
        ISNULL(ep.value, '') as comment,
        (SELECT COUNT(*) FROM sys.columns WHERE object_id = t.object_id) as column_count,
        (SELECT SUM(rows) FROM sys.partitions WHERE object_id = t.object_id AND index_id IN (0,1)) as estimated_rows
      FROM sys.tables t
      LEFT JOIN sys.extended_properties ep ON ep.major_id = t.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
      UNION ALL
      SELECT 
        SCHEMA_NAME(v.schema_id) as schema_name,
        v.name as table_name,
        'VIEW' as table_type,
        ISNULL(ep.value, '') as comment,
        (SELECT COUNT(*) FROM sys.columns WHERE object_id = v.object_id) as column_count,
        NULL as estimated_rows
      FROM sys.views v
      LEFT JOIN sys.extended_properties ep ON ep.major_id = v.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
      ORDER BY schema_name, table_name
    `)

    await pool.close()

    return {
      success: true,
      tables: result.recordset.map((row: any) => ({
        schemaName: row.schema_name,
        tableName: row.table_name,
        tableType: row.table_type,
        comment: row.comment,
        columnCount: row.column_count,
        estimatedRows: row.estimated_rows
      }))
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'MSSQL table discovery failed'
    }
  }
}

// BigQuery table discovery
async function discoverBigQueryTables(config: any, credentials: any) {
  try {
    const { BigQuery } = require('@google-cloud/bigquery')
    
    const bigquery = new BigQuery({
      projectId: config.projectId,
      keyFilename: credentials?.serviceAccountPath,
      credentials: credentials?.serviceAccountJson ? JSON.parse(credentials.serviceAccountJson) : undefined,
    })

    const [datasets] = await bigquery.getDatasets()
    const tables: any[] = []

    for (const dataset of datasets) {
      const [datasetTables] = await dataset.getTables()
      
      for (const table of datasetTables) {
        const [metadata] = await table.getMetadata()
        
        tables.push({
          schemaName: dataset.id,
          tableName: table.id,
          tableType: metadata.type || 'TABLE',
          comment: metadata.description,
          columnCount: metadata.schema?.fields?.length || 0,
          estimatedRows: metadata.numRows ? parseInt(metadata.numRows) : null
        })
      }
    }

    return {
      success: true,
      tables
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'BigQuery table discovery failed'
    }
  }
}

// Databricks table discovery
async function discoverDatabricksTables(config: any, credentials: any) {
  try {
    // This would require the Databricks SQL connector
    // For now, we'll implement a basic approach using SQL queries
    const fetch = require('node-fetch')
    
    const response = await fetch(`${config.serverHostname}/api/2.0/sql/statements`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials?.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        warehouse_id: config.httpPath,
        statement: 'SHOW TABLES',
        wait_timeout: '10s'
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    
    // Process the results (this would need to be adapted based on actual Databricks API response)
    const tables = result.result?.data_array?.map((row: any[]) => ({
      schemaName: row[0],
      tableName: row[1],
      tableType: 'TABLE',
      comment: null,
      columnCount: null,
      estimatedRows: null
    })) || []

    return {
      success: true,
      tables
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Databricks table discovery failed'
    }
  }
}


