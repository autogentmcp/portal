import OpenAI from 'openai';
import { prisma } from './prisma';

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface RelationshipSuggestion {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  relationshipType: 'one_to_one' | 'one_to_many' | 'many_to_many';
  confidence: number;
  description: string;
  example?: string;
}

export interface StructuredRelationshipResponse {
  analysis: string;
  relationships: RelationshipSuggestion[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface TableAnalysisRequest {
  tableName: string;
  fields: Array<{
    name: string;
    dataType: string;
    isNullable: boolean;
    isPrimaryKey: boolean;
    isForeignKey?: boolean;
    referencedTable?: string;
    referencedColumn?: string;
    isUnique?: boolean;
    isIndexed?: boolean;
    constraints?: string[];
    sampleValues?: string[];
  }>;
  primaryKeys?: string[];
  foreignKeys?: Array<{
    columnName: string;
    referencedTable: string;
    referencedColumn: string;
  }>;
  indexes?: Array<{
    name: string;
    columns: string[];
    isUnique: boolean;
  }>;
  rowCount?: number;
  note?: string;
}

export interface FieldAnalysisRequest {
  tableName: string;
  fieldName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  sampleValues?: string[];
  rowCount?: number;
}

export interface BriefColumnAnalysisRequest {
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  sampleValues?: string[];
  customPrompt?: string;
}

export interface BriefColumnAnalysisResponse {
  description: string;
  exampleValue: string;
  valueType: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class LLMService {
  private client: OpenAI;
  private provider: string;
  private model: string;

  // Get LLM settings from database or environment variables
  private async getLLMSettings() {
    try {
      // Try to get settings from database first
      const dbSettings = await (prisma as any).lLMSettings.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' }
      });

      if (dbSettings) {
        return {
          provider: dbSettings.provider,
          model: dbSettings.model,
          apiKeyEnvVar: dbSettings.apiKeyEnvVar,
          baseUrlEnvVar: dbSettings.baseUrlEnvVar,
          baseUrl: dbSettings.baseUrl,
          proxyUrl: dbSettings.proxyUrl,
          customHeaders: dbSettings.customHeaders ? 
            (typeof dbSettings.customHeaders === 'string' ? JSON.parse(dbSettings.customHeaders) : dbSettings.customHeaders) : {},
          headerMappings: dbSettings.headerMappings ? 
            (typeof dbSettings.headerMappings === 'string' ? JSON.parse(dbSettings.headerMappings) : dbSettings.headerMappings) : [],
          caBundleEnvVar: dbSettings.caBundleEnvVar,
          certFileEnvVar: dbSettings.certFileEnvVar,
          keyFileEnvVar: dbSettings.keyFileEnvVar,
          rejectUnauthorized: dbSettings.rejectUnauthorized
        };
      }
    } catch (error) {
      console.warn('Failed to load LLM settings from database, falling back to environment variables:', error);
    }

    // Fallback to environment variables
    return {
      provider: process.env.LLM_PROVIDER || 'ollama',
      model: process.env.LLM_MODEL || 'llama3.2',
      apiKeyEnvVar: process.env.LLM_API_KEY_ENV_VAR || 'LLM_API_KEY',
      baseUrlEnvVar: process.env.LLM_BASE_URL_ENV_VAR,
      baseUrl: process.env.LLM_BASE_URL,
      proxyUrl: process.env.LLM_PROXY_URL,
      customHeaders: process.env.LLM_CUSTOM_HEADERS ? JSON.parse(process.env.LLM_CUSTOM_HEADERS) : {},
      headerMappings: process.env.LLM_HEADER_MAPPINGS ? JSON.parse(process.env.LLM_HEADER_MAPPINGS) : [],
      caBundleEnvVar: process.env.LLM_CA_BUNDLE_ENV_VAR,
      certFileEnvVar: process.env.LLM_CERT_FILE_ENV_VAR,
      keyFileEnvVar: process.env.LLM_KEY_FILE_ENV_VAR,
      rejectUnauthorized: process.env.LLM_REJECT_UNAUTHORIZED !== 'false'
    };
  }

  constructor() {
    // Initialize with defaults, will be updated by init()
    this.provider = 'ollama';
    this.model = 'llama3.2';
    this.client = new OpenAI({
      baseURL: 'http://localhost:11434/v1',
      apiKey: 'ollama',
    });
  }

  // Initialize the LLM service with settings from database or environment
  async init() {
    const settings = await this.getLLMSettings();
    this.provider = settings.provider;
    this.model = settings.model;
    
    if (this.provider === 'openai') {
      // Get API key from the specified environment variable
      const apiKey = settings.apiKeyEnvVar ? process.env[settings.apiKeyEnvVar] || '' : '';

      // Prepare OpenAI client configuration
      const clientConfig: any = {
        apiKey,
      };

      // Set base URL (priority: baseUrlEnvVar -> baseUrl -> proxyUrl)
      const resolvedBaseUrl = settings.baseUrlEnvVar ? process.env[settings.baseUrlEnvVar] : settings.baseUrl;
      if (resolvedBaseUrl) {
        clientConfig.baseURL = resolvedBaseUrl;
      } else if (settings.proxyUrl) {
        clientConfig.baseURL = settings.proxyUrl;
      }

      // Build complete headers from settings
      let allHeaders: Record<string, string> = {};

      // Add static custom headers
      if (settings.customHeaders && typeof settings.customHeaders === 'object') {
        allHeaders = { ...allHeaders, ...settings.customHeaders };
      }

      // Add dynamic headers from environment variable mappings
      if (Array.isArray(settings.headerMappings)) {
        settings.headerMappings.forEach(({ headerName, envVariable }: { headerName: string; envVariable: string }) => {
          const envValue = process.env[envVariable];
          if (envValue) {
            allHeaders[headerName] = envValue;
          }
        });
      }

      // Add headers to client config if any exist
      if (Object.keys(allHeaders).length > 0) {
        clientConfig.defaultHeaders = allHeaders;
      }

      // SSL Certificate Configuration
      const fs = require('fs');
      const https = require('https');
      
      // Build SSL agent options
      const sslOptions: any = {};
      
      // CA Bundle
      if (settings.caBundleEnvVar && process.env[settings.caBundleEnvVar]) {
        try {
          sslOptions.ca = fs.readFileSync(process.env[settings.caBundleEnvVar]);
        } catch (error) {
          console.warn(`Failed to read CA bundle file: ${error}`);
        }
      }
      
      // Client Certificate
      if (settings.certFileEnvVar && process.env[settings.certFileEnvVar]) {
        try {
          sslOptions.cert = fs.readFileSync(process.env[settings.certFileEnvVar]);
        } catch (error) {
          console.warn(`Failed to read client certificate file: ${error}`);
        }
      }
      
      // Client Key
      if (settings.keyFileEnvVar && process.env[settings.keyFileEnvVar]) {
        try {
          sslOptions.key = fs.readFileSync(process.env[settings.keyFileEnvVar]);
        } catch (error) {
          console.warn(`Failed to read client key file: ${error}`);
        }
      }
      
      // Reject unauthorized certificates setting
      if (settings.rejectUnauthorized === false) {
        sslOptions.rejectUnauthorized = false;
      }

      // If SSL options are configured, create a custom HTTPS agent
      if (Object.keys(sslOptions).length > 0) {
        const agent = new https.Agent(sslOptions);
        clientConfig.httpAgent = agent;
      }

      this.client = new OpenAI(clientConfig);
    } else if (this.provider === 'ollama') {
      const baseURL = settings.baseUrl || 'http://localhost:11434/v1';
      this.client = new OpenAI({
        baseURL,
        apiKey: 'ollama', // Ollama doesn't require a real API key
      });
    } else {
      throw new Error(`Unsupported LLM provider: ${this.provider}`);
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Hello, respond with just "OK" if you can understand this.' }],
        max_tokens: 10,
      });

      if (response.choices && response.choices.length > 0) {
        return {
          success: true,
          message: `${this.provider} connection successful. Model: ${this.model}`,
        };
      } else {
        return {
          success: false,
          message: `${this.provider} connection failed: No response from model`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `${this.provider} connection failed`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async analyzeTable(request: TableAnalysisRequest): Promise<LLMResponse> {
    const prompt = this.buildTableAnalysisPrompt(request);
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a database expert analyst. Provide concise, accurate analysis of database tables and their fields. Focus on data patterns, business purpose, and potential relationships.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 10000,
        temperature: 0.3,
      });

      return {
        content: response.choices[0]?.message?.content || 'No analysis generated',
        usage: response.usage ? {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      throw new Error(`LLM analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeField(request: FieldAnalysisRequest): Promise<LLMResponse> {
    const prompt = this.buildFieldAnalysisPrompt(request);
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a database expert analyst. Provide detailed analysis of database fields including data patterns, business meaning, and recommendations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });

      return {
        content: response.choices[0]?.message?.content || 'No analysis generated',
        usage: response.usage ? {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      throw new Error(`LLM field analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateBriefColumnDescription(request: BriefColumnAnalysisRequest): Promise<BriefColumnAnalysisResponse> {
    // Clean and limit sample values to prevent long strings
    const cleanedSamples = (request.sampleValues || [])
      .filter(val => val && val !== '[object Object]' && val !== 'null' && val !== 'undefined')
      .map(val => {
        // Truncate very long values (like password hashes)
        if (val.length > 50) {
          return val.substring(0, 47) + '...';
        }
        return val;
      })
      .slice(0, 3); // Only use first 3 samples

    const sampleText = cleanedSamples.length > 0 
      ? `Sample values: ${cleanedSamples.join(', ')}`
      : 'No sample values available';

    let prompt = `Analyze this database column and provide a brief description:

Column: ${request.columnName}
Data Type: ${request.dataType}
${sampleText}`;

    // Add custom prompt if provided
    if (request.customPrompt && request.customPrompt.trim()) {
      prompt += `\n\nCustom Instructions: ${request.customPrompt.trim()}`;
    }

    prompt += `\n\nProvide a JSON response with:
- purpose: brief purpose of this column (what it represents)
- sample_value: a realistic example value for this column
- data_pattern: the pattern or category of data (e.g., "identifier", "email", "categorical", "numeric", "text", "date")`;
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a database expert. Analyze column information and respond with valid JSON only. No additional text or explanations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 150,
        temperature: 0.1,
        ...(this.provider === 'openai' && { response_format: { type: "json_object" } })
      });

      const content = response.choices[0]?.message?.content?.trim() || '';
      
      try {
        // Extract JSON from markdown code blocks if present
        let jsonStr = content;
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          jsonStr = codeBlockMatch[1].trim();
        }
        
        const parsed = JSON.parse(jsonStr);
        
        // Validate required fields
        if (!parsed.purpose || !parsed.sample_value || !parsed.data_pattern) {
          throw new Error('Missing required fields in LLM response');
        }

        return {
          description: parsed.purpose,
          exampleValue: String(parsed.sample_value),
          valueType: parsed.data_pattern,
          usage: response.usage ? {
            prompt_tokens: response.usage.prompt_tokens,
            completion_tokens: response.usage.completion_tokens,
            total_tokens: response.usage.total_tokens,
          } : undefined,
        };
      } catch (parseError) {
        console.warn('Failed to parse LLM JSON response:', parseError);
        console.warn('Raw LLM response:', content);
        
        // Fallback to basic description
        return this.createFallbackResponse(request);
      }
    } catch (error) {
      console.warn('LLM request failed:', error);
      return this.createFallbackResponse(request);
    }
  }

  private createFallbackResponse(request: BriefColumnAnalysisRequest): BriefColumnAnalysisResponse {
    return {
      description: `${request.columnName.replace(/_/g, ' ').toLowerCase()} field`,
      exampleValue: this.generateFallbackExample(request.dataType, request.sampleValues || []),
      valueType: this.categorizeDataType(request.dataType),
    };
  }

  async generateTableRelationships(tables: Array<{
    name: string;
    fields: Array<{ 
      name: string; 
      dataType: string; 
      isPrimaryKey: boolean;
      isForeignKey?: boolean;
      referencedTable?: string;
      referencedColumn?: string;
      isUnique?: boolean;
      isIndexed?: boolean;
    }>;
    rawColumns?: Array<{
      name: string;
      dataType: string;
      isNullable: boolean;
      defaultValue?: string;
      maxLength?: number;
      precision?: number;
      scale?: number;
      collation?: string;
      comment?: string;
    }>;
    primaryKeys?: string[];
    foreignKeys?: Array<{
      columnName: string;
      referencedTable: string;
      referencedColumn: string;
    }>;
    indexes?: Array<{
      name: string;
      columns: string[];
      isUnique: boolean;
    }>;
  }>): Promise<LLMResponse> {
    const prompt = this.buildRelationshipAnalysisPrompt(tables);
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a database expert specializing in identifying relationships between tables. Analyze field names, data types, and naming patterns to suggest likely foreign key relationships.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 10000,
        temperature: 0.2,
      });

