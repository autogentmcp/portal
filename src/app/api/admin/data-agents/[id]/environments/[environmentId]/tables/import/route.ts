import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { DatabaseJsonHelper } from '@/lib/database/json-helper';

// POST /api/admin/data-agents/[id]/environments/[environmentId]/tables/import - Import selected tables
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; environmentId: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, environmentId } = await params;
    const body = await request.json();
    const { tables: tableNames } = body;

    if (!Array.isArray(tableNames) || tableNames.length === 0) {
      return NextResponse.json({ error: 'Table names are required' }, { status: 400 });
    }

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
          
          // Ensure password is a string
          if (credentials && credentials.password && typeof credentials.password !== 'string') {
            credentials.password = String(credentials.password);
          }
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to retrieve connection credentials' },
          { status: 500 }
        );
      }
    }

    // Parse connectionConfig if it's a JSON string
    const connectionConfig = DatabaseJsonHelper.deserialize(environment.connectionConfig as string) || {};

    // Import tables based on connection type
    let importResults = [];
    if (dataAgent.connectionType === 'postgresql') {
      importResults = await importPostgreSQLTables(
        dataAgent.id,
        environmentId,
        connectionConfig,
        credentials,
        tableNames
      );
    } else if (dataAgent.connectionType === 'mysql') {
      importResults = await importMySQLTables(
        dataAgent.id,
        environmentId,
        connectionConfig,
        credentials,
        tableNames
      );
    } else if (dataAgent.connectionType === 'mssql' || dataAgent.connectionType === 'sqlserver') {
      importResults = await importSQLServerTables(
        dataAgent.id,
        environmentId,
        connectionConfig,
        credentials,
        tableNames
      );
    } else if (dataAgent.connectionType === 'db2') {
      importResults = await importDB2Tables(
        dataAgent.id,
        environmentId,
        connectionConfig,
        credentials,
        tableNames
      );
    } else if (dataAgent.connectionType === 'bigquery') {
      importResults = await importBigQueryTables(
        dataAgent.id,
        environmentId,
        connectionConfig,
        credentials,
        tableNames
      );
    } else if (dataAgent.connectionType === 'databricks') {
      importResults = await importDatabricksTables(
        dataAgent.id,
        environmentId,
        connectionConfig,
        credentials,
        tableNames
      );
    } else {
      return NextResponse.json(
        { error: `Connection type '${dataAgent.connectionType}' is not supported yet` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      imported: importResults.length,
      tables: importResults
    });
  } catch (error) {
    console.error('Error importing tables:', error);
    return NextResponse.json(
      { error: 'Failed to import tables' },
      { status: 500 }
    );
  }
}

