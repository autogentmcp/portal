import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { getLLMService } from '@/lib/llm';

// POST /api/admin/data-agents/tables/[id]/analyze - Analyze table with LLM
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

    // Get table with fields and environment
    const table = await prisma.dataAgentTable.findUnique({
      where: { id },
      include: {
        columns: true,
        dataAgent: true,
        environment: true,
      },
    });

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Update table status to analyzing
    await prisma.dataAgentTable.update({
      where: { id },
      data: { analysisStatus: 'ANALYZING' },
    });

    try {
      // Get sample data for analysis
      const sampleData = await getSampleData(table);
      const hasSampleData = sampleData && Object.keys(sampleData).length > 0;
      
      // Prepare LLM request
      const llmService = getLLMService();
      const analysisRequest = {
        tableName: table.tableName,
        fields: table.columns.map((field: any) => ({
          name: field.columnName,
          dataType: field.dataType,
          isNullable: field.isNullable,
          isPrimaryKey: field.isPrimaryKey,
          sampleValues: Array.isArray(sampleData[field.columnName]) ? sampleData[field.columnName] as string[] : [],
        })),
        rowCount: sampleData.rowCount,
        note: hasSampleData ? undefined : "Note: Analysis performed without sample data due to database connection issues."
      };

      // Analyze table
      const tableAnalysis = await llmService.analyzeTable(analysisRequest);

      // Analyze each field individually for detailed insights
      const fieldAnalyses = await Promise.all(
        table.columns.map(async (field: any) => {
          try {
            const fieldAnalysis = await llmService.analyzeField({
              tableName: table.tableName,
              fieldName: field.columnName,
              dataType: field.dataType,
              isNullable: field.isNullable,
              isPrimaryKey: field.isPrimaryKey,
              sampleValues: Array.isArray(sampleData[field.columnName]) ? sampleData[field.columnName] as string[] : [],
              rowCount: sampleData.rowCount,
            });

            // Update field with LLM analysis
            await prisma.dataAgentTableColumn.update({
              where: { id: field.id },
              data: { aiDescription: fieldAnalysis.content },
            });

            return {
              fieldId: field.id,
              fieldName: field.columnName,
              analysis: fieldAnalysis.content,
            };
          } catch (error) {
            console.error(`Error analyzing field ${field.columnName}:`, error);
            return {
              fieldId: field.id,
              fieldName: field.columnName,
              error: error instanceof Error ? error.message : 'Analysis failed',
            };
          }
        })
      );

      // Update table with analysis results
      await prisma.dataAgentTable.update({
        where: { id },
        data: {
          analysisStatus: 'COMPLETED',
          description: tableAnalysis.content.substring(0, 500), // Always use new LLM analysis, truncate if too long
          analysisResult: {
            summary: tableAnalysis.content,
            analyzedAt: new Date().toISOString(),
            usage: tableAnalysis.usage,
          },
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        message: 'Table analysis completed successfully',
        tableAnalysis: tableAnalysis.content,
        fieldAnalyses: fieldAnalyses,
        usage: tableAnalysis.usage,
      });

    } catch (error) {
      // Update table status to error
      await prisma.dataAgentTable.update({
        where: { id },
        data: { analysisStatus: 'FAILED' },
      });

      throw error;
    }

  } catch (error) {
    console.error('Error analyzing table:', error);
    return NextResponse.json(
      { error: 'Failed to analyze table', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

interface SampleDataResult {
  [fieldName: string]: string[] | number | undefined;
  rowCount?: number;
}

// Helper function to get sample data from the table
async function getSampleData(table: any): Promise<SampleDataResult> {
  const dataAgent = table.dataAgent;
  const environment = table.environment;
  
  // Get credentials from vault using environment's vaultKey
  let credentials = null;
  if (environment && environment.vaultKey) {
    try {
      const { SecretManager } = await import('@/lib/secrets');
      const secretManager = SecretManager.getInstance();
      await secretManager.init();
      
      if (secretManager.hasProvider()) {
        credentials = await secretManager.getCredentials(environment.vaultKey);
        
        // Ensure password is a string (same as in import)
        if (credentials && credentials.password && typeof credentials.password !== 'string') {
          credentials.password = String(credentials.password);
        }
      }
    } catch (error) {
      console.error('Failed to retrieve credentials for sample data:', error);
      return {};
    }
  }

  // Use environment connectionConfig if available, fallback to dataAgent
  const connectionConfig = environment?.connectionConfig || dataAgent.connectionConfig;

  try {
    switch (dataAgent.connectionType.toLowerCase()) {
      case 'postgres':
      case 'postgresql':
        return await getPostgresSampleData(connectionConfig, credentials, table.tableName);
      
      case 'mysql':
        return await getMySQLSampleData(connectionConfig, credentials, table.tableName);
      
      case 'mssql':
      case 'sqlserver':
        return await getMSSQLSampleData(connectionConfig, credentials, table.tableName);
      
      case 'bigquery':
        return await getBigQuerySampleData(connectionConfig, credentials, table.tableName);
      
      case 'databricks':
        return await getDatabricksSampleData(connectionConfig, credentials, table.tableName);
      
      default:
        console.warn(`Sample data not supported for connection type: ${dataAgent.connectionType}`);
        return {};
    }
  } catch (error) {
    console.warn(`Failed to get sample data for table ${table.tableName}:`, error instanceof Error ? error.message : error);
    // Return empty object so analysis can continue without sample data
    return {};
  }
}

// PostgreSQL sample data
async function getPostgresSampleData(config: any, credentials: any, tableName: string) {
  const { Client } = require('pg');
  
  const client = new Client({
    host: config.host,
    port: config.port || 5432,
    database: config.database,
    user: credentials?.username || credentials?.user,
    password: credentials?.password,
    ssl: config.ssl || false,
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    
    // Get row count
    const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
    const rowCount = parseInt(countResult.rows[0].count);
    
    // Get sample data (limit to 100 rows)
    const sampleResult = await client.query(`SELECT * FROM "${tableName}" LIMIT 100`);
    
    // Organize sample values by column
    const sampleData: { [key: string]: string[] } = {};
    
    if (sampleResult.rows.length > 0) {
      const columns = Object.keys(sampleResult.rows[0]);
      
      columns.forEach(column => {
        sampleData[column] = sampleResult.rows
          .map((row: any) => row[column])
          .filter((value: any) => value !== null && value !== undefined)
          .map((value: any) => String(value))
          .slice(0, 20); // Limit to 20 sample values per column
      });
    }
    
    return { ...sampleData, rowCount };
  } catch (error) {
    const err = error as any;
    console.warn(`PostgreSQL connection failed for table ${tableName}:`, {
      code: err.code,
      message: err.message,
      host: config.host,
      port: config.port || 5432,
      database: config.database
    });
    throw error;
  } finally {
    try {
      await client.end();
    } catch (endError) {
      // Ignore cleanup errors
    }
  }
}

// MySQL sample data
async function getMySQLSampleData(config: any, credentials: any, tableName: string) {
  const mysql = require('mysql2/promise');
  
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port || 3306,
    database: config.database,
    user: credentials?.username || credentials?.user,
    password: credentials?.password,
    ssl: config.ssl || false,
    connectTimeout: 10000,
  });

  try {
    // Get row count
    const [countRows] = await connection.execute(`SELECT COUNT(*) as count FROM \`${tableName}\``);
    const rowCount = (countRows as any[])[0].count;
    
    // Get sample data
    const [sampleRows] = await connection.execute(`SELECT * FROM \`${tableName}\` LIMIT 100`);
    
    const sampleData: { [key: string]: string[] } = {};
    
    if ((sampleRows as any[]).length > 0) {
      const columns = Object.keys((sampleRows as any[])[0]);
      
      columns.forEach(column => {
        sampleData[column] = (sampleRows as any[])
          .map((row: any) => row[column])
          .filter((value: any) => value !== null && value !== undefined)
          .map((value: any) => String(value))
          .slice(0, 20);
      });
    }
    
    return { ...sampleData, rowCount };
  } finally {
    await connection.end();
  }
}

// MSSQL sample data
async function getMSSQLSampleData(config: any, credentials: any, tableName: string) {
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
    // Get row count
    const countResult = await pool.request().query(`SELECT COUNT(*) as count FROM [${tableName}]`);
    const rowCount = countResult.recordset[0].count;
    
    // Get sample data
    const sampleResult = await pool.request().query(`SELECT TOP 100 * FROM [${tableName}]`);
    
    const sampleData: { [key: string]: string[] } = {};
    
    if (sampleResult.recordset.length > 0) {
      const columns = Object.keys(sampleResult.recordset[0]);
      
      columns.forEach(column => {
        sampleData[column] = sampleResult.recordset
          .map((row: any) => row[column])
          .filter((value: any) => value !== null && value !== undefined)
          .map((value: any) => String(value))
          .slice(0, 20);
      });
    }
    
    return { ...sampleData, rowCount };
  } finally {
    await pool.close();
  }
}

// BigQuery sample data
async function getBigQuerySampleData(config: any, credentials: any, tableName: string) {
  const { BigQuery } = require('@google-cloud/bigquery');
  
  const bigquery = new BigQuery({
    projectId: config.projectId,
    keyFilename: credentials?.serviceAccountPath,
    credentials: credentials?.serviceAccountJson ? JSON.parse(credentials.serviceAccountJson) : undefined,
  });

  const [datasetId, tableId] = tableName.includes('.') ? tableName.split('.') : [config.defaultDataset, tableName];
  
  // Get sample data
  const query = `SELECT * FROM \`${config.projectId}.${datasetId}.${tableId}\` LIMIT 100`;
  const [rows] = await bigquery.query({ query });
  
  const sampleData: { [key: string]: string[] } = {};
  
  if (rows.length > 0) {
    const columns = Object.keys(rows[0]);
    
    columns.forEach(column => {
      sampleData[column] = rows
        .map((row: any) => row[column])
        .filter((value: any) => value !== null && value !== undefined)
        .map((value: any) => String(value))
        .slice(0, 20);
    });
  }
  
  return sampleData;
}

// Databricks sample data
async function getDatabricksSampleData(config: any, credentials: any, tableName: string) {
  // Simplified implementation - would need proper Databricks SQL connector
  return {
    id: ['1', '2', '3', '4', '5'],
    created_at: ['2024-01-01', '2024-01-02', '2024-01-03'],
    rowCount: 1000,
  };
}