      return {
        content: response.choices[0]?.message?.content || 'No relationships identified',
        usage: response.usage ? {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      throw new Error(`LLM relationship analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateStructuredRelationships(tables: Array<{
    name: string;
    fields: Array<{ 
      name: string; 
      dataType: string; 
      isPrimaryKey: boolean;
      isForeignKey?: boolean;
      referencedTable?: string;
      referencedColumn?: string;
      isUnique?: boolean;
      isIndexed?: boolean;
    }>;
    rawColumns?: Array<{
      name: string;
      dataType: string;
      isNullable: boolean;
      defaultValue?: string;
      maxLength?: number;
      precision?: number;
      scale?: number;
      collation?: string;
      comment?: string;
    }>;
    primaryKeys?: string[];
    foreignKeys?: Array<{
      columnName: string;
      referencedTable: string;
      referencedColumn: string;
    }>;
    indexes?: Array<{
      name: string;
      columns: string[];
      isUnique: boolean;
    }>;
  }>): Promise<StructuredRelationshipResponse> {
    
    try {
      // Build a comprehensive analysis prompt
      const prompt = this.buildStructuredRelationshipPrompt(tables);
      
      // Try structured output if supported (OpenAI), otherwise use structured prompting
      if (this.provider === 'openai' && this.model.includes('gpt-4')) {
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a database expert. Analyze tables and suggest relationships. Return only valid JSON with no additional text.',
            },
            {
              role: 'user',
              content: `${prompt}\n\nReturn ONLY a JSON object with this exact structure:
{
  "analysis": "text analysis of the database structure",
  "relationships": [
    {
      "sourceTable": "table_name",
      "sourceColumn": "column_name", 
      "targetTable": "table_name",
      "targetColumn": "column_name",
      "relationshipType": "one_to_one|one_to_many|many_to_many",
      "confidence": 0.9,
      "description": "explanation of the relationship",
      "example": "optional example"
    }
  ]
}`
            },
          ],
          max_tokens: 10000,
          temperature: 0.1,
          response_format: { type: "json_object" }
        });

        const content = response.choices[0]?.message?.content || '{}';
        
        try {
          const parsed = JSON.parse(content);
          
          // Validate and filter relationships
          const validRelationships = (parsed.relationships || []).filter((rel: any) => 
            rel.sourceTable && rel.sourceColumn && 
            rel.targetTable && rel.targetColumn &&
            typeof rel.confidence === 'number' && rel.confidence >= 0.7 &&
            ['one_to_one', 'one_to_many', 'many_to_many'].includes(rel.relationshipType)
          );

          return {
            analysis: parsed.analysis || 'Database relationship analysis completed.',
            relationships: validRelationships,
            usage: response.usage ? {
              prompt_tokens: response.usage.prompt_tokens,
              completion_tokens: response.usage.completion_tokens,
              total_tokens: response.usage.total_tokens,
            } : undefined,
          };
        } catch (parseError) {
          console.error('Failed to parse structured JSON response:', parseError);
          console.error('Raw response:', content);
          
          // Fallback to manual parsing
          const fallbackResult = this.parseStructuredRelationshipResponse(content);
          return {
            ...fallbackResult,
            usage: response.usage ? {
              prompt_tokens: response.usage.prompt_tokens,
              completion_tokens: response.usage.completion_tokens,
              total_tokens: response.usage.total_tokens,
            } : undefined,
          };
        }
      } else {
        // For other providers, use structured prompting
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a database expert. Analyze tables and return both a text analysis AND structured JSON data for relationships. Be precise and only suggest relationships with high confidence.',
            },
            {
              role: 'user',
              content: this.buildStructuredRelationshipPrompt(tables),
            },
          ],
          max_tokens: 10000,
          temperature: 0.1,
        });

        const content = response.choices[0]?.message?.content || '';
        
        // Try to parse structured data from the response
        const { analysis, relationships } = this.parseStructuredRelationshipResponse(content);

        return {
          analysis,
          relationships,
          usage: response.usage ? {
            prompt_tokens: response.usage.prompt_tokens,
            completion_tokens: response.usage.completion_tokens,
            total_tokens: response.usage.total_tokens,
          } : undefined,
        };
      }
    } catch (error) {
      throw new Error(`LLM structured relationship analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildTableAnalysisPrompt(request: TableAnalysisRequest): string {
    let prompt = `Analyze the following database table:\n\n`;
    prompt += `Table: ${request.tableName}\n`;
    
    if (request.rowCount) {
      prompt += `Row Count: ${request.rowCount}\n`;
    }
    
    if (request.note) {
      prompt += `\n${request.note}\n`;
    }
    
    // Add primary keys information
    if (request.primaryKeys && request.primaryKeys.length > 0) {
      prompt += `\nPrimary Keys: ${request.primaryKeys.join(', ')}\n`;
    }
    
    // Add foreign keys information
    if (request.foreignKeys && request.foreignKeys.length > 0) {
      prompt += `\nForeign Keys:\n`;
      request.foreignKeys.forEach(fk => {
        prompt += `- ${fk.columnName} -> ${fk.referencedTable}.${fk.referencedColumn}\n`;
      });
    }
    
    // Add indexes information
    if (request.indexes && request.indexes.length > 0) {
      prompt += `\nIndexes:\n`;
      request.indexes.forEach(idx => {
        prompt += `- ${idx.name} (${idx.columns.join(', ')})`;
        if (idx.isUnique) prompt += ` [UNIQUE]`;
        prompt += `\n`;
      });
    }
    
    prompt += `\nFields:\n`;
    request.fields.forEach(field => {
      prompt += `- ${field.name} (${field.dataType})`;
      if (field.isPrimaryKey) prompt += ` [PRIMARY KEY]`;
      if (field.isForeignKey) prompt += ` [FOREIGN KEY -> ${field.referencedTable}.${field.referencedColumn}]`;
      if (field.isUnique) prompt += ` [UNIQUE]`;
      if (field.isIndexed) prompt += ` [INDEXED]`;
      if (!field.isNullable) prompt += ` [NOT NULL]`;
      if (field.constraints && field.constraints.length > 0) {
        prompt += ` [CONSTRAINTS: ${field.constraints.join(', ')}]`;
      }
      if (field.sampleValues && field.sampleValues.length > 0) {
        prompt += ` - Sample values: ${field.sampleValues.slice(0, 5).join(', ')}`;
      }
      prompt += `\n`;
    });

    prompt += `\nProvide a comprehensive analysis including:
1. **Business Purpose**: What this table likely represents in the business domain
2. **Data Patterns**: Observations about the data types and field relationships
3. **Key Relationships**: Analysis of primary keys, foreign keys, and indexes
4. **Data Quality**: Potential data quality concerns or recommendations
5. **Usage Recommendations**: How this table might be used in queries or reports
6. **Potential Relationships**: Fields that might relate to other tables

Keep the analysis concise but informative.`;

    return prompt;
  }

  private buildFieldAnalysisPrompt(request: FieldAnalysisRequest): string {
    let prompt = `Analyze the following database field:\n\n`;
    prompt += `Table: ${request.tableName}\n`;
    prompt += `Field: ${request.fieldName}\n`;
    prompt += `Data Type: ${request.dataType}\n`;
    prompt += `Nullable: ${request.isNullable ? 'Yes' : 'No'}\n`;
    prompt += `Primary Key: ${request.isPrimaryKey ? 'Yes' : 'No'}\n`;
    
    if (request.sampleValues && request.sampleValues.length > 0) {
      prompt += `Sample Values: ${request.sampleValues.slice(0, 10).join(', ')}\n`;
    }
    
    if (request.rowCount) {
      prompt += `Total Rows: ${request.rowCount}\n`;
    }

    prompt += `\nProvide analysis including:
1. **Field Purpose**: What this field likely represents
2. **Data Pattern**: Analysis of the sample values and data type
3. **Business Rules**: Potential constraints or validation rules
4. **Relationship Potential**: If this might be a foreign key or reference field
5. **Data Quality**: Any observations about data quality or completeness

Be concise and specific.`;

    return prompt;
  }

  private buildRelationshipAnalysisPrompt(tables: Array<{
    name: string;
    fields: Array<{ 
      name: string; 
      dataType: string; 
      isPrimaryKey: boolean;
      isForeignKey?: boolean;
      referencedTable?: string;
      referencedColumn?: string;
      isUnique?: boolean;
      isIndexed?: boolean;
    }>;
    rawColumns?: Array<{
      name: string;
      dataType: string;
      isNullable: boolean;
      defaultValue?: string;
      maxLength?: number;
      precision?: number;
      scale?: number;
      collation?: string;
      comment?: string;
    }>;
    primaryKeys?: string[];
    foreignKeys?: Array<{
      columnName: string;
      referencedTable: string;
      referencedColumn: string;
    }>;
    indexes?: Array<{
      name: string;
      columns: string[];
      isUnique: boolean;
    }>;
  }>): string {
    let prompt = `Analyze the following database tables to identify potential relationships:\n\n`;
    
    tables.forEach(table => {
      prompt += `Table: ${table.name}\n`;
      
      // Add primary keys
      if (table.primaryKeys && table.primaryKeys.length > 0) {
        prompt += `  Primary Keys: ${table.primaryKeys.join(', ')}\n`;
      }
      
      // Add foreign keys
      if (table.foreignKeys && table.foreignKeys.length > 0) {
        prompt += `  Foreign Keys:\n`;
        table.foreignKeys.forEach(fk => {
          prompt += `    - ${fk.columnName} -> ${fk.referencedTable}.${fk.referencedColumn}\n`;
        });
      }
      
      // Add indexes
      if (table.indexes && table.indexes.length > 0) {
        prompt += `  Indexes:\n`;
        table.indexes.forEach(idx => {
          prompt += `    - ${idx.name} (${idx.columns.join(', ')})`;
          if (idx.isUnique) prompt += ` [UNIQUE]`;
          prompt += `\n`;
        });
      }
      
      prompt += `  Fields:\n`;
      table.fields.forEach(field => {
        prompt += `    - ${field.name} (${field.dataType})`;
        if (field.isPrimaryKey) prompt += ` [PK]`;
        if (field.isForeignKey) prompt += ` [FK -> ${field.referencedTable}.${field.referencedColumn}]`;
        if (field.isUnique) prompt += ` [UNIQUE]`;
        if (field.isIndexed) prompt += ` [INDEXED]`;
        prompt += `\n`;
      });
      
      // Add raw columns for databases without formal relationships (like BigQuery)
      if (table.rawColumns && table.rawColumns.length > 0) {
        prompt += `  Raw Column Details:\n`;
        table.rawColumns.forEach(col => {
          prompt += `    - ${col.name} (${col.dataType})`;
          if (!col.isNullable) prompt += ` [NOT NULL]`;
          if (col.defaultValue) prompt += ` [DEFAULT: ${col.defaultValue}]`;
          if (col.maxLength) prompt += ` [MAX_LENGTH: ${col.maxLength}]`;
          if (col.precision) prompt += ` [PRECISION: ${col.precision}]`;
          if (col.scale) prompt += ` [SCALE: ${col.scale}]`;
          if (col.comment) prompt += ` [COMMENT: ${col.comment}]`;
          prompt += `\n`;
        });
      }
      
      prompt += `\n`;
    });

    prompt += `Based on field names, data types, existing keys, indexes, column comments, and common database patterns, identify likely relationships:

1. **Existing Foreign Key Relationships**: Document the already defined foreign key relationships
2. **Missing Foreign Key Relationships**: Identify fields that should be foreign keys but aren't defined
3. **Column Name Pattern Relationships**: Look for columns ending in '_id', '_key', or matching table names
4. **Data Type Matching**: Find columns with matching data types that could be related
5. **Junction Tables**: Identify tables that might serve as many-to-many relationship bridges
6. **Hierarchical Relationships**: Self-referencing relationships within tables
7. **Lookup Tables**: Tables that appear to be reference/lookup data
8. **Index-based Relationships**: Relationships suggested by index patterns
9. **Comment-based Relationships**: Relationships suggested by column comments

For databases like BigQuery without formal foreign keys, pay special attention to:
- Column naming conventions (e.g., user_id, customer_key, order_number)
- Data type compatibility between potential related columns
- Business logic patterns in column names and comments

For each relationship, provide:
- Source table and field
- Target table and field  
- Relationship type (one-to-one, one-to-many, many-to-many)
- Confidence level (high/medium/low)
- Reasoning for the relationship (field names, data types, existing keys, indexes, comments)

Format as a clear list with explanations.`;

    return prompt;
  }

  private buildStructuredRelationshipPrompt(tables: Array<{
    name: string;
    fields: Array<{ 
      name: string; 
      dataType: string; 
      isPrimaryKey: boolean;
      isForeignKey?: boolean;
      referencedTable?: string;
      referencedColumn?: string;
      isUnique?: boolean;
      isIndexed?: boolean;
    }>;
    rawColumns?: Array<{
      name: string;
      dataType: string;
      isNullable: boolean;
      defaultValue?: string;
      maxLength?: number;
      precision?: number;
      scale?: number;
      collation?: string;
      comment?: string;
    }>;
    primaryKeys?: string[];
    foreignKeys?: Array<{
      columnName: string;
      referencedTable: string;
      referencedColumn: string;
    }>;
    indexes?: Array<{
      name: string;
      columns: string[];
      isUnique: boolean;
    }>;
  }>): string {
    let prompt = `Analyze the following database tables to identify relationships. Return both analysis and structured JSON data.\n\n`;
    
    tables.forEach(table => {
      prompt += `Table: ${table.name}\n`;
      
      // Add primary keys
      if (table.primaryKeys && table.primaryKeys.length > 0) {
        prompt += `  Primary Keys: ${table.primaryKeys.join(', ')}\n`;
      }
      
      // Add foreign keys
      if (table.foreignKeys && table.foreignKeys.length > 0) {
        prompt += `  Foreign Keys:\n`;
        table.foreignKeys.forEach(fk => {
          prompt += `    - ${fk.columnName} -> ${fk.referencedTable}.${fk.referencedColumn}\n`;
        });
      }
      
      // Add indexes
      if (table.indexes && table.indexes.length > 0) {
        prompt += `  Indexes:\n`;
        table.indexes.forEach(idx => {
          prompt += `    - ${idx.name} (${idx.columns.join(', ')})`;
          if (idx.isUnique) prompt += ` [UNIQUE]`;
          prompt += `\n`;
        });
      }
      
      prompt += `  Fields:\n`;
      table.fields.forEach(field => {
        prompt += `    - ${field.name} (${field.dataType})`;
        if (field.isPrimaryKey) prompt += ` [PK]`;
        if (field.isForeignKey) prompt += ` [FK -> ${field.referencedTable}.${field.referencedColumn}]`;
        if (field.isUnique) prompt += ` [UNIQUE]`;
        if (field.isIndexed) prompt += ` [INDEXED]`;
        prompt += `\n`;
      });
      
      // Add raw columns for databases without formal relationships (like BigQuery)
      if (table.rawColumns && table.rawColumns.length > 0) {
        prompt += `  Raw Column Details:\n`;
        table.rawColumns.forEach(col => {
          prompt += `    - ${col.name} (${col.dataType})`;
          if (!col.isNullable) prompt += ` [NOT NULL]`;
          if (col.defaultValue) prompt += ` [DEFAULT: ${col.defaultValue}]`;
          if (col.maxLength) prompt += ` [MAX_LENGTH: ${col.maxLength}]`;
          if (col.precision) prompt += ` [PRECISION: ${col.precision}]`;
          if (col.scale) prompt += ` [SCALE: ${col.scale}]`;
          if (col.comment) prompt += ` [COMMENT: ${col.comment}]`;
          prompt += `\n`;
        });
      }
      
      prompt += `\n`;
    });

    prompt += `Please provide:

1. **ANALYSIS**: A detailed text analysis of the relationships you identified

2. **STRUCTURED_DATA**: A JSON array of relationships in this exact format:
\`\`\`json
[
  {
    "sourceTable": "table_name",
    "sourceColumn": "column_name", 
    "targetTable": "table_name",
    "targetColumn": "column_name",
    "relationshipType": "one_to_many",
    "confidence": 0.9,
    "description": "Brief description of this relationship",
    "example": "Sample query: SELECT * FROM source s JOIN target t ON s.column = t.column"
  }
]
\`\`\`

IMPORTANT: 
- Include both existing foreign key relationships AND potential missing relationships
- For databases like BigQuery without formal foreign keys, focus on column naming patterns and data type matching
- Look for columns ending in '_id', '_key', or matching table names (e.g., 'customer_id' -> 'customers.id')
- Consider data type compatibility between potential related columns
- Pay attention to column comments that might indicate relationships
- Only include relationships with confidence >= 0.7
- Use relationship types: "one_to_one", "one_to_many", "many_to_many"
- Always close the JSON array with ] and the code block with \`\`\`
- If no relationships found, return an empty array []
- Consider all available information: field names, data types, existing keys, indexes, constraints, raw column details, and comments

Format your response as:
**ANALYSIS:**
[Your detailed text analysis here]

**STRUCTURED_DATA:**
[Complete JSON array here]`;

    return prompt;
  }

  private parseStructuredRelationshipResponse(content: string): { analysis: string; relationships: RelationshipSuggestion[] } {
    const analysis = this.extractSection(content, 'ANALYSIS:', 'STRUCTURED_DATA:');
    const structuredData = this.extractSection(content, 'STRUCTURED_DATA:', null);
    
    let relationships: RelationshipSuggestion[] = [];
    
    try {
      // Extract JSON from markdown code blocks or plain text
      const jsonMatch = structuredData.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                       structuredData.match(/\[([\s\S]*)\]/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        console.log('Attempting to parse JSON string:', jsonStr.substring(0, 200) + '...');
        
        // Check if JSON string appears to be truncated
        if (jsonStr.includes('"') && !this.isValidJSONStructure(jsonStr)) {
          console.warn('JSON appears to be truncated or malformed, attempting to clean it');
          const cleanedJson = this.cleanTruncatedJson(jsonStr);
          if (cleanedJson) {
            relationships = JSON.parse(cleanedJson);
          }
        } else {
          relationships = JSON.parse(jsonStr.startsWith('[') ? jsonStr : `[${jsonStr}]`);
        }
        
        // Validate and filter relationships
        relationships = relationships.filter(rel => 
          rel.sourceTable && rel.sourceColumn && 
          rel.targetTable && rel.targetColumn &&
          rel.confidence >= 0.7 &&
          ['one_to_one', 'one_to_many', 'many_to_many'].includes(rel.relationshipType)
        );
      }
    } catch (error) {
      console.warn('Failed to parse structured relationship data:', error);
      console.warn('Raw structured data:', structuredData.substring(0, 500));
      // Continue with empty relationships array
    }
    
    return {
      analysis: analysis.trim() || content,
      relationships
    };
  }

  private isValidJSONStructure(jsonStr: string): boolean {
    // Basic check for balanced braces and brackets
    const openBraces = (jsonStr.match(/\{/g) || []).length;
    const closeBraces = (jsonStr.match(/\}/g) || []).length;
    const openBrackets = (jsonStr.match(/\[/g) || []).length;
    const closeBrackets = (jsonStr.match(/\]/g) || []).length;
    
    return openBraces === closeBraces && openBrackets === closeBrackets;
  }

  private cleanTruncatedJson(jsonStr: string): string | null {
    try {
      // Remove trailing incomplete content
      let cleaned = jsonStr.trim();
      
      // Remove any incomplete text after the last complete object or array
      const patterns = [
        /,\s*"[^"]*$/,  // Remove incomplete property at end
        /,\s*$/, // Remove trailing comma
        /"[^"]*$/,  // Remove incomplete string at end
      ];
      
      patterns.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '');
      });
      