async function importPostgreSQLTables(
  dataAgentId: string,
  environmentId: string,
  connectionConfig: any,
  credentials: any,
  tableNames: string[]
) {
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
  const importResults = [];

  try {
    for (const tableName of tableNames) {
      try {
        // Get table information
        const tableInfoQuery = `
          SELECT 
            t.table_name,
            t.table_schema,
            obj_description(c.oid, 'pg_class') as table_comment,
            (SELECT COUNT(*) FROM "${schema}"."${tableName}") as row_count
          FROM information_schema.tables t
          LEFT JOIN pg_class c ON c.relname = t.table_name
          WHERE t.table_schema = $1 AND t.table_name = $2
        `;
        
        const tableInfo = await client.query(tableInfoQuery, [schema, tableName]);
        
        if (tableInfo.rows.length === 0) {
          console.warn(`Table ${tableName} not found in schema ${schema}`);
          continue;
        }

        const table = tableInfo.rows[0];

        // Check if table already exists for this environment
        const existingTable = await (prisma.dataAgentTable as any).findUnique({
          where: {
            dataAgentId_environmentId_tableName_schemaName: {
              dataAgentId,
              environmentId,
              tableName: table.table_name,
              schemaName: table.table_schema
            }
          }
        });

        let createdTable;
        if (existingTable) {
          // Update existing table
          createdTable = await (prisma.dataAgentTable as any).update({
            where: { id: existingTable.id },
            data: {
              description: table.table_comment,
              rowCount: parseInt(table.row_count) || 0,
              analysisStatus: 'PENDING'
            }
          });
          console.log(`Updated existing table: ${table.table_name}`);
        } else {
          // Create new table record with environment association
          createdTable = await (prisma.dataAgentTable as any).create({
            data: {
              dataAgentId,
              environmentId, // Associate with environment
              tableName: table.table_name,
              schemaName: table.table_schema,
              description: table.table_comment,
              rowCount: parseInt(table.row_count) || 0,
              analysisStatus: 'PENDING'
            }
          });
          console.log(`Created new table: ${table.table_name}`);
        }

        // Get column information
        const columnsQuery = `
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length,
            numeric_precision,
            numeric_scale,
            col_description(pgc.oid, ordinal_position) as column_comment
          FROM information_schema.columns c
          LEFT JOIN pg_class pgc ON pgc.relname = c.table_name
          WHERE c.table_schema = $1 AND c.table_name = $2
          ORDER BY c.ordinal_position
        `;

        const columns = await client.query(columnsQuery, [schema, tableName]);

        // Get primary key information
        const pkQuery = `
          SELECT a.attname
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = (
            SELECT oid FROM pg_class WHERE relname = $1 AND relnamespace = (
              SELECT oid FROM pg_namespace WHERE nspname = $2
            )
          ) AND i.indisprimary
        `;

        const primaryKeys = await client.query(pkQuery, [tableName, schema]);
        const pkColumns = new Set(primaryKeys.rows.map(row => row.attname));

        // Get foreign key information
        const fkQuery = `
          SELECT 
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = $1
            AND tc.table_schema = $2
        `;

        const foreignKeys = await client.query(fkQuery, [tableName, schema]);
        const fkMap = new Map();
        foreignKeys.rows.forEach(row => {
          fkMap.set(row.column_name, {
            referencedTable: row.foreign_table_name,
            referencedColumn: row.foreign_column_name
          });
        });

        // Create or update column records
        for (const column of columns.rows) {
          const existingColumn = await (prisma.dataAgentTableColumn as any).findFirst({
            where: {
              tableId: createdTable.id,
              columnName: column.column_name
            }
          });

          const fkInfo = fkMap.get(column.column_name);

          if (existingColumn) {
            // Update existing column
            await (prisma.dataAgentTableColumn as any).update({
              where: { id: existingColumn.id },
              data: {
                dataType: column.data_type,
                isNullable: column.is_nullable === 'YES',
                defaultValue: column.column_default,
                comment: column.column_comment,
                isPrimaryKey: pkColumns.has(column.column_name),
                isForeignKey: !!fkInfo,
                referencedTable: fkInfo?.referencedTable || null,
                referencedColumn: fkInfo?.referencedColumn || null
              }
            });
          } else {
            // Create new column
            await (prisma.dataAgentTableColumn as any).create({
              data: {
                tableId: createdTable.id,
                columnName: column.column_name,
                dataType: column.data_type,
                isNullable: column.is_nullable === 'YES',
                defaultValue: column.column_default,
                comment: column.column_comment,
                isPrimaryKey: pkColumns.has(column.column_name),
                isForeignKey: !!fkInfo,
                referencedTable: fkInfo?.referencedTable || null,
                referencedColumn: fkInfo?.referencedColumn || null
              }
            });
          }
        }

        importResults.push({
          tableName: table.table_name,
          schemaName: table.table_schema,
          columnsImported: columns.rows.length,
          rowCount: parseInt(table.row_count) || 0
        });

      } catch (tableError) {
        console.error(`Error importing table ${tableName}:`, tableError);
        // Continue with other tables
      }
    }
  } finally {
    await client.end();
  }

  return importResults;
}

