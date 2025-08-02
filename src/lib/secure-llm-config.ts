// Secure LLM Configuration - Fixed Environment Variables

/**
 * SECURITY NOTE: We use fixed environment variable names to prevent
 * information disclosure attacks where attackers could probe for
 * existing environment variables by changing the env var names in the UI.
 */

export const LLM_ENV_VARS = {
  // OpenAI Configuration
  OPENAI_API_KEY: 'OPENAI_API_KEY',
  OPENAI_PROXY_URL: 'OPENAI_PROXY_URL', 
  OPENAI_BASE_URL: 'OPENAI_BASE_URL',
  OPENAI_CUSTOM_HEADERS: 'OPENAI_CUSTOM_HEADERS', // JSON format
  
  // Ollama Configuration
  OLLAMA_PROXY_URL: 'OLLAMA_PROXY_URL',
  OLLAMA_BASE_URL: 'OLLAMA_BASE_URL',
  OLLAMA_CUSTOM_HEADERS: 'OLLAMA_CUSTOM_HEADERS', // JSON format
  
  // SSL Certificate Configuration
  OPENAI_CA_BUNDLE: 'OPENAI_CA_BUNDLE',
  OPENAI_CLIENT_CERT: 'OPENAI_CLIENT_CERT', 
  OPENAI_CLIENT_KEY: 'OPENAI_CLIENT_KEY',
  OPENAI_REJECT_UNAUTHORIZED: 'OPENAI_REJECT_UNAUTHORIZED'
} as const;

/**
 * Parse custom headers from environment variable
 * Supports multiple formats for flexibility
 */
function parseCustomHeaders(envVarValue: string | undefined): Record<string, string> {
  if (!envVarValue?.trim()) {
    return {};
  }

  try {
    // Try JSON format first (recommended)
    if (envVarValue.trim().startsWith('{')) {
      return JSON.parse(envVarValue);
    }
    
    // Fallback: Parse delimited format "key1:value1;key2:value2"
    const headers: Record<string, string> = {};
    const pairs = envVarValue.split(';');
    
    for (const pair of pairs) {
      const [key, ...valueParts] = pair.split(':');
      if (key?.trim() && valueParts.length > 0) {
        headers[key.trim()] = valueParts.join(':').trim();
      }
    }
    
    return headers;
  } catch (error) {
    console.warn(`Failed to parse custom headers from env var: ${error}`);
    return {};
  }
}

/**
 * Parse headers from prefixed environment variables
 * Example: OPENAI_HEADER_X_PROXY_AUTH="Bearer token"
 */
function parsePrefixedHeaders(prefix: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const headerPrefix = `${prefix}_HEADER_`;
  
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(headerPrefix) && value) {
      // Convert OPENAI_HEADER_X_PROXY_AUTH to X-Proxy-Auth
      const headerName = key
        .substring(headerPrefix.length)
        .split('_')
        .map(part => part.charAt(0) + part.slice(1).toLowerCase())
        .join('-');
      
      headers[headerName] = value;
    }
  }
  
  return headers;
}

/**
 * Secure LLM settings interface - no user-configurable env var names
 */
export interface SecureLLMSettings {
  provider: 'openai' | 'ollama';
  model: string;
  
  // Custom headers for advanced proxy configuration
  customHeaders?: Record<string, string>;
  
  // Header mappings to fixed environment variables only
  headerMappings?: Array<{
    headerName: string;
    envVariable: keyof typeof LLM_ENV_VARS; // Restricted to known env vars
  }>;
  
  // SSL Certificate configuration (uses fixed env vars)
  enableSSL?: boolean;
  rejectUnauthorized?: boolean;
}

/**
 * Get LLM configuration using fixed environment variable names
 */
export function getSecureLLMConfig(): SecureLLMSettings & {
  // Resolved values (for internal use)
  apiKey?: string;
  baseURL?: string;
  sslOptions?: any;
} {
  const provider = (process.env.LLM_PROVIDER as 'openai' | 'ollama') || 'ollama';
  
  if (provider === 'openai') {
    // Fixed environment variable names - no user configuration
    const apiKey = process.env[LLM_ENV_VARS.OPENAI_API_KEY] || '';
    const proxyUrl = process.env[LLM_ENV_VARS.OPENAI_PROXY_URL];
    const baseUrl = process.env[LLM_ENV_VARS.OPENAI_BASE_URL];
    
    // Proxy URL takes priority for security
    const baseURL = proxyUrl || baseUrl;
    
    // Parse custom headers from multiple sources
    const customHeaders: Record<string, string> = {
      // Method 1: JSON format (recommended)
      ...parseCustomHeaders(process.env[LLM_ENV_VARS.OPENAI_CUSTOM_HEADERS]),
      // Method 2: Prefixed env vars (alternative)
      ...parsePrefixedHeaders('OPENAI')
    };
    
    // SSL Configuration
    const sslOptions: any = {};
    const rejectUnauthorized = process.env[LLM_ENV_VARS.OPENAI_REJECT_UNAUTHORIZED] !== 'false';
    sslOptions.rejectUnauthorized = rejectUnauthorized;
    
    // SSL certificate files
    const caBundlePath = process.env[LLM_ENV_VARS.OPENAI_CA_BUNDLE];
    const clientCertPath = process.env[LLM_ENV_VARS.OPENAI_CLIENT_CERT];
    const clientKeyPath = process.env[LLM_ENV_VARS.OPENAI_CLIENT_KEY];
    
    if (caBundlePath) {
      try {
        const fs = require('fs');
        sslOptions.ca = fs.readFileSync(caBundlePath);
      } catch (error) {
        console.warn(`Failed to read CA bundle: ${error}`);
      }
    }
    
    if (clientCertPath) {
      try {
        const fs = require('fs');
        sslOptions.cert = fs.readFileSync(clientCertPath);
      } catch (error) {
        console.warn(`Failed to read client certificate: ${error}`);
      }
    }
    
    if (clientKeyPath) {
      try {
        const fs = require('fs');
        sslOptions.key = fs.readFileSync(clientKeyPath);
      } catch (error) {
        console.warn(`Failed to read client key: ${error}`);
      }
    }
    
    return {
      provider: 'openai',
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      apiKey,
      baseURL,
      sslOptions,
      rejectUnauthorized,
      customHeaders,
      headerMappings: []
    };
  } else {
    // Ollama configuration
    const proxyUrl = process.env[LLM_ENV_VARS.OLLAMA_PROXY_URL];
    const baseUrl = process.env[LLM_ENV_VARS.OLLAMA_BASE_URL];
    
    // Proxy URL takes priority for Ollama too
    const baseURL = proxyUrl || baseUrl || 'http://localhost:11434/v1';
    
    // Parse custom headers for Ollama
    const customHeaders: Record<string, string> = {
      ...parseCustomHeaders(process.env[LLM_ENV_VARS.OLLAMA_CUSTOM_HEADERS])
    };
    
    return {
      provider: 'ollama',
      model: process.env.LLM_MODEL || 'llama3.2',
      baseURL,
      apiKey: 'ollama', // Ollama doesn't need a real API key
      customHeaders,
      headerMappings: []
    };
  }
}
