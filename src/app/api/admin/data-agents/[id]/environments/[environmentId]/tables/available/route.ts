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
    let tables = [];
    if (dataAgent.connectionType === 'postgresql') {
      tables = await getPostgreSQLTables(environment.connectionConfig, credentials);
    } else {
      return NextResponse.json(
        { error: `Connection type '${dataAgent.connectionType}' is not supported yet` },
        { status: 400 }
      );
    }

    return NextResponse.json(tables);
  } catch (error) {
    console.error('Error fetching available tables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available tables' },
      { status: 500 }
    );
  }
}

async function getPostgreSQLTables(connectionConfig: any, credentials: any) {
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
    console.error('PostgreSQL tables fetch error:', error);
    throw new Error(`Failed to fetch tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
