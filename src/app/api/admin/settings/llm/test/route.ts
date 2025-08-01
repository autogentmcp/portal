import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

interface LLMSettings {
  provider: 'openai' | 'ollama';
  model: string;
  apiKey?: string;
  apiKeyEnvVar?: string;
  baseUrl?: string;
  proxyUrl?: string;
  customHeaders?: Record<string, string>;
  headerMappings?: Array<{ headerName: string; envVariable: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const settings: LLMSettings = await request.json();

    let client: OpenAI;

    // Create OpenAI client based on provider
    if (settings.provider === 'openai') {
      // Get API key from environment variable
      let apiKey = '';
      if (settings.apiKeyEnvVar) {
        apiKey = process.env[settings.apiKeyEnvVar] || '';
      } else if (settings.apiKey) {
        // Fallback to direct API key for backward compatibility
        apiKey = settings.apiKey;
      }

      if (!apiKey) {
        return NextResponse.json({
          success: false,
          message: settings.apiKeyEnvVar 
            ? `Environment variable '${settings.apiKeyEnvVar}' is not set or is empty`
            : 'API key is required for OpenAI provider'
        });
      }

      // Prepare OpenAI client configuration
      const clientConfig: any = {
        apiKey,
      };

      // Set base URL (for proxy or custom endpoint)
      if (settings.baseUrl) {
        clientConfig.baseURL = settings.baseUrl;
      } else if (settings.proxyUrl) {
        // If proxy URL is provided without base URL, use proxy for OpenAI
        clientConfig.baseURL = settings.proxyUrl;
      }

      // Build complete headers from custom headers and environment variable mappings
      let allHeaders: Record<string, string> = {};
      
      // Add static custom headers
      if (settings.customHeaders && Object.keys(settings.customHeaders).length > 0) {
        allHeaders = { ...allHeaders, ...settings.customHeaders };
      }
      
      // Add dynamic headers from environment variable mappings
      if (settings.headerMappings && settings.headerMappings.length > 0) {
        settings.headerMappings.forEach(({ headerName, envVariable }) => {
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

      client = new OpenAI(clientConfig);
    } else if (settings.provider === 'ollama') {
      if (!settings.baseUrl) {
        return NextResponse.json({
          success: false,
          message: 'Base URL is required for Ollama provider'
        });
      }

      client = new OpenAI({
        baseURL: settings.baseUrl,
        apiKey: 'ollama', // Ollama doesn't require a real API key
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `Unsupported provider: ${settings.provider}`
      });
    }

    // Test the connection
    const response = await client.chat.completions.create({
      model: settings.model,
      messages: [{ 
        role: 'user', 
        content: 'Hello, respond with just "OK" if you can understand this.' 
      }],
      max_tokens: 10,
      temperature: 0.1,
    });

    if (response.choices && response.choices.length > 0) {
      return NextResponse.json({
        success: true,
        message: `✅ Connection successful! Model: ${settings.model}`,
        response: response.choices[0].message?.content?.trim()
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `❌ Connection failed: No response from model ${settings.model}`
      });
    }
  } catch (error) {
    console.error('LLM connection test failed:', error);
    
    let errorMessage = 'Connection test failed';
    
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        errorMessage = '❌ Authentication failed - please check your API key';
      } else if (error.message.includes('404')) {
        errorMessage = `❌ Model '${(await request.json()).model}' not found`;
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = '❌ Connection refused - please check if the service is running';
      } else if (error.message.includes('timeout')) {
        errorMessage = '❌ Connection timeout - please check your network or service availability';
      } else {
        errorMessage = `❌ ${error.message}`;
      }
    }

    return NextResponse.json({
      success: false,
      message: errorMessage
    });
  }
}
