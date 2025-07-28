// Shared types for data agent components
export interface DataAgent {
  id: string;
  name: string;
  description?: string;
  connectionType: string;
  status: string;
  lastConnectedAt?: string;
  relationshipAnalysis?: string;
  relationshipAnalyzedAt?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  environments: Environment[];
  _count?: {
    tables: number;
    relations: number;
  };
}

export interface Environment {
  id: string;
  name: string;
  description?: string;
  environmentType: EnvironmentType;
  status: string;
  healthStatus: string;
  lastConnectedAt?: string;
  createdAt: string;
  tables?: Table[];
  _count?: {
    tables: number;
    relations: number;
  };
}

export interface Table {
  id: string;
  tableName: string;
  schemaName?: string;
  description?: string;
  rowCount?: number;
  analysisStatus: 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  columns?: Column[];
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  comment?: string;
  aiDescription?: string;
}

export interface Relationship {
  id: string;
  sourceTableId: string;
  targetTableId: string;
  relationshipType: string;
  sourceColumn: string;
  targetColumn: string;
  description?: string;
  example?: string;
  confidence?: number;
  isVerified: boolean;
  sourceTable: Table;
  targetTable: Table;
  createdAt: string;
  updatedAt: string;
}

export type EnvironmentType = 'production' | 'staging' | 'development';

export const ENVIRONMENT_TYPES: { value: EnvironmentType; label: string; description: string }[] = [
  { 
    value: 'production', 
    label: 'Production', 
    description: 'Live production environment with real data' 
  },
  { 
    value: 'staging', 
    label: 'Staging', 
    description: 'Pre-production environment for testing' 
  },
  { 
    value: 'development', 
    label: 'Development', 
    description: 'Development environment for coding and testing' 
  }
];

export interface NewEnvironment {
  name?: string; // Will be auto-generated from environmentType
  description: string;
  customPrompt: string;
  environmentType: EnvironmentType;
  connectionConfig: {
    host: string;
    port: string;
    database: string;
    schema: string;
    // SSL/Security options
    ssl?: boolean;
    sslMode?: 'disable' | 'require' | 'verify-ca' | 'verify-full';
    trustServerCertificate?: boolean;
    encrypt?: boolean;
    // Connection settings
    connectionTimeout?: number;
    // BigQuery specific
    projectId?: string;
    location?: string;
    serviceAccountJson?: string;
    // Additional options
    applicationName?: string;
    currentSchema?: string;
  };
  credentials: {
    username: string;
    password: string;
  };
}

export interface NewRelationship {
  sourceTableId: string;
  targetTableId: string;
  relationshipType: string;
  sourceColumn: string;
  targetColumn: string;
  description: string;
  example: string;
}
