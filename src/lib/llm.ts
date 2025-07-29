import OpenAI from 'openai';

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

  constructor() {
    this.provider = process.env.LLM_PROVIDER || 'ollama';
    this.model = process.env.LLM_MODEL || 'llama3.2';
    
    if (this.provider === 'openai') {
      this.client = new OpenAI({
        apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY,
      });
    } else if (this.provider === 'ollama') {
      this.client = new OpenAI({
        baseURL: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
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
    const prompt = this.buildBriefColumnAnalysisPrompt(
      request.columnName,
      request.dataType,
      request.sampleValues || [],
      request.customPrompt
    );
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 100, // Very strict limit for brief JSON responses
        temperature: 0.1, // Lower temperature for more consistent output
      });

      const content = response.choices[0]?.message?.content || '';
      
      // Parse the structured response
      const parsed = this.parseBriefColumnResponse(content);
      
      if (parsed) {
        return {
          description: parsed.description,
          exampleValue: parsed.exampleValue,
          valueType: parsed.valueType,
          usage: response.usage ? {
            prompt_tokens: response.usage.prompt_tokens,
            completion_tokens: response.usage.completion_tokens,
            total_tokens: response.usage.total_tokens,
          } : undefined,
        };
      } else {
        // Fallback if parsing fails
        return {
          description: `${request.columnName.replace(/_/g, ' ').toLowerCase()} field`,
          exampleValue: this.generateFallbackExample(request.dataType, request.sampleValues || []),
          valueType: this.categorizeDataType(request.dataType),
          usage: response.usage ? {
            prompt_tokens: response.usage.prompt_tokens,
            completion_tokens: response.usage.completion_tokens,
            total_tokens: response.usage.total_tokens,
          } : undefined,
        };
      }
    } catch (error) {
      // Fallback to basic description if AI fails
      return {
        description: `${request.columnName.replace(/_/g, ' ').toLowerCase()} field`,
        exampleValue: this.generateFallbackExample(request.dataType, request.sampleValues || []),
        valueType: this.categorizeDataType(request.dataType),
      };
    }
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
    const prompt = this.buildStructuredRelationshipPrompt(tables);
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a database expert. Analyze tables and return both a text analysis AND structured JSON data for relationships. Be precise and only suggest relationships with high confidence.',
          },
          {
            role: 'user',
            content: prompt,
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

  private buildBriefColumnAnalysisPrompt(columnName: string, dataType: string, sampleValues: string[], customPrompt?: string): string {
    // Clean and limit sample values to prevent long strings
    const cleanedSamples = sampleValues
      .filter(val => val && val !== '[object Object]')
      .map(val => {
        // Truncate very long values (like password hashes)
        if (val.length > 20) {
          return val.substring(0, 17) + '...';
        }
        return val;
      })
      .slice(0, 2); // Only use first 2 samples

    const sampleText = cleanedSamples.length > 0 
      ? `Samples: ${cleanedSamples.join(', ')}`
      : 'No samples';

    let prompt = `Column: ${columnName} 
${sampleText}`;

    // Add custom prompt if provided
    if (customPrompt && customPrompt.trim()) {
      prompt += `\n\nCustom Instructions: ${customPrompt.trim()}`;
    }

    prompt += `

Return ONLY valid JSON:
{"purpose":"brief purpose (no data types)","sample_value":"short example","data_pattern":"pattern type"}

Examples:
{"purpose":"user identifier","sample_value":"user123","data_pattern":"alphanumeric"}
{"purpose":"email address","sample_value":"user@domain.com","data_pattern":"email"}
{"purpose":"user role","sample_value":"admin","data_pattern":"categorical"}
{"purpose":"password hash","sample_value":"$2b$10...","data_pattern":"encrypted"}

ONLY JSON, no other text.`;

    return prompt;
  }

  private parseBriefColumnResponse(content: string): BriefColumnAnalysisResponse | null {
    try {
      // Clean the content to extract just the JSON
      const cleanContent = content.trim();
      
      // Try to find JSON in the response
      let jsonStr = cleanContent;
      
      // If wrapped in code blocks, extract the JSON
      const codeBlockMatch = cleanContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }
      
      // Handle truncated JSON - try to complete it
      if (jsonStr.includes('"purpose"') && !jsonStr.endsWith('}')) {
        // Try to find the last complete field and close the JSON
        const lastQuote = jsonStr.lastIndexOf('"');
        if (lastQuote > 0) {
          // Find the start of the incomplete value
          const beforeLastQuote = jsonStr.substring(0, lastQuote);
          const lastColon = beforeLastQuote.lastIndexOf(':');
          if (lastColon > 0) {
            // Truncate to before the incomplete field and close the JSON
            const beforeIncompleteField = jsonStr.substring(0, lastColon);
            const lastComma = beforeIncompleteField.lastIndexOf(',');
            if (lastComma > 0) {
              jsonStr = jsonStr.substring(0, lastComma) + '}';
            }
          }
        }
      }
      
      // Parse the JSON
      const parsed = JSON.parse(jsonStr);
      
      // Validate required fields for new structure
      if (!parsed.purpose || !parsed.sample_value || !parsed.data_pattern) {
        return null;
      }

      // Convert to the expected response format - use just the purpose as description
      return {
        description: parsed.purpose, // Just the purpose, not the full JSON
        exampleValue: parsed.sample_value,
        valueType: parsed.data_pattern
      };
    } catch (error) {
      console.warn('Failed to parse brief column JSON response:', error);
      console.warn('Raw content:', content);
      return null;
    }
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

export function getLLMService(): LLMService {
  if (!llmService) {
    llmService = new LLMService();
  }
  return llmService;
}

export default LLMService;