async function importMySQLTables(
  dataAgentId: string,
  environmentId: string,
  connectionConfig: any,
  credentials: any,
  tableNames: string[]
): Promise<any[]> {
  console.log('Starting MySQL table import for tables:', tableNames);
  
  try {
    const mysql = await import('mysql2/promise');
    
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
    });

    const importResults = [];

    try {
      for (const tableName of tableNames) {
        try {
          console.log(`Importing MySQL table: ${tableName}`);
          
          // Get table information
          const [tableInfoRows] = await connection.execute(`
            SELECT 
              TABLE_NAME,
              TABLE_SCHEMA,
              TABLE_ROWS,
              TABLE_COMMENT
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
              AND TABLE_TYPE = 'BASE TABLE'
          `, [connectionConfig.database, tableName]);
          
          if (!Array.isArray(tableInfoRows) || tableInfoRows.length === 0) {
            console.warn(`Table ${tableName} not found in database ${connectionConfig.database}`);
            continue;
          }
          
          const tableInfo = tableInfoRows[0] as any;
          
          // Get actual row count
          const [countRows] = await connection.execute(
            `SELECT COUNT(*) as row_count FROM \`${connectionConfig.database}\`.\`${tableName}\``
          );
          const actualRowCount = (countRows as any[])[0]?.row_count || 0;

          // Check if table already exists for this environment
          const existingTable = await (prisma.dataAgentTable as any).findUnique({
            where: {
              dataAgentId_environmentId_tableName_schemaName: {
                dataAgentId,
                environmentId,
                tableName: tableInfo.TABLE_NAME,
                schemaName: tableInfo.TABLE_SCHEMA
              }
            }
          });

          let createdTable;
          if (existingTable) {
            // Update existing table
            createdTable = await (prisma.dataAgentTable as any).update({
              where: { id: existingTable.id },
              data: {
                description: tableInfo.TABLE_COMMENT || '',
                rowCount: parseInt(actualRowCount) || 0,
                analysisStatus: 'PENDING'
              }
            });
            console.log(`Updated existing MySQL table: ${tableInfo.TABLE_NAME}`);
          } else {
            // Create new table record
            createdTable = await (prisma.dataAgentTable as any).create({
              data: {
                dataAgentId,
                environmentId,
                tableName: tableInfo.TABLE_NAME,
                schemaName: tableInfo.TABLE_SCHEMA,
                description: tableInfo.TABLE_COMMENT || '',
                rowCount: parseInt(actualRowCount) || 0,
                analysisStatus: 'PENDING'
              }
            });
            console.log(`Created new MySQL table: ${tableInfo.TABLE_NAME}`);
          }

          // Get column information
          const [columnsRows] = await connection.execute(`
            SELECT 
              COLUMN_NAME,
              DATA_TYPE,
              IS_NULLABLE,
              COLUMN_DEFAULT,
              CHARACTER_MAXIMUM_LENGTH,
              NUMERIC_PRECISION,
              NUMERIC_SCALE,
              COLUMN_COMMENT,
              COLUMN_KEY
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
          `, [connectionConfig.database, tableName]);

          // Import columns
          if (Array.isArray(columnsRows)) {
            for (const column of columnsRows as any[]) {
              // Check if column already exists
              const existingColumn = await (prisma.dataAgentTableColumn as any).findUnique({
                where: {
                  tableId_columnName: {
                    tableId: createdTable.id,
                    columnName: column.COLUMN_NAME
                  }
                }
              });

              const columnData = {
                tableId: createdTable.id,
                columnName: column.COLUMN_NAME,
                dataType: column.DATA_TYPE,
                isNullable: column.IS_NULLABLE === 'YES',
                defaultValue: column.COLUMN_DEFAULT,
                comment: column.COLUMN_COMMENT || '',
                isPrimaryKey: column.COLUMN_KEY === 'PRI'
              };

              if (existingColumn) {
                await (prisma.dataAgentTableColumn as any).update({
                  where: { id: existingColumn.id },
                  data: columnData
                });
              } else {
                await (prisma.dataAgentTableColumn as any).create({
                  data: columnData
                });
              }
            }
            console.log(`Imported ${columnsRows.length} columns for table ${tableName}`);
          }

          importResults.push({
            tableName: tableInfo.TABLE_NAME,
            schemaName: tableInfo.TABLE_SCHEMA,
            rowCount: parseInt(actualRowCount) || 0,
            columnsImported: Array.isArray(columnsRows) ? columnsRows.length : 0
          });

        } catch (tableError) {
          console.error(`Error importing MySQL table ${tableName}:`, tableError);
        }
      }

      console.log(`MySQL import completed. Successfully imported ${importResults.length} tables.`);
      return importResults;

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('MySQL table import error:', error);
    return [];
  }
}

