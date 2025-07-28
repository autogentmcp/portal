// Database connection utilities for different database types
// This file centralizes database connection logic for data agents

export interface DatabaseConfig {
  host?: string;
  hostname?: string;
  port?: number;
  database?: string;
  filename?: string; // For SQLite
  projectId?: string; // For BigQuery
  serverHostname?: string; // For Databricks
  server?: string; // For SQL Server
  ssl?: boolean; // Legacy support
  sslMode?: string; // PostgreSQL/MySQL SSL modes: disable, require, verify-ca, verify-full
  encrypt?: boolean;
  trustServerCertificate?: boolean;
  instance?: string;
  connectionTimeout?: number;
  applicationName?: string;
}

export interface DatabaseCredentials {
  username?: string;
  user?: string;
  password?: string;
  accessToken?: string; // For Databricks
  serviceAccountPath?: string; // For BigQuery
  serviceAccountJson?: string; // For BigQuery
}

export interface DatabaseTable {
  name: string;
  schema?: string;
  description?: string;
  rowCount?: number;
}

export interface DatabaseColumn {
  name: string;
  dataType: string;
  isNullable?: boolean;
  defaultValue?: string;
  comment?: string;
  isIndexed?: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

export class DatabaseConnectionManager {
  
  /**
   * Test database connection
   */
  static async testConnection(
    connectionType: string,
    config: DatabaseConfig,
    credentials: DatabaseCredentials
  ): Promise<{ success: boolean; message: string; error?: string }> {
    
    try {
      switch (connectionType.toLowerCase()) {
        case 'postgres':
        case 'postgresql':
          return await this.testPostgresConnection(config, credentials);
        
        case 'mysql':
          return await this.testMySQLConnection(config, credentials);
        
        case 'mssql':
        case 'sqlserver':
          return await this.testMSSQLConnection(config, credentials);
        
        case 'bigquery':
          return await this.testBigQueryConnection(config, credentials);
        
        case 'databricks':
          return await this.testDatabricksConnection(config, credentials);
        
        case 'db2':
          return await this.testDB2Connection(config, credentials);
        
        default:
          return {
            success: false,
            message: `Connection type '${connectionType}' is not supported`,
            error: 'UNSUPPORTED_TYPE'
          };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Connection test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get available tables from database
   */
  static async getTables(
    connectionType: string,
    config: DatabaseConfig,
    credentials: DatabaseCredentials
  ): Promise<DatabaseTable[]> {
    
    try {
      switch (connectionType.toLowerCase()) {
        case 'postgres':
        case 'postgresql':
          return await this.getPostgresTables(config, credentials);
        
        case 'mysql':
          return await this.getMySQLTables(config, credentials);
        
        case 'mssql':
        case 'sqlserver':
          return await this.getMSSQLTables(config, credentials);
        
        case 'bigquery':
          return await this.getBigQueryTables(config, credentials);
        
        case 'databricks':
          return await this.getDatabricksTables(config, credentials);
        
        case 'db2':
          return await this.getDB2Tables(config, credentials);
        
        default:
          throw new Error(`Connection type '${connectionType}' is not supported`);
      }
    } catch (error) {
      throw new Error(`Failed to get tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get table columns
   */
  static async getTableColumns(
    connectionType: string,
    config: DatabaseConfig,
    credentials: DatabaseCredentials,
    tableName: string,
    schemaName?: string
  ): Promise<DatabaseColumn[]> {
    
    try {
      switch (connectionType.toLowerCase()) {
        case 'postgres':
        case 'postgresql':
          return await this.getPostgresColumns(config, credentials, tableName, schemaName);
        
        case 'mysql':
          return await this.getMySQLColumns(config, credentials, tableName, schemaName);
        
        case 'mssql':
        case 'sqlserver':
          return await this.getMSSQLColumns(config, credentials, tableName, schemaName);
        
        case 'bigquery':
          return await this.getBigQueryColumns(config, credentials, tableName, schemaName);
        
        case 'databricks':
          return await this.getDatabricksColumns(config, credentials, tableName, schemaName);
        
        case 'db2':
          return await this.getDB2Columns(config, credentials, tableName, schemaName);
        
        default:
          throw new Error(`Connection type '${connectionType}' is not supported`);
      }
    } catch (error) {
      throw new Error(`Failed to get table columns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Query sample data from a table
   */
  static async querySampleData(
    connectionType: string,
    config: DatabaseConfig,
    credentials: DatabaseCredentials,
    tableName: string,
    schemaName?: string,
    limit: number = 10
  ): Promise<any[]> {
    
    try {
      switch (connectionType.toLowerCase()) {
        case 'postgres':
        case 'postgresql':
          return await this.queryPostgresSampleData(config, credentials, tableName, schemaName, limit);
        
        case 'mysql':
          return await this.queryMySQLSampleData(config, credentials, tableName, schemaName, limit);
        
        case 'mssql':
        case 'sqlserver':
          return await this.queryMSSQLSampleData(config, credentials, tableName, schemaName, limit);
        
        case 'bigquery':
          return await this.queryBigQuerySampleData(config, credentials, tableName, schemaName, limit);
        
        case 'databricks':
          return await this.queryDatabricksSampleData(config, credentials, tableName, schemaName, limit);
        
        case 'db2':
          return await this.queryDB2SampleData(config, credentials, tableName, schemaName, limit);
        
        default:
          throw new Error(`Connection type '${connectionType}' is not supported`);
      }
    } catch (error) {
      throw new Error(`Failed to query sample data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // PostgreSQL connection methods
  private static async testPostgresConnection(config: DatabaseConfig, credentials: DatabaseCredentials) {
    try {
      const { Client } = require('pg');
      
      let sslConfig: false | object = false;
      if (config.sslMode && config.sslMode !== 'disable') {
        sslConfig = { mode: config.sslMode };
        
        if (config.sslMode === 'require') {
          sslConfig = { rejectUnauthorized: false };
        } else {
          sslConfig = {
            mode: config.sslMode,
            rejectUnauthorized: config.sslMode === 'verify-full'
          };
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

      await client.connect();
      await client.query('SELECT 1');
      await client.end();

      return {
        success: true,
        message: 'PostgreSQL connection successful'
      };
    } catch (error) {
      return {
        success: false,
        message: 'PostgreSQL connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static async getPostgresTables(config: DatabaseConfig, credentials: DatabaseCredentials): Promise<DatabaseTable[]> {
    const { Client } = require('pg');
    
    let sslConfig: false | object = false;
    if (config.sslMode && config.sslMode !== 'disable') {
      sslConfig = { mode: config.sslMode };
      
      if (config.sslMode === 'require') {
        sslConfig = { rejectUnauthorized: false };
      } else {
        sslConfig = {
          mode: config.sslMode,
          rejectUnauthorized: config.sslMode === 'verify-full'
        };
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
        AND t.table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY t.table_schema, t.table_name;
      `;
      
      const result = await client.query(query);
      
      return result.rows.map((row: any) => ({
        name: row.name,
        schema: row.schema,
        description: row.description || undefined,
        rowCount: row.row_count || undefined
      }));
    } finally {
      await client.end();
    }
  }

  private static async getPostgresColumns(config: DatabaseConfig, credentials: DatabaseCredentials, tableName: string, schemaName?: string): Promise<DatabaseColumn[]> {
    const { Client } = require('pg');
    
    let sslConfig: false | object = false;
    if (config.sslMode && config.sslMode !== 'disable') {
      sslConfig = { mode: config.sslMode };
      
      if (config.sslMode === 'require') {
        sslConfig = { rejectUnauthorized: false };
      } else {
        sslConfig = {
          mode: config.sslMode,
          rejectUnauthorized: config.sslMode === 'verify-full'
        };
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
      
      const query = `
        SELECT 
          column_name as name,
          data_type,
          is_nullable = 'YES' as is_nullable,
          column_default as default_value,
          character_maximum_length as max_length,
          numeric_precision as precision,
          numeric_scale as scale
        FROM information_schema.columns
        WHERE table_name = $1
        ${schemaName ? 'AND table_schema = $2' : ''}
        ORDER BY ordinal_position;
      `;
      
      const params = schemaName ? [tableName, schemaName] : [tableName];
      const result = await client.query(query, params);
      
      return result.rows.map((row: any) => ({
        name: row.name,
        dataType: row.data_type,
        isNullable: row.is_nullable,
        defaultValue: row.default_value,
        maxLength: row.max_length,
        precision: row.precision,
        scale: row.scale
      }));
    } finally {
      await client.end();
    }
  }

  private static async queryPostgresSampleData(config: DatabaseConfig, credentials: DatabaseCredentials, tableName: string, schemaName?: string, limit: number = 10): Promise<any[]> {
    const { Client } = require('pg');
    
    let sslConfig: false | object = false;
    if (config.sslMode && config.sslMode !== 'disable') {
      sslConfig = { mode: config.sslMode };
      
      if (config.sslMode === 'require') {
        sslConfig = { rejectUnauthorized: false };
      } else {
        sslConfig = {
          mode: config.sslMode,
          rejectUnauthorized: config.sslMode === 'verify-full'
        };
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
      
      const fullTableName = schemaName ? `"${schemaName}"."${tableName}"` : `"${tableName}"`;
      const query = `SELECT * FROM ${fullTableName} LIMIT $1`;
      
      const result = await client.query(query, [limit]);
      return result.rows;
    } finally {
      await client.end();
    }
  }

  // MySQL connection methods
  private static async testMySQLConnection(config: DatabaseConfig, credentials: DatabaseCredentials) {
    try {
      const mysql = require('mysql2/promise');
      
      let sslConfig: false | object = false;
      if (config.sslMode && config.sslMode !== 'disable') {
        if (config.sslMode === 'require') {
          sslConfig = { rejectUnauthorized: false };
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

      await connection.execute('SELECT 1');
      await connection.end();

      return {
        success: true,
        message: 'MySQL connection successful'
      };
    } catch (error) {
      return {
        success: false,
        message: 'MySQL connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static async getMySQLTables(config: DatabaseConfig, credentials: DatabaseCredentials): Promise<DatabaseTable[]> {
    const mysql = require('mysql2/promise');
    
    let sslConfig: false | object = false;
    if (config.sslMode && config.sslMode !== 'disable') {
      if (config.sslMode === 'require') {
        sslConfig = { rejectUnauthorized: false };
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
          TABLE_SCHEMA as schema,
          TABLE_COMMENT as description,
          TABLE_ROWS as row_count
        FROM information_schema.tables
        WHERE TABLE_TYPE = 'BASE TABLE'
        AND TABLE_SCHEMA = DATABASE()
        ORDER BY TABLE_NAME;
      `);
      
      return (rows as any[]).map((row: any) => ({
        name: row.name,
        schema: row.schema,
        description: row.description || undefined,
        rowCount: row.row_count || undefined
      }));
    } finally {
      await connection.end();
    }
  }

  private static async getMySQLColumns(config: DatabaseConfig, credentials: DatabaseCredentials, tableName: string, schemaName?: string): Promise<DatabaseColumn[]> {
    const mysql = require('mysql2/promise');
    
    let sslConfig: false | object = false;
    if (config.sslMode && config.sslMode !== 'disable') {
      if (config.sslMode === 'require') {
        sslConfig = { rejectUnauthorized: false };
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
          COLUMN_NAME as name,
          DATA_TYPE as data_type,
          IS_NULLABLE = 'YES' as is_nullable,
          COLUMN_DEFAULT as default_value,
          CHARACTER_MAXIMUM_LENGTH as max_length,
          NUMERIC_PRECISION as precision,
          NUMERIC_SCALE as scale,
          COLUMN_KEY = 'PRI' as is_primary_key
        FROM information_schema.columns
        WHERE TABLE_NAME = ?
        AND TABLE_SCHEMA = COALESCE(?, DATABASE())
        ORDER BY ORDINAL_POSITION;
      `, [tableName, schemaName]);
      
      return (rows as any[]).map((row: any) => ({
        name: row.name,
        dataType: row.data_type,
        isNullable: row.is_nullable,
        defaultValue: row.default_value,
        maxLength: row.max_length,
        precision: row.precision,
        scale: row.scale,
        isPrimaryKey: row.is_primary_key
      }));
    } finally {
      await connection.end();
    }
  }

  private static async queryMySQLSampleData(config: DatabaseConfig, credentials: DatabaseCredentials, tableName: string, schemaName?: string, limit: number = 10): Promise<any[]> {
    const mysql = require('mysql2/promise');
    
    let sslConfig: false | object = false;
    if (config.sslMode && config.sslMode !== 'disable') {
      if (config.sslMode === 'require') {
        sslConfig = { rejectUnauthorized: false };
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
      const fullTableName = schemaName ? `\`${schemaName}\`.\`${tableName}\`` : `\`${tableName}\``;
      const [rows] = await connection.execute(`SELECT * FROM ${fullTableName} LIMIT ?`, [limit]);
      return rows as any[];
    } finally {
      await connection.end();
    }
  }

  // MSSQL connection methods
  private static async testMSSQLConnection(config: DatabaseConfig, credentials: DatabaseCredentials) {
    try {
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
      await pool.request().query('SELECT 1 as test');
      await pool.close();

      return {
        success: true,
        message: 'Microsoft SQL Server connection successful'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Microsoft SQL Server connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static async getMSSQLTables(config: DatabaseConfig, credentials: DatabaseCredentials): Promise<DatabaseTable[]> {
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
      const result = await pool.request().query(`
        SELECT 
          t.TABLE_NAME as name,
          t.TABLE_SCHEMA as schema,
          ep.value as description,
          p.rows as row_count
        FROM INFORMATION_SCHEMA.TABLES t
        LEFT JOIN sys.tables st ON st.name = t.TABLE_NAME
        LEFT JOIN sys.extended_properties ep ON ep.major_id = st.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
        LEFT JOIN sys.partitions p ON p.object_id = st.object_id AND p.index_id < 2
        WHERE t.TABLE_TYPE = 'BASE TABLE'
        ORDER BY t.TABLE_SCHEMA, t.TABLE_NAME;
      `);
      
      return result.recordset.map((row: any) => ({
        name: row.name,
        schema: row.schema,
        description: row.description || undefined,
        rowCount: row.row_count || undefined
      }));
    } finally {
      await pool.close();
    }
  }

  private static async getMSSQLColumns(config: DatabaseConfig, credentials: DatabaseCredentials, tableName: string, schemaName?: string): Promise<DatabaseColumn[]> {
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
      const result = await pool.request()
        .input('tableName', sql.VarChar, tableName)
        .input('schemaName', sql.VarChar, schemaName || 'dbo')
        .query(`
          SELECT 
            c.COLUMN_NAME as name,
            c.DATA_TYPE as data_type,
            c.IS_NULLABLE = 'YES' as is_nullable,
            c.COLUMN_DEFAULT as default_value,
            c.CHARACTER_MAXIMUM_LENGTH as max_length,
            c.NUMERIC_PRECISION as precision,
            c.NUMERIC_SCALE as scale,
            CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as is_primary_key
          FROM INFORMATION_SCHEMA.COLUMNS c
          LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE pk ON pk.TABLE_NAME = c.TABLE_NAME 
            AND pk.COLUMN_NAME = c.COLUMN_NAME 
            AND pk.CONSTRAINT_NAME LIKE 'PK_%'
          WHERE c.TABLE_NAME = @tableName
            AND c.TABLE_SCHEMA = @schemaName
          ORDER BY c.ORDINAL_POSITION;
        `);
      
      return result.recordset.map((row: any) => ({
        name: row.name,
        dataType: row.data_type,
        isNullable: row.is_nullable,
        defaultValue: row.default_value,
        maxLength: row.max_length,
        precision: row.precision,
        scale: row.scale,
        isPrimaryKey: row.is_primary_key
      }));
    } finally {
      await pool.close();
    }
  }

  private static async queryMSSQLSampleData(config: DatabaseConfig, credentials: DatabaseCredentials, tableName: string, schemaName?: string, limit: number = 10): Promise<any[]> {
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
      const fullTableName = schemaName ? `[${schemaName}].[${tableName}]` : `[${tableName}]`;
      const result = await pool.request().query(`SELECT TOP (${limit}) * FROM ${fullTableName}`);
      return result.recordset;
    } finally {
      await pool.close();
    }
  }

  // Placeholder methods for other databases (can be implemented later)
  private static async queryBigQuerySampleData(config: DatabaseConfig, credentials: DatabaseCredentials, tableName: string, schemaName?: string, limit: number = 10): Promise<any[]> {
    // TODO: Implement BigQuery sample data query
    console.log('BigQuery sample data not implemented yet');
    return [];
  }

  private static async queryDatabricksSampleData(config: DatabaseConfig, credentials: DatabaseCredentials, tableName: string, schemaName?: string, limit: number = 10): Promise<any[]> {
    // TODO: Implement Databricks sample data query
    console.log('Databricks sample data not implemented yet');
    return [];
  }

  private static async queryDB2SampleData(config: DatabaseConfig, credentials: DatabaseCredentials, tableName: string, schemaName?: string, limit: number = 10): Promise<any[]> {
    // TODO: Implement DB2 sample data query
    console.log('DB2 sample data not implemented yet');
    return [];
  }

  // BigQuery connection methods
  private static async testBigQueryConnection(config: DatabaseConfig, credentials: DatabaseCredentials) {
    try {
      const { BigQuery } = require('@google-cloud/bigquery');
      
      const bigquery = new BigQuery({
        projectId: config.projectId,
        keyFilename: credentials?.serviceAccountPath,
        credentials: credentials?.serviceAccountJson ? JSON.parse(credentials.serviceAccountJson) : undefined,
      });

      const query = 'SELECT 1 as test';
      await bigquery.query({ query, dryRun: true });

      return {
        success: true,
        message: 'BigQuery connection successful'
      };
    } catch (error) {
      return {
        success: false,
        message: 'BigQuery connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static async getBigQueryTables(config: DatabaseConfig, credentials: DatabaseCredentials): Promise<DatabaseTable[]> {
    const { BigQuery } = require('@google-cloud/bigquery');
    
    const bigquery = new BigQuery({
      projectId: config.projectId,
      keyFilename: credentials?.serviceAccountPath,
      credentials: credentials?.serviceAccountJson ? JSON.parse(credentials.serviceAccountJson) : undefined,
    });

    const [datasets] = await bigquery.getDatasets();
    const tables: DatabaseTable[] = [];

    for (const dataset of datasets) {
      const [datasetTables] = await dataset.getTables();
      
      for (const table of datasetTables) {
        const [metadata] = await table.getMetadata();
        
        tables.push({
          name: table.id!,
          schema: dataset.id!,
          description: metadata.description || undefined,
          rowCount: metadata.numRows ? parseInt(metadata.numRows) : undefined
        });
      }
    }

    return tables;
  }

  private static async getBigQueryColumns(config: DatabaseConfig, credentials: DatabaseCredentials, tableName: string, schemaName?: string): Promise<DatabaseColumn[]> {
    const { BigQuery } = require('@google-cloud/bigquery');
    
    const bigquery = new BigQuery({
      projectId: config.projectId,
      keyFilename: credentials?.serviceAccountPath,
      credentials: credentials?.serviceAccountJson ? JSON.parse(credentials.serviceAccountJson) : undefined,
    });

    const dataset = bigquery.dataset(schemaName || 'default');
    const table = dataset.table(tableName);
    const [metadata] = await table.getMetadata();

    return metadata.schema.fields.map((field: any) => ({
      name: field.name,
      dataType: field.type,
      isNullable: field.mode !== 'REQUIRED',
      description: field.description
    }));
  }

  // Databricks connection methods
  private static async testDatabricksConnection(config: DatabaseConfig, credentials: DatabaseCredentials) {
    try {
      const fetch = require('node-fetch');
      
      const response = await fetch(`${config.serverHostname}/api/2.0/clusters/list`, {
        headers: {
          'Authorization': `Bearer ${credentials?.accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Databricks connection successful'
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        success: false,
        message: 'Databricks connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static async getDatabricksTables(config: DatabaseConfig, credentials: DatabaseCredentials): Promise<DatabaseTable[]> {
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

  private static async getDatabricksColumns(config: DatabaseConfig, credentials: DatabaseCredentials, tableName: string, schemaName?: string): Promise<DatabaseColumn[]> {
    // Placeholder implementation
    return [
      { name: 'id', dataType: 'bigint', isPrimaryKey: true },
      { name: 'name', dataType: 'string', isNullable: true }
    ];
  }

  // IBM DB2 connection methods
  private static async testDB2Connection(config: DatabaseConfig, credentials: DatabaseCredentials): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const ibmdb = require('ibm_db');
      
      const connectionString = `DATABASE=${config.database};HOSTNAME=${config.hostname || config.host};PORT=${config.port || 50000};PROTOCOL=TCPIP;UID=${credentials?.username || credentials?.user};PWD=${credentials?.password};`;
      
      return new Promise((resolve) => {
        ibmdb.open(connectionString, (err: any, conn: any) => {
          if (err) {
            resolve({
              success: false,
              message: 'IBM DB2 connection failed',
              error: err.message || 'Unknown error'
            });
          } else {
            conn.query('SELECT 1 FROM SYSIBM.SYSDUMMY1', (err: any, result: any) => {
              conn.close(() => {});
              
              if (err) {
                resolve({
                  success: false,
                  message: 'IBM DB2 query test failed',
                  error: err.message || 'Unknown error'
                });
              } else {
                resolve({
                  success: true,
                  message: 'IBM DB2 connection successful'
                });
              }
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        message: 'IBM DB2 connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static async getDB2Tables(config: DatabaseConfig, credentials: DatabaseCredentials): Promise<DatabaseTable[]> {
    const ibmdb = require('ibm_db');
    
    const connectionString = `DATABASE=${config.database};HOSTNAME=${config.hostname || config.host};PORT=${config.port || 50000};PROTOCOL=TCPIP;UID=${credentials?.username || credentials?.user};PWD=${credentials?.password};`;
    
    return new Promise((resolve, reject) => {
      ibmdb.open(connectionString, (err: any, conn: any) => {
        if (err) {
          reject(new Error(`Failed to connect to DB2: ${err.message}`));
          return;
        }
        
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
  }

  private static async getDB2Columns(config: DatabaseConfig, credentials: DatabaseCredentials, tableName: string, schemaName?: string): Promise<DatabaseColumn[]> {
    const ibmdb = require('ibm_db');
    
    const connectionString = `DATABASE=${config.database};HOSTNAME=${config.hostname || config.host};PORT=${config.port || 50000};PROTOCOL=TCPIP;UID=${credentials?.username || credentials?.user};PWD=${credentials?.password};`;
    
    return new Promise((resolve, reject) => {
      ibmdb.open(connectionString, (err: any, conn: any) => {
        if (err) {
          reject(new Error(`Failed to connect to DB2: ${err.message}`));
          return;
        }
        
        const query = `
          SELECT 
            COLNAME as name,
            TYPENAME as data_type,
            NULLS = 'Y' as is_nullable,
            DEFAULT as default_value,
            LENGTH as max_length,
            SCALE as scale,
            KEYSEQ as is_primary_key,
            REMARKS as comment
          FROM SYSCAT.COLUMNS 
          WHERE TABNAME = '${tableName}'
          ${schemaName ? `AND TABSCHEMA = '${schemaName}'` : ''}
          ORDER BY COLNO
        `;
        
        conn.query(query, (err: any, results: any) => {
          conn.close(() => {});
          
          if (err) {
            reject(new Error(`Failed to fetch DB2 columns: ${err.message}`));
            return;
          }
          
          const columns = results.map((row: any) => ({
            name: row.NAME,
            dataType: row.DATA_TYPE,
            isNullable: row.IS_NULLABLE,
            defaultValue: row.DEFAULT_VALUE || undefined,
            maxLength: row.MAX_LENGTH || undefined,
            scale: row.SCALE || undefined,
            isPrimaryKey: row.IS_PRIMARY_KEY > 0,
            comment: row.COMMENT || undefined
          }));
          
          resolve(columns);
        });
      });
    });
  }
}

export default DatabaseConnectionManager;
