/**
 * Database-agnostic JSON handling utilities
 * Handles serialization/deserialization for databases that don't support native JSON
 */

export class DatabaseJsonHelper {
  /**
   * Serialize object to JSON string for database storage
   */
  static serialize(data: any): string | null {
    if (data === null || data === undefined) {
      return null;
    }
    
    try {
      return JSON.stringify(data);
    } catch (error) {
      console.error('Failed to serialize JSON data:', error);
      return null;
    }
  }

  /**
   * Deserialize JSON string from database to object
   */
  static deserialize<T = any>(jsonString: string | null): T | null {
    if (!jsonString) {
      return null;
    }
    
    try {
      return JSON.parse(jsonString) as T;
    } catch (error) {
      console.error('Failed to deserialize JSON data:', error);
      return null;
    }
  }

  /**
   * Safely get a property from a potentially stringified JSON object
   */
  static getProperty(data: any, property: string, defaultValue: any = null): any {
    if (!data) return defaultValue;
    
    // If it's already an object, return the property
    if (typeof data === 'object') {
      return data[property] ?? defaultValue;
    }
    
    // If it's a string, try to parse it first
    if (typeof data === 'string') {
      const parsed = this.deserialize(data);
      return parsed?.[property] ?? defaultValue;
    }
    
    return defaultValue;
  }

  /**
   * Transform Prisma result to have parsed JSON fields
   */
  static transformPrismaResult<T extends Record<string, any>>(
    result: T,
    jsonFields: (keyof T)[]
  ): T {
    if (!result) return result;
    
    const transformed = { ...result };
    
    for (const field of jsonFields) {
      if (transformed[field] && typeof transformed[field] === 'string') {
        const parsed = this.deserialize(transformed[field] as string);
        (transformed as any)[field] = parsed;
      }
    }
    
    return transformed;
  }

  /**
   * Transform data for Prisma input to have serialized JSON fields
   */
  static transformForPrismaInput<T extends Record<string, any>>(
    data: T,
    jsonFields: (keyof T)[]
  ): T {
    if (!data) return data;
    
    const transformed = { ...data };
    
    for (const field of jsonFields) {
      if (transformed[field] && typeof transformed[field] === 'object') {
        const serialized = this.serialize(transformed[field]);
        (transformed as any)[field] = serialized;
      }
    }
    
    return transformed;
  }
}

// Type definitions for common JSON field structures
export interface ConnectionConfig {
  host?: string;
  port?: string | number;
  database?: string;
  schema?: string;
  username?: string;
  password?: string;
  projectId?: string; // For BigQuery
  serviceAccountJson?: string; // For BigQuery
  [key: string]: any;
}

export interface EndpointParams {
  [key: string]: {
    type: string;
    required?: boolean;
    description?: string;
    example?: any;
  };
}

export interface AnalysisResult {
  aiDescription?: string;
  columnAnalysis?: Array<{
    columnName: string;
    aiDescription?: string;
    aiExampleValue?: string;
    aiValueType?: string;
  }>;
  relationships?: Array<{
    sourceColumn: string;
    targetTable: string;
    targetColumn: string;
    relationshipType: string;
    confidence?: number;
  }>;
  [key: string]: any;
}