async function importSQLServerTables(
  dataAgentId: string,
  environmentId: string,
  connectionConfig: any,
  credentials: any,
  tableNames: string[]
): Promise<any[]> {
  console.log('Starting SQL Server table import for tables:', tableNames);
  
  try {
    const sql = await import('mssql');
    
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
    };

    const pool = new sql.ConnectionPool(config);
    await pool.connect();

    const importResults = [];

    try {
      for (const tableName of tableNames) {
        try {
          console.log(`Importing SQL Server table: ${tableName}`);
          
          // Get table information
          const tableInfoResult = await pool.request().query(`
            SELECT 
              t.TABLE_NAME,
              t.TABLE_SCHEMA,
              ep.value as TABLE_COMMENT
            FROM INFORMATION_SCHEMA.TABLES t
            LEFT JOIN sys.tables st ON st.name = t.TABLE_NAME
            LEFT JOIN sys.extended_properties ep ON st.object_id = ep.major_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
            WHERE t.TABLE_NAME = '${tableName}' 
              AND t.TABLE_TYPE = 'BASE TABLE'
              AND t.TABLE_SCHEMA NOT IN ('sys', 'information_schema')
          `);
          
          if (tableInfoResult.recordset.length === 0) {
            console.warn(`Table ${tableName} not found in SQL Server database`);
            continue;
          }
          
          const tableInfo = tableInfoResult.recordset[0];
          
          // Get actual row count
          const countResult = await pool.request().query(
            `SELECT COUNT(*) as row_count FROM [${tableInfo.TABLE_SCHEMA}].[${tableName}]`
          );
          const actualRowCount = countResult.recordset[0]?.row_count || 0;

          // Check if table already exists for this environment
          const existingTable = await (prisma.dataAgentTable as any).findUnique({
            where: {
              dataAgentId_environmentId_tableName_schemaName: {
                dataAgentId,
                environmentId,
                tableName: tableInfo.TABLE_NAME,
                schemaName: tableInfo.TABLE_SCHEMA
              }
            }
          });

          let createdTable;
          if (existingTable) {
            // Update existing table
            createdTable = await (prisma.dataAgentTable as any).update({
              where: { id: existingTable.id },
              data: {
                description: tableInfo.TABLE_COMMENT || '',
                rowCount: parseInt(actualRowCount) || 0,
                analysisStatus: 'PENDING'
              }
            });
            console.log(`Updated existing SQL Server table: ${tableInfo.TABLE_NAME}`);
          } else {
            // Create new table record
            createdTable = await (prisma.dataAgentTable as any).create({
              data: {
                dataAgentId,
                environmentId,
                tableName: tableInfo.TABLE_NAME,
                schemaName: tableInfo.TABLE_SCHEMA,
                description: tableInfo.TABLE_COMMENT || '',
                rowCount: parseInt(actualRowCount) || 0,
                analysisStatus: 'PENDING'
              }
            });
            console.log(`Created new SQL Server table: ${tableInfo.TABLE_NAME}`);
          }

          // Get column information
          const columnsResult = await pool.request().query(`
            SELECT 
              c.COLUMN_NAME,
              c.DATA_TYPE,
              c.IS_NULLABLE,
              c.COLUMN_DEFAULT,
              c.CHARACTER_MAXIMUM_LENGTH,
              c.NUMERIC_PRECISION,
              c.NUMERIC_SCALE,
              ep.value as COLUMN_COMMENT
            FROM INFORMATION_SCHEMA.COLUMNS c
            LEFT JOIN sys.columns sc ON sc.name = c.COLUMN_NAME
            LEFT JOIN sys.tables st ON st.name = c.TABLE_NAME AND st.object_id = sc.object_id
            LEFT JOIN sys.extended_properties ep ON sc.object_id = ep.major_id AND sc.column_id = ep.minor_id AND ep.name = 'MS_Description'
            WHERE c.TABLE_SCHEMA = '${tableInfo.TABLE_SCHEMA}' AND c.TABLE_NAME = '${tableName}'
            ORDER BY c.ORDINAL_POSITION
          `);

          // Import columns
          if (columnsResult.recordset.length > 0) {
            for (const column of columnsResult.recordset) {
              // Check if column already exists
              const existingColumn = await (prisma.dataAgentTableColumn as any).findUnique({
                where: {
                  tableId_columnName: {
                    tableId: createdTable.id,
                    columnName: column.COLUMN_NAME
                  }
                }
              });

              const columnData = {
                tableId: createdTable.id,
                columnName: column.COLUMN_NAME,
                dataType: column.DATA_TYPE,
                isNullable: column.IS_NULLABLE === 'YES',
                defaultValue: column.COLUMN_DEFAULT,
                comment: column.COLUMN_COMMENT || ''
              };

              if (existingColumn) {
                await (prisma.dataAgentTableColumn as any).update({
                  where: { id: existingColumn.id },
                  data: columnData
                });
              } else {
                await (prisma.dataAgentTableColumn as any).create({
                  data: columnData
                });
              }
            }
            console.log(`Imported ${columnsResult.recordset.length} columns for table ${tableName}`);
          }

          importResults.push({
            tableName: tableInfo.TABLE_NAME,
            schemaName: tableInfo.TABLE_SCHEMA,
            rowCount: parseInt(actualRowCount) || 0,
            columnsImported: columnsResult.recordset.length
          });

        } catch (tableError) {
          console.error(`Error importing SQL Server table ${tableName}:`, tableError);
        }
      }

      console.log(`SQL Server import completed. Successfully imported ${importResults.length} tables.`);
      return importResults;

    } finally {
      await pool.close();
    }

  } catch (error) {
    console.error('SQL Server table import error:', error);
    return [];
  }
}

