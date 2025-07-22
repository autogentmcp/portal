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
        return await getPostgresSampleData(connectionConfig, credentials, table.tableName, table.schemaName);
      
      case 'mysql':
        return await getMySQLSampleData(connectionConfig, credentials, table.tableName, table.schemaName);
      
      case 'mssql':
      case 'sqlserver':
        return await getMSSQLSampleData(connectionConfig, credentials, table.tableName, table.schemaName);
      
      case 'db2':
        return await getDB2SampleData(connectionConfig, credentials, table.tableName, table.schemaName);
      
      case 'bigquery':
        return await getBigQuerySampleData(connectionConfig, credentials, table.tableName, table.schemaName);
      
      case 'databricks':
        return await getDatabricksSampleData(connectionConfig, credentials, table.tableName, table.schemaName);
      
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
async function getPostgresSampleData(config: any, credentials: any, tableName: string, schemaName?: string) {
  const { Client } = require('pg');
  
  const client = new Client({
    host: config.host,
    port: parseInt(String(config.port || 5432)), // Ensure port is a number
    database: config.database,
    user: credentials?.username || credentials?.user,
    password: credentials?.password,
    ssl: config.ssl || false,
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    
    // Use proper schema qualification for table name
    let quotedTableName: string;
    if (schemaName) {
      quotedTableName = `"${schemaName}"."${tableName}"`;
    } else if (tableName.includes('.')) {
      quotedTableName = tableName.split('.').map(part => `"${part}"`).join('.'); 
    } else {
      quotedTableName = `"${tableName}"`;
    }
    
    // Get row count
    const countResult = await client.query(`SELECT COUNT(*) as count FROM ${quotedTableName}`);
    const rowCount = parseInt(countResult.rows[0].count);
    
    // Get sample data (limit to 100 rows)
    const sampleResult = await client.query(`SELECT * FROM ${quotedTableName} LIMIT 100`);
    
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
async function getMySQLSampleData(config: any, credentials: any, tableName: string, schemaName?: string) {
  const mysql = require('mysql2/promise');
  
  const connection = await mysql.createConnection({
    host: config.host,
    port: parseInt(String(config.port || 3306)), // Ensure port is a number
    database: config.database,
    user: credentials?.username || credentials?.user,
    password: credentials?.password,
    ssl: config.ssl || false,
    connectTimeout: 10000,
  });

  try {
    // Use proper backtick quoting for table name
    let quotedTableName: string;
    if (schemaName) {
      quotedTableName = `\`${schemaName}\`.\`${tableName}\``;
    } else if (tableName.includes('.')) {
      quotedTableName = tableName.split('.').map(part => `\`${part}\``).join('.'); 
    } else {
      quotedTableName = `\`${tableName}\``;
    }
    
    // Get row count
    const [countRows] = await connection.execute(`SELECT COUNT(*) as count FROM ${quotedTableName}`);
    const rowCount = (countRows as any[])[0].count;
    
    // Get sample data
    const [sampleRows] = await connection.execute(`SELECT * FROM ${quotedTableName} LIMIT 100`);
    
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
async function getMSSQLSampleData(config: any, credentials: any, tableName: string, schemaName?: string) {
  const sql = require('mssql');
  
  const poolConfig = {
    server: config.server || config.host,
    port: parseInt(String(config.port || 1433)), // Ensure port is a number
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
    // Use proper schema qualification for SQL Server
    const schemaPrefix = schemaName || 'dbo';
    const qualifiedTableName = `[${schemaPrefix}].[${tableName}]`;
    
    // Get row count
    const countResult = await pool.request().query(`SELECT COUNT(*) as count FROM ${qualifiedTableName}`);
    const rowCount = countResult.recordset[0].count;
    
    // Get sample data
    const sampleResult = await pool.request().query(`SELECT TOP 100 * FROM ${qualifiedTableName}`);
    
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
async function getBigQuerySampleData(config: any, credentials: any, tableName: string, schemaName?: string) {
  try {
    const { BigQuery } = require('@google-cloud/bigquery');
    
    const bigquery = new BigQuery({
      projectId: config.projectId,
      keyFilename: credentials?.serviceAccountPath,
      credentials: credentials?.serviceAccountJson ? JSON.parse(credentials.serviceAccountJson) : undefined,
    });

    let finalTableName: string;
    if (schemaName) {
      // Use provided schema name
      finalTableName = `\`${config.projectId}.${schemaName}.${tableName}\``;
    } else if (tableName.includes('.')) {
      // Already qualified (dataset.table)
      finalTableName = `\`${config.projectId}.${tableName}\``;
    } else {
      // Use default dataset
      const datasetId = config.defaultDataset || 'default_dataset';
      finalTableName = `\`${config.projectId}.${datasetId}.${tableName}\``;
    }
    
    // Get row count
    const countQuery = `SELECT COUNT(*) as count FROM ${finalTableName}`;
    const [countRows] = await bigquery.query({ query: countQuery });
    const rowCount = countRows[0]?.count || 0;
    
    // Get sample data
    const sampleQuery = `SELECT * FROM ${finalTableName} LIMIT 100`;
    const [rows] = await bigquery.query({ query: sampleQuery });
    
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
    
    return { ...sampleData, rowCount };
  } catch (error) {
    console.warn(`BigQuery sample data failed for table ${tableName}:`, error instanceof Error ? error.message : 'Unknown error');
    return {};
  }
}

// Databricks sample data
async function getDatabricksSampleData(config: any, credentials: any, tableName: string, schemaName?: string) {
  try {
    // Use Databricks SQL connector if available
    // For now, return empty data since proper Databricks connection would require specific libraries
    console.warn(`Databricks sample data not yet implemented for table ${tableName}. Returning empty data.`);
    return {};
  } catch (error) {
    console.warn(`Databricks sample data failed for table ${tableName}:`, error instanceof Error ? error.message : 'Unknown error');
    return {};
  }
}

// DB2 sample data
async function getDB2SampleData(config: any, credentials: any, tableName: string, schemaName?: string): Promise<SampleDataResult> {
  try {
    // Try to import ibm_db
    let ibmdb: any;
    try {
      const ibmdbModule = await import('ibm_db');
      
      if (typeof ibmdbModule === 'function') {
        ibmdb = ibmdbModule;
      } else if (ibmdbModule.default && typeof ibmdbModule.default === 'function') {
        ibmdb = ibmdbModule.default;
      } else if (ibmdbModule.open && typeof ibmdbModule.open === 'function') {
        ibmdb = ibmdbModule;
      } else {
        throw new Error('ibm_db module has unexpected structure');
      }
    } catch (importError) {
      console.warn('DB2 driver not available for sample data:', importError instanceof Error ? importError.message : 'Unknown import error');
      return {};
    }

    // Build connection string
    const host = config.host === 'localhost' ? '127.0.0.1' : config.host;
    const port = config.port || 50000;
    const connStr = `DATABASE=${config.database};HOSTNAME=${host};PORT=${port};PROTOCOL=TCPIP;UID=${credentials.username};PWD=${credentials.password};CONNECTTIMEOUT=10;QUERYTIMEOUT=30;`;
    
    return new Promise((resolve) => {
      const connectionTimeout = setTimeout(() => {
        console.warn('DB2 connection timeout for sample data. Returning empty data.');
        resolve({});
      }, 10000);
      
      try {
        ibmdb.open(connStr, (err: any, conn: any) => {
          clearTimeout(connectionTimeout);
          
          if (err) {
            console.warn(`DB2 connection failed for sample data: ${err.message || 'Unknown error'}`);
            resolve({});
            return;
          }
          
          // Use schema-qualified table name for sample data query
          let schemaQualifiedTable: string;
          if (schemaName) {
            // Use provided schema name
            schemaQualifiedTable = `${schemaName}.${tableName}`;
          } else if (!tableName.includes('.')) {
            // If no schema specified, use RETAIL_SYS as default based on error logs
            schemaQualifiedTable = `RETAIL_SYS.${tableName}`;
          } else {
            // Table already includes schema
            schemaQualifiedTable = tableName;
          }
          
          const query = `SELECT * FROM ${schemaQualifiedTable} FETCH FIRST 20 ROWS ONLY`;
          console.log(`DB2 query for sample data: ${query}`);
          
          conn.query(query, (queryErr: any, result: any) => {
            conn.close();
            
            if (queryErr) {
              console.log(`DB2 query failed for sample data: ${queryErr.message || 'Unknown error'}`);
              resolve({});
              return;
            }
            
            if (!result || result.length === 0) {
              resolve({});
              return;
            }
            
            // Transform the data into the expected format
            const sampleData: { [key: string]: any } = {};
            const columns = Object.keys(result[0] || {});
            
            columns.forEach(column => {
              sampleData[column] = result
                .map((row: any) => row[column])
                .filter((value: any) => value !== null && value !== undefined)
                .map((value: any) => String(value))
                .slice(0, 20);
            });
            
            resolve(sampleData);
          });
        });
      } catch (openError) {
        clearTimeout(connectionTimeout);
        console.warn(`Failed to open DB2 connection for sample data: ${openError instanceof Error ? openError.message : 'Unknown error'}`);
        resolve({});
      }
    });
  } catch (error) {
    console.warn('DB2 sample data fetch error:', error instanceof Error ? error.message : 'Unknown error');
    return {};
  }
}


