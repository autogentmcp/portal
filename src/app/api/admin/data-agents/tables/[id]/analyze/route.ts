import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { getLLMService } from '@/lib/llm';
import { DatabaseConnectionManager } from '@/lib/database/connection-manager';

interface SampleDataResult {
  rowCount?: number;
  schemaDetails?: {
    [columnName: string]: {
      dataType: string;
      isNullable: boolean;
      defaultValue?: string;
      maxLength?: number;
      precision?: number;
      scale?: number;
      isPrimaryKey: boolean;
      comment?: string;
      ordinalPosition?: number;
    };
  };
  [columnName: string]: string[] | number | any;
}

// POST /api/admin/data-agents/tables/[id]/analyze - Analyze table with LLM
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 OLD ROUTE: Table analysis request received for tableId:', (await params).id);
  
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
      
      // Prepare LLM request with enhanced schema details
      const llmService = await getLLMService();
      const analysisRequest = {
        tableName: table.tableName,
        fields: table.columns.map((field: any) => {
          const schemaInfo = sampleData.schemaDetails?.[field.columnName];
          return {
            name: field.columnName,
            dataType: field.dataType,
            isNullable: field.isNullable,
            isPrimaryKey: field.isPrimaryKey,
            isForeignKey: field.isForeignKey || false,
            referencedTable: field.referencedTable,
            referencedColumn: field.referencedColumn,
            isUnique: field.isUnique || false,
            isIndexed: field.isIndexed || false,
            constraints: field.constraints || [],
            sampleValues: Array.isArray(sampleData[field.columnName]) ? sampleData[field.columnName] as string[] : [],
            // Enhanced schema details from database
            maxLength: schemaInfo?.maxLength,
            precision: schemaInfo?.precision,
            scale: schemaInfo?.scale,
            defaultValue: schemaInfo?.defaultValue,
            comment: schemaInfo?.comment,
            ordinalPosition: schemaInfo?.ordinalPosition
          };
        }),
        rowCount: sampleData.rowCount,
        schemaDetails: sampleData.schemaDetails,
        note: hasSampleData ? undefined : "Note: Analysis performed without sample data due to database connection issues."
      };

      // Analyze table
      const tableAnalysis = await llmService.analyzeTable(analysisRequest);

      // Analyze each field individually with brief structured descriptions
      console.log('🧠 Starting AI column analysis for', table.columns.length, 'columns...');
      const fieldAnalyses = await Promise.all(
        table.columns.map(async (field: any) => {
          try {
            console.log(`🔍 Analyzing column: ${field.columnName} (${field.dataType})`);
            
            // Use the new brief column description method
            const fieldAnalysis = await llmService.generateBriefColumnDescription({
              tableName: table.tableName,
              columnName: field.columnName,
              dataType: field.dataType,
              isNullable: field.isNullable,
              isPrimaryKey: field.isPrimaryKey,
              sampleValues: Array.isArray(sampleData[field.columnName]) ? sampleData[field.columnName] as string[] : [],
              customPrompt: table.environment?.customPrompt || undefined,
            });
            
            console.log(`✅ AI analysis complete for ${field.columnName}:`, {
              description: fieldAnalysis.description,
              exampleValue: fieldAnalysis.exampleValue,
              valueType: fieldAnalysis.valueType
            });

            // Save structured data in aiDescription as JSON
            const structuredAiDescription = JSON.stringify({
              purpose: fieldAnalysis.description,
              sample_value: fieldAnalysis.exampleValue,
              data_pattern: fieldAnalysis.valueType
            });
            
            console.log(`💾 Updating database for column ${field.columnName} with:`, structuredAiDescription);

            // Update field with structured AI analysis
            await prisma.dataAgentTableColumn.update({
              where: { id: field.id },
              data: { aiDescription: structuredAiDescription },
            });
            
            console.log(`✅ Column ${field.columnName} updated in database`);

            return {
              fieldId: field.id,
              fieldName: field.columnName,
              analysis: fieldAnalysis.description,
              exampleValue: fieldAnalysis.exampleValue,
              valueType: fieldAnalysis.valueType,
            };
          } catch (error) {
            console.error(`❌ Error analyzing field ${field.columnName}:`, error);
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
    port: parseInt(String(config.port || 5432)), // Ensure port is a number
    database: config.database,
    user: credentials?.username || credentials?.user,
    password: credentials?.password,
    ssl: sslConfig,
    connectionTimeoutMillis: (config.connectionTimeout || 30) * 1000,
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
    
    // Get column metadata for schema details
    const schemaQuery = `
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        c.ordinal_position,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
        col_description(pgc.oid, c.ordinal_position) as column_comment
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        INNER JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_name = $2
          AND tc.table_schema = $3
      ) pk ON c.column_name = pk.column_name
      LEFT JOIN pg_class pgc ON pgc.relname = c.table_name
      LEFT JOIN pg_namespace pgn ON pgn.oid = pgc.relnamespace AND pgn.nspname = c.table_schema
      WHERE c.table_name = $2 
        AND c.table_schema = $3
      ORDER BY c.ordinal_position
    `;
    
    const currentSchema = schemaName || 'public';
    const schemaResult = await client.query(schemaQuery, [quotedTableName, tableName, currentSchema]);
    
    // Get row count
    const countResult = await client.query(`SELECT COUNT(*) as count FROM ${quotedTableName}`);
    const rowCount = parseInt(countResult.rows[0].count);
    
    // Get random sample data (limit to 100 rows)
    // Use TABLESAMPLE for large tables (PostgreSQL 9.5+) or ORDER BY RANDOM() for smaller tables
    let sampleQuery: string;
    if (rowCount > 10000) {
      // For large tables, use TABLESAMPLE BERNOULLI for better performance
      sampleQuery = `SELECT * FROM ${quotedTableName} TABLESAMPLE BERNOULLI(1) LIMIT 100`;
    } else {
      // For smaller tables, use ORDER BY RANDOM() for true randomness
      sampleQuery = `SELECT * FROM ${quotedTableName} ORDER BY RANDOM() LIMIT 100`;
    }
    
    const sampleResult = await client.query(sampleQuery);
    
    // Organize sample values by column
    const sampleData: { [key: string]: string[] } = {};
    const schemaDetails: { [key: string]: any } = {};
    
    // Add schema information
    schemaResult.rows.forEach((col: any) => {
      schemaDetails[col.column_name] = {
        dataType: col.data_type,
        isNullable: col.is_nullable === 'YES',
        defaultValue: col.column_default,
        maxLength: col.character_maximum_length,
        precision: col.numeric_precision,
        scale: col.numeric_scale,
        isPrimaryKey: col.is_primary_key,
        comment: col.column_comment,
        ordinalPosition: col.ordinal_position
      };
    });
    
    if (sampleResult.rows.length > 0) {
      const columns = Object.keys(sampleResult.rows[0]);
      
      columns.forEach(column => {
        sampleData[column] = sampleResult.rows
          .map((row: any) => row[column])
          .filter((value: any) => value !== null && value !== undefined)
          .map((value: any) => {
            // Better handling for complex data types
            if (typeof value === 'object') {
              try {
                return JSON.stringify(value);
              } catch {
                return String(value);
              }
            }
            return String(value);
          })
          .slice(0, 20); // Limit to 20 sample values per column
      });
    }

    return { ...sampleData, rowCount, schemaDetails };
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
    port: parseInt(String(config.port || 3306)), // Ensure port is a number
    database: config.database,
    user: credentials?.username || credentials?.user,
    password: credentials?.password,
    ssl: sslConfig,
    connectTimeout: (config.connectionTimeout || 30) * 1000,
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
    
    // Get random sample data (limit to 100 rows)
    // Use ORDER BY RAND() for random sampling in MySQL
    const [sampleRows] = await connection.execute(`SELECT * FROM ${quotedTableName} ORDER BY RAND() LIMIT 100`);
    
    const sampleData: { [key: string]: string[] } = {};
    
    if ((sampleRows as any[]).length > 0) {
      const columns = Object.keys((sampleRows as any[])[0]);
      
      columns.forEach(column => {
        sampleData[column] = (sampleRows as any[])
          .map((row: any) => row[column])
          .filter((value: any) => value !== null && value !== undefined)
          .map((value: any) => {
            // Better handling for complex data types
            if (typeof value === 'object') {
              try {
                return JSON.stringify(value);
              } catch {
                return String(value);
              }
            }
            return String(value);
          })
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
      ...(config.applicationName && { appName: config.applicationName }),
    },
    connectionTimeout: (config.connectionTimeout || 30) * 1000,
    requestTimeout: (config.connectionTimeout || 30) * 1000,
  };

  const pool = await sql.connect(poolConfig);
  
  try {
    // Use proper schema qualification for SQL Server
    const schemaPrefix = schemaName || 'dbo';
    const qualifiedTableName = `[${schemaPrefix}].[${tableName}]`;
    
    // Get row count
    const countResult = await pool.request().query(`SELECT COUNT(*) as count FROM ${qualifiedTableName}`);
    const rowCount = countResult.recordset[0].count;
    
    // Get random sample data (limit to 100 rows)
    // Use TABLESAMPLE for large tables or ORDER BY NEWID() for smaller tables in SQL Server
    let sampleQuery: string;
    if (rowCount > 10000) {
      // For large tables, use TABLESAMPLE for better performance
      sampleQuery = `SELECT TOP 100 * FROM ${qualifiedTableName} TABLESAMPLE (1 PERCENT)`;
    } else {
      // For smaller tables, use ORDER BY NEWID() for true randomness
      sampleQuery = `SELECT TOP 100 * FROM ${qualifiedTableName} ORDER BY NEWID()`;
    }
    
    const sampleResult = await pool.request().query(sampleQuery);
    
    const sampleData: { [key: string]: string[] } = {};
    
    if (sampleResult.recordset.length > 0) {
      const columns = Object.keys(sampleResult.recordset[0]);
      
      columns.forEach(column => {
        sampleData[column] = sampleResult.recordset
          .map((row: any) => row[column])
          .filter((value: any) => value !== null && value !== undefined)
          .map((value: any) => {
            // Better handling for complex data types
            if (typeof value === 'object') {
              try {
                return JSON.stringify(value);
              } catch {
                return String(value);
              }
            }
            return String(value);
          })
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
    
    // For BigQuery, the credentials should include serviceAccountJson
    if (!config.projectId) {
      throw new Error('BigQuery projectId is required in connection configuration');
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
        
        bigqueryConfig.credentials = parsedCredentials;
      } catch (parseError) {
        console.error('JSON parsing error in sample data:', parseError);
        return {};
      }
    } else if (credentials?.serviceAccountPath) {
      bigqueryConfig.keyFilename = credentials.serviceAccountPath;
    } else {
      console.error('No BigQuery credentials found for sample data');
      return {};
    }

    const bigquery = new BigQuery(bigqueryConfig);

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
    
    // Get random sample data using TABLESAMPLE in BigQuery
    // BigQuery uses TABLESAMPLE SYSTEM for random sampling
    let sampleQuery: string;
    if (rowCount > 10000) {
      // For large tables, use TABLESAMPLE for random sampling
      sampleQuery = `SELECT * FROM ${finalTableName} TABLESAMPLE SYSTEM (1 PERCENT) LIMIT 100`;
    } else {
      // For smaller tables, use ORDER BY RAND() 
      sampleQuery = `SELECT * FROM ${finalTableName} ORDER BY RAND() LIMIT 100`;
    }
    
    const [rows] = await bigquery.query({ query: sampleQuery });
    
    const sampleData: { [key: string]: string[] } = {};
    
    if (rows.length > 0) {
      const columns = Object.keys(rows[0]);
      
      columns.forEach(column => {
        sampleData[column] = rows
          .map((row: any) => row[column])
          .filter((value: any) => value !== null && value !== undefined)
          .map((value: any) => {
            // Better handling for complex data types
            if (typeof value === 'object') {
              try {
                return JSON.stringify(value);
              } catch {
                return String(value);
              }
            }
            return String(value);
          })
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
                .map((value: any) => {
                  // Better handling for complex data types
                  if (typeof value === 'object') {
                    try {
                      return JSON.stringify(value);
                    } catch {
                      return String(value);
                    }
                  }
                  return String(value);
                })
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