async function importDB2Tables(
  dataAgentId: string,
  environmentId: string,
  connectionConfig: any,
  credentials: any,
  tableNames: string[]
): Promise<any[]> {
  console.log('Starting DB2 table import for tables:', tableNames);
  
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
      console.warn('DB2 driver not available:', importError instanceof Error ? importError.message : 'Unknown import error');
      return [];
    }

    // Build connection string
    const host = connectionConfig.host === 'localhost' ? '127.0.0.1' : connectionConfig.host;
    const port = connectionConfig.port || 50000;
    const connStr = `DATABASE=${connectionConfig.database};HOSTNAME=${host};PORT=${port};PROTOCOL=TCPIP;UID=${credentials.username};PWD=${credentials.password};CONNECTTIMEOUT=10;QUERYTIMEOUT=30;`;
    
    return new Promise<any[]>((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        console.warn('DB2 connection timeout during import');
        resolve([]);
      }, 15000);
      
      try {
        ibmdb.open(connStr, async (err: any, conn: any) => {
          clearTimeout(connectionTimeout);
          
          if (err) {
            console.warn(`DB2 connection failed during import: ${err.message}`);
            resolve([]);
            return;
          }
          
          console.log('DB2 connection successful for import');
          const importResults = [];
          
          try {
            for (const tableName of tableNames) {
              try {
                console.log(`Importing DB2 table: ${tableName}`);
                
                // Get table information
                const tableInfoQuery = `
                  SELECT 
                    TABNAME,
                    TABSCHEMA,
                    CARD,
                    REMARKS
                  FROM SYSCAT.TABLES 
                  WHERE TABNAME = '${tableName}' 
                    AND TABSCHEMA NOT IN ('SYSIBM', 'SYSCAT', 'SYSSTAT', 'SYSTOOLS', 'SYSPROC', 'SYSIBMADM', 'SYSFUN', 'SYSIBMINTERNAL', 'SYSIBMTS')
                    AND TYPE = 'T'
                `;
                
                const tableInfoResult = await new Promise((tableResolve) => {
                  conn.query(tableInfoQuery, (tableErr: any, tableRes: any) => {
                    if (tableErr) {
                      console.warn(`Failed to get table info for ${tableName}: ${tableErr.message}`);
                      tableResolve([]);
                    } else {
                      tableResolve(tableRes || []);
                    }
                  });
                });
                
                if (!Array.isArray(tableInfoResult) || tableInfoResult.length === 0) {
                  console.warn(`Table ${tableName} not found or not accessible`);
                  continue;
                }
                
                const tableInfo = tableInfoResult[0] as any;
                const schemaName = tableInfo.TABSCHEMA;
                
                // Get actual row count if CARD is -1
                let rowCount = parseInt(tableInfo.CARD) || 0;
                if (rowCount < 0) {
                  const countResult = await new Promise((countResolve) => {
                    const countQuery = `SELECT COUNT(*) as row_count FROM "${schemaName}"."${tableName}"`;
                    conn.query(countQuery, (countErr: any, countRes: any) => {
                      if (countErr) {
                        console.warn(`Count query failed for ${tableName}: ${countErr.message}`);
                        countResolve(0);
                      } else {
                        countResolve(countRes?.[0]?.ROW_COUNT || 0);
                      }
                    });
                  });
                  rowCount = parseInt(countResult as string) || 0;
                }

                // Check if table already exists for this environment
                const existingTable = await (prisma.dataAgentTable as any).findUnique({
                  where: {
                    dataAgentId_environmentId_tableName_schemaName: {
                      dataAgentId,
                      environmentId,
                      tableName: tableInfo.TABNAME,
                      schemaName: schemaName
                    }
                  }
                });

                let createdTable;
                if (existingTable) {
                  // Update existing table
                  createdTable = await (prisma.dataAgentTable as any).update({
                    where: { id: existingTable.id },
                    data: {
                      description: tableInfo.REMARKS || '',
                      rowCount: rowCount,
                      analysisStatus: 'PENDING'
                    }
                  });
                  console.log(`Updated existing DB2 table: ${tableInfo.TABNAME}`);
                } else {
                  // Create new table record
                  createdTable = await (prisma.dataAgentTable as any).create({
                    data: {
                      dataAgentId,
                      environmentId,
                      tableName: tableInfo.TABNAME,
                      schemaName: schemaName,
                      description: tableInfo.REMARKS || '',
                      rowCount: rowCount,
                      analysisStatus: 'PENDING'
                    }
                  });
                  console.log(`Created new DB2 table: ${tableInfo.TABNAME}`);
                }

                // Get column information
                const columnsQuery = `
                  SELECT 
                    COLNAME,
                    TYPENAME,
                    NULLS,
                    DEFAULT,
                    LENGTH,
                    SCALE,
                    REMARKS
                  FROM SYSCAT.COLUMNS 
                  WHERE TABSCHEMA = '${schemaName}' 
                    AND TABNAME = '${tableName}'
                  ORDER BY COLNO
                `;
                
                const columnsResult = await new Promise((columnsResolve) => {
                  conn.query(columnsQuery, (columnsErr: any, columnsRes: any) => {
                    if (columnsErr) {
                      console.warn(`Failed to get columns for ${tableName}: ${columnsErr.message}`);
                      columnsResolve([]);
                    } else {
                      columnsResolve(columnsRes || []);
                    }
                  });
                });

                // Import columns
                if (Array.isArray(columnsResult)) {
                  for (const column of columnsResult as any[]) {
                    // Check if column already exists
                    const existingColumn = await (prisma.dataAgentTableColumn as any).findUnique({
                      where: {
                        tableId_columnName: {
                          tableId: createdTable.id,
                          columnName: column.COLNAME
                        }
                      }
                    });

                    const columnData = {
                      tableId: createdTable.id,
                      columnName: column.COLNAME,
                      dataType: column.TYPENAME,
                      isNullable: column.NULLS === 'Y',
                      defaultValue: column.DEFAULT,
                      comment: column.REMARKS || ''
                    };

                    if (existingColumn) {
                      await (prisma.dataAgentTableColumn as any).update({
                        where: { id: existingColumn.id },
                        data: columnData
                      });
                    } else {
                      await (prisma.dataAgentTableColumn as any).create({
                        data: columnData
                      });
                    }
                  }
                  console.log(`Imported ${columnsResult.length} columns for table ${tableName}`);
                }

                importResults.push({
                  tableName: tableInfo.TABNAME,
                  schemaName: schemaName,
                  rowCount: rowCount,
                  columnsImported: Array.isArray(columnsResult) ? columnsResult.length : 0
                });

              } catch (tableError) {
                console.error(`Error importing table ${tableName}:`, tableError);
              }
            }

            conn.close();
            console.log(`DB2 import completed. Successfully imported ${importResults.length} tables.`);
            resolve(importResults);
            
          } catch (importError) {
            conn.close();
            console.error('Error during DB2 table import:', importError);
            resolve([]);
          }
        });
      } catch (openError) {
        clearTimeout(connectionTimeout);
        console.error('Failed to open DB2 connection for import:', openError);
        resolve([]);
      }
    });

  } catch (error) {
    console.error('DB2 table import error:', error);
    return [];
  }
}

