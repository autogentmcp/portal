import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

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

    // Import tables based on connection type
    let importResults = [];
    if (dataAgent.connectionType === 'postgresql') {
      importResults = await importPostgreSQLTables(
        dataAgent.id,
        environmentId,
        environment.connectionConfig,
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
  
  const config = {
    host: connectionConfig.host,
    port: parseInt(connectionConfig.port) || 5432,
    database: connectionConfig.database,
    user: user,
    password: passwordStr,
    connectionTimeoutMillis: 10000,
    ssl: connectionConfig.ssl === 'true' ? { rejectUnauthorized: false } : false
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

        // Create or update column records
        for (const column of columns.rows) {
          const existingColumn = await (prisma.dataAgentTableColumn as any).findFirst({
            where: {
              tableId: createdTable.id,
              columnName: column.column_name
            }
          });

          if (existingColumn) {
            // Update existing column
            await (prisma.dataAgentTableColumn as any).update({
              where: { id: existingColumn.id },
              data: {
                dataType: column.data_type,
                isNullable: column.is_nullable === 'YES',
                defaultValue: column.column_default,
                comment: column.column_comment,
                isPrimaryKey: pkColumns.has(column.column_name)
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
                isPrimaryKey: pkColumns.has(column.column_name)
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