      // If it ends with incomplete text, try to find the last complete object
      const lastCompleteObject = cleaned.lastIndexOf('}');
      const lastCompleteArray = cleaned.lastIndexOf(']');
      
      if (lastCompleteObject > lastCompleteArray && lastCompleteObject > 0) {
        // Truncate to last complete object
        cleaned = cleaned.substring(0, lastCompleteObject + 1);
        if (cleaned.startsWith('[') && !cleaned.endsWith(']')) {
          cleaned += ']';
        }
      }
      
      // Test if the cleaned JSON is valid
      const testJson = cleaned.startsWith('[') ? cleaned : `[${cleaned}]`;
      JSON.parse(testJson);
      return cleaned;
    } catch (error) {
      console.warn('Unable to clean truncated JSON:', error);
      return null;
    }
  }

  private extractSection(content: string, startMarker: string, endMarker: string | null): string {
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) return content;
    
    const start = startIndex + startMarker.length;
    const endIndex = endMarker ? content.indexOf(endMarker, start) : content.length;
    const end = endIndex === -1 ? content.length : endIndex;
    
    return content.substring(start, end).trim();
  }

  private generateFallbackExample(dataType: string, sampleValues: string[]): string {
    // Don't use real sample values to avoid storing sensitive data
    const typeMap: { [key: string]: string } = {
      'text': 'sample_text',
      'varchar': 'sample_text',
      'string': 'sample_text',
      'integer': '12345',
      'int': '12345',
      'number': '12345',
      'decimal': '123.45',
      'float': '123.45',
      'boolean': 'true',
      'date': '2024-01-01',
      'datetime': '2024-01-01 12:00:00',
      'timestamp': '2024-01-01 12:00:00',
      'email': 'user@example.com',
      'phone': '123-456-7890',
      'id': 'ID_12345',
      'uuid': 'uuid-123-456',
      'name': 'sample_name',
      'address': 'sample_address'
    };

    const lowerDataType = dataType.toLowerCase();
    
    // Check for common column name patterns to provide better generic examples
    if (lowerDataType.includes('email')) return 'user@example.com';
    if (lowerDataType.includes('phone')) return '123-456-7890';
    if (lowerDataType.includes('id') || lowerDataType.includes('key')) return 'ID_12345';
    if (lowerDataType.includes('name')) return 'sample_name';
    if (lowerDataType.includes('address')) return 'sample_address';
    if (lowerDataType.includes('url')) return 'https://example.com';
    
    return typeMap[lowerDataType] || 'sample_value';
  }

  private categorizeDataType(dataType: string): string {
    const type = dataType.toLowerCase();
    
    if (type.includes('text') || type.includes('varchar') || type.includes('char')) {
      return 'text';
    }
    if (type.includes('int') || type.includes('number')) {
      return 'number';
    }
    if (type.includes('decimal') || type.includes('float') || type.includes('double')) {
      return 'decimal';
    }
    if (type.includes('date') || type.includes('time')) {
      return 'date';
    }
    if (type.includes('bool')) {
      return 'boolean';
    }
    
    return 'text'; // Default fallback
  }
}

// Singleton instance
let llmService: LLMService | null = null;

export async function getLLMService(): Promise<LLMService> {
  if (!llmService) {
    llmService = new LLMService();
    await llmService.init();
  }
  return llmService;
}

export default LLMService;