async function importBigQueryTables(
  dataAgentId: string,
  environmentId: string,
  connectionConfig: any,
  credentials: any,
  tableNames: string[]
): Promise<any[]> {
  console.log('Starting BigQuery table import for tables:', tableNames);
  
  try {
    const { BigQuery } = await import('@google-cloud/bigquery');
    
    console.log('=== BigQuery Import Debug ===');
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
        console.log('BigQuery config set with credentials for import');
      } catch (parseError) {
        console.error('JSON parsing error in import:', parseError);
        return [];
      }
    } else if (credentials?.serviceAccountKey) {
      // Legacy support for serviceAccountKey
      const serviceAccount = JSON.parse(credentials.serviceAccountKey);
      bigqueryConfig.credentials = serviceAccount;
      console.log('BigQuery config set with legacy serviceAccountKey for import');
    } else if (credentials?.keyFile) {
      bigqueryConfig.keyFilename = credentials.keyFile;
      console.log('BigQuery config set with keyFilename for import');
    } else {
      console.error('No BigQuery credentials found for import');
      return [];
    }

    const bigquery = new BigQuery(bigqueryConfig);

    // Check for dataset ID in multiple possible fields
    const datasetId = connectionConfig.dataset || connectionConfig.datasetId || connectionConfig.database;
    console.log('Looking for dataset ID for import:', {
      dataset: connectionConfig.dataset,
      datasetId: connectionConfig.datasetId,
      database: connectionConfig.database,
      finalDatasetId: datasetId
    });
    
    if (!datasetId) {
      console.warn('No dataset specified for BigQuery table import');
      return [];
    }

    const dataset = bigquery.dataset(datasetId);
    const importResults = [];

    for (const tableName of tableNames) {
      try {
        console.log(`Importing BigQuery table: ${tableName}`);
        
        const table = dataset.table(tableName);
        const [metadata] = await table.getMetadata();
        
        if (!metadata) {
          console.warn(`Table ${tableName} not found in dataset ${datasetId}`);
          continue;
        }

        const rowCount = parseInt(metadata.numRows) || 0;

        // Check if table already exists for this environment
        const existingTable = await (prisma.dataAgentTable as any).findUnique({
          where: {
            dataAgentId_environmentId_tableName_schemaName: {
              dataAgentId,
              environmentId,
              tableName: metadata.tableReference.tableId,
              schemaName: metadata.tableReference.datasetId
            }
          }
        });

        let createdTable;
        if (existingTable) {
          // Update existing table
          createdTable = await (prisma.dataAgentTable as any).update({
            where: { id: existingTable.id },
            data: {
              description: metadata.description || '',
              rowCount: rowCount,
              analysisStatus: 'PENDING'
            }
          });
          console.log(`Updated existing BigQuery table: ${metadata.tableReference.tableId}`);
        } else {
          // Create new table record
          createdTable = await (prisma.dataAgentTable as any).create({
            data: {
              dataAgentId,
              environmentId,
              tableName: metadata.tableReference.tableId,
              schemaName: metadata.tableReference.datasetId,
              description: metadata.description || '',
              rowCount: rowCount,
              analysisStatus: 'PENDING'
            }
          });
          console.log(`Created new BigQuery table: ${metadata.tableReference.tableId}`);
        }

        // Import columns from schema
        if (metadata.schema && metadata.schema.fields) {
          for (const field of metadata.schema.fields) {
            // Check if column already exists
            const existingColumn = await (prisma.dataAgentTableColumn as any).findUnique({
              where: {
                tableId_columnName: {
                  tableId: createdTable.id,
                  columnName: field.name
                }
              }
            });

            const columnData = {
              tableId: createdTable.id,
              columnName: field.name,
              dataType: field.type,
              isNullable: field.mode !== 'REQUIRED',
              defaultValue: field.defaultValueExpression || null,
              comment: field.description || ''
            };

            if (existingColumn) {
              await (prisma.dataAgentTableColumn as any).update({
                where: { id: existingColumn.id },
                data: columnData
              });
            } else {
              await (prisma.dataAgentTableColumn as any).create({
                data: columnData
              });
            }
          }
          console.log(`Imported ${metadata.schema.fields.length} columns for table ${tableName}`);
        }

        importResults.push({
          tableName: metadata.tableReference.tableId,
          schemaName: metadata.tableReference.datasetId,
          rowCount: rowCount,
          columnsImported: metadata.schema?.fields?.length || 0
        });

      } catch (tableError) {
        console.error(`Error importing BigQuery table ${tableName}:`, tableError);
      }
    }

    console.log(`BigQuery import completed. Successfully imported ${importResults.length} tables.`);
    return importResults;

  } catch (error) {
    console.error('BigQuery table import error:', error);
    return [];
  }
}

async function importDatabricksTables(
  dataAgentId: string,
  environmentId: string,
  connectionConfig: any,
  credentials: any,
  tableNames: string[]
): Promise<any[]> {
  console.log('Starting Databricks table import for tables:', tableNames);
  
  try {
    const serverHostname = connectionConfig.serverHostname || connectionConfig.host;
    const httpPath = connectionConfig.httpPath;
    const accessToken = credentials.accessToken || credentials.token;

    if (!serverHostname || !httpPath || !accessToken) {
      console.warn('Missing required Databricks connection parameters for import');
      return [];
    }

    const catalog = connectionConfig.catalog || 'hive_metastore';
    const schema = connectionConfig.schema || 'default';
    const importResults = [];

    for (const tableName of tableNames) {
      try {
        console.log(`Importing Databricks table: ${tableName}`);

        // Get table information using DESCRIBE TABLE
        const describeQuery = `DESCRIBE TABLE ${catalog}.${schema}.${tableName}`;
        const describeResponse = await fetch(`https://${serverHostname}/api/2.0/sql/statements`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            statement: describeQuery,
            warehouse_id: connectionConfig.warehouseId
          })
        });

        if (!describeResponse.ok) {
          console.warn(`Failed to describe table ${tableName}: ${describeResponse.statusText}`);
          continue;
        }

        const describeResult = await describeResponse.json();
        
        if (describeResult.status?.state !== 'SUCCEEDED' || !describeResult.result?.data_array) {
          console.warn(`Table ${tableName} describe query failed or returned no results`);
          continue;
        }

        // Get row count
        let rowCount = 0;
        try {
          const countQuery = `SELECT COUNT(*) as row_count FROM ${catalog}.${schema}.${tableName} LIMIT 1`;
          const countResponse = await fetch(`https://${serverHostname}/api/2.0/sql/statements`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              statement: countQuery,
              warehouse_id: connectionConfig.warehouseId
            })
          });

          if (countResponse.ok) {
            const countResult = await countResponse.json();
            if (countResult.status?.state === 'SUCCEEDED' && countResult.result?.data_array) {
              rowCount = parseInt(countResult.result.data_array[0][0]) || 0;
            }
          }
        } catch (countError) {
          console.warn(`Failed to get row count for table ${tableName}:`, countError);
        }

        // Check if table already exists for this environment
        const existingTable = await (prisma.dataAgentTable as any).findUnique({
          where: {
            dataAgentId_environmentId_tableName_schemaName: {
              dataAgentId,
              environmentId,
              tableName: tableName,
              schemaName: schema
            }
          }
        });

        let createdTable;
        if (existingTable) {
          // Update existing table
          createdTable = await (prisma.dataAgentTable as any).update({
            where: { id: existingTable.id },
            data: {
              description: `Databricks table in ${catalog}.${schema}`,
              rowCount: rowCount,
              analysisStatus: 'PENDING'
            }
          });
          console.log(`Updated existing Databricks table: ${tableName}`);
        } else {
          // Create new table record
          createdTable = await (prisma.dataAgentTable as any).create({
            data: {
              dataAgentId,
              environmentId,
              tableName: tableName,
              schemaName: schema,
              description: `Databricks table in ${catalog}.${schema}`,
              rowCount: rowCount,
              analysisStatus: 'PENDING'
            }
          });
          console.log(`Created new Databricks table: ${tableName}`);
        }

        // Process columns from DESCRIBE TABLE result
        const columns = describeResult.result.data_array;
        let columnCount = 0;

        for (const columnRow of columns) {
          // Databricks DESCRIBE TABLE returns: [col_name, data_type, comment]
          if (columnRow.length >= 2 && columnRow[0] && columnRow[1]) {
            const columnName = columnRow[0];
            const dataType = columnRow[1];
            const comment = columnRow[2] || '';

            // Skip partition information and other metadata rows
            if (columnName.startsWith('#') || columnName === '' || 
                columnName.toLowerCase().includes('partition') ||
                columnName.toLowerCase().includes('detailed table')) {
              continue;
            }

            // Check if column already exists
            const existingColumn = await (prisma.dataAgentTableColumn as any).findUnique({
              where: {
                tableId_columnName: {
                  tableId: createdTable.id,
                  columnName: columnName
                }
              }
            });

            const columnData = {
              tableId: createdTable.id,
              columnName: columnName,
              dataType: dataType,
              isNullable: !dataType.toLowerCase().includes('not null'), // Basic nullable detection
              defaultValue: null,
              comment: comment
            };

            if (existingColumn) {
              await (prisma.dataAgentTableColumn as any).update({
                where: { id: existingColumn.id },
                data: columnData
              });
            } else {
              await (prisma.dataAgentTableColumn as any).create({
                data: columnData
              });
            }
            columnCount++;
          }
        }

        console.log(`Imported ${columnCount} columns for table ${tableName}`);

        importResults.push({
          tableName: tableName,
          schemaName: schema,
          rowCount: rowCount,
          columnsImported: columnCount
        });

      } catch (tableError) {
        console.error(`Error importing Databricks table ${tableName}:`, tableError);
      }
    }

    console.log(`Databricks import completed. Successfully imported ${importResults.length} tables.`);
    return importResults;

  } catch (error) {
    console.error('Databricks table import error:', error);
    return [];
  }
}
