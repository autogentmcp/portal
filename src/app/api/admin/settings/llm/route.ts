import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface LLMSettings {
  provider: 'openai' | 'ollama';
  model: string;
  apiKey?: string;
  apiKeyEnvVar?: string;
  baseUrlEnvVar?: string;  // Environment variable name for base URL (security)
  proxyUrlEnvVar?: string; // Environment variable name for proxy URL (security)
  customHeaders?: Record<string, string>;
  headerMappings?: Array<{ headerName: string; envVariable: string }>;
  // SSL Certificate Configuration
  caBundleEnvVar?: string;   // Environment variable name containing CA bundle file path
  certFileEnvVar?: string;   // Environment variable name containing client certificate file path
  keyFileEnvVar?: string;    // Environment variable name containing client key file path
  rejectUnauthorized?: boolean; // Whether to reject unauthorized certificates
}

// Read current settings from environment
function getCurrentSettings(): LLMSettings {
  // Parse custom headers from environment variable if it exists
  let customHeaders: Record<string, string> = {};
  try {
    if (process.env.LLM_CUSTOM_HEADERS) {
      customHeaders = JSON.parse(process.env.LLM_CUSTOM_HEADERS);
    }
  } catch (error) {
    console.warn('Failed to parse LLM_CUSTOM_HEADERS:', error);
  }

  // Parse header mappings from environment variable if it exists
  let headerMappings: Array<{ headerName: string; envVariable: string }> = [];
  try {
    if (process.env.LLM_HEADER_MAPPINGS) {
      headerMappings = JSON.parse(process.env.LLM_HEADER_MAPPINGS);
    }
  } catch (error) {
    console.warn('Failed to parse LLM_HEADER_MAPPINGS:', error);
  }

  // Build dynamic headers from environment variable mappings
  const dynamicHeaders: Record<string, string> = {};
  headerMappings.forEach(({ headerName, envVariable }) => {
    const envValue = process.env[envVariable];
    if (envValue) {
      dynamicHeaders[headerName] = envValue;
    }
  });

  // Merge static custom headers with dynamic headers (dynamic takes precedence)
  const allHeaders = { ...customHeaders, ...dynamicHeaders };

  // Determine API key source
  const apiKeyEnvVar = process.env.LLM_API_KEY_ENV_VAR || 'LLM_API_KEY';
  const apiKey = process.env[apiKeyEnvVar] || process.env.OPENAI_API_KEY || '';

  return {
    provider: (process.env.LLM_PROVIDER as 'openai' | 'ollama') || 'ollama',
    model: process.env.LLM_MODEL || 'llama3.2',
    apiKey,
    apiKeyEnvVar,
    baseUrlEnvVar: process.env.LLM_BASE_URL_ENV_VAR || '',
    proxyUrlEnvVar: process.env.LLM_PROXY_URL_ENV_VAR || '',
    customHeaders: allHeaders,
    headerMappings,
    // SSL Certificate Configuration
    caBundleEnvVar: process.env.LLM_CA_BUNDLE_ENV_VAR || '',
    certFileEnvVar: process.env.LLM_CERT_FILE_ENV_VAR || '',
    keyFileEnvVar: process.env.LLM_KEY_FILE_ENV_VAR || '',
    rejectUnauthorized: process.env.LLM_REJECT_UNAUTHORIZED !== 'false'
  };
}

export async function GET() {
  try {
    // Get settings from database first, fallback to environment variables
    const dbSettings = await (prisma as any).lLMSettings.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' }
    });

    if (dbSettings) {
      // Use database settings with environment variable resolution for API key
      const apiKey = dbSettings.apiKeyEnvVar ? process.env[dbSettings.apiKeyEnvVar] || '' : '';
      
      // Parse JSON fields
      let customHeaders = {};
      let headerMappings: Array<{ headerName: string; envVariable: string }> = [];
      
      try {
        if (dbSettings.customHeaders) {
          customHeaders = typeof dbSettings.customHeaders === 'string' 
            ? JSON.parse(dbSettings.customHeaders) 
            : dbSettings.customHeaders;
        }
      } catch (error) {
        console.warn('Failed to parse custom headers from database:', error);
      }

      try {
        if (dbSettings.headerMappings) {
          headerMappings = typeof dbSettings.headerMappings === 'string'
            ? JSON.parse(dbSettings.headerMappings)
            : dbSettings.headerMappings;
        }
      } catch (error) {
        console.warn('Failed to parse header mappings from database:', error);
      }

      // Build dynamic headers from environment variable mappings
      const dynamicHeaders: Record<string, string> = {};
      headerMappings.forEach(({ headerName, envVariable }) => {
        const envValue = process.env[envVariable];
        if (envValue) {
          dynamicHeaders[headerName] = envValue;
        }
      });

      // Merge static custom headers with dynamic headers
      const allHeaders = { ...customHeaders, ...dynamicHeaders };

      return NextResponse.json({
        provider: dbSettings.provider as 'openai' | 'ollama',
        model: dbSettings.model,
        apiKey: apiKey ? '••••••••' : '',
        apiKeyEnvVar: dbSettings.apiKeyEnvVar || '',
        baseUrlEnvVar: dbSettings.baseUrlEnvVar || '',
        proxyUrlEnvVar: dbSettings.proxyUrlEnvVar || '',
        customHeaders: allHeaders,
        headerMappings,
        // SSL Certificate Configuration
        caBundleEnvVar: dbSettings.caBundleEnvVar || '',
        certFileEnvVar: dbSettings.certFileEnvVar || '',
        keyFileEnvVar: dbSettings.keyFileEnvVar || '',
        rejectUnauthorized: dbSettings.rejectUnauthorized
      });
    }

    // Fallback to environment variables if no database settings
    const settings = getCurrentSettings();
    
    // Don't send API key in response for security, just indicate if it's set
    return NextResponse.json({
      ...settings,
      apiKey: settings.apiKey ? '••••••••' : '',
      customHeaders: settings.customHeaders || {},
      headerMappings: settings.headerMappings || [],
      apiKeyEnvVar: settings.apiKeyEnvVar || 'LLM_API_KEY',
      // SSL Certificate Configuration (include defaults)
      caBundleEnvVar: settings.caBundleEnvVar || '',
      certFileEnvVar: settings.certFileEnvVar || '',
      keyFileEnvVar: settings.keyFileEnvVar || '',
      rejectUnauthorized: settings.rejectUnauthorized !== undefined ? settings.rejectUnauthorized : true,
      proxyUrlEnvVar: settings.proxyUrlEnvVar || ''
    });
  } catch (error) {
    console.error('Error getting LLM settings:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings: LLMSettings = await request.json();

    // Validate required fields
    if (!settings.provider || !settings.model) {
      return NextResponse.json(
        { error: 'Provider and model are required' },
        { status: 400 }
      );
    }

    // Validate OpenAI specific requirements
    if (settings.provider === 'openai') {
      if (!settings.apiKeyEnvVar) {
        return NextResponse.json(
          { error: 'API key environment variable name is required for OpenAI provider' },
          { status: 400 }
        );
      }
      
      // Check if the environment variable is actually set
      const apiKeyValue = process.env[settings.apiKeyEnvVar];
      if (!apiKeyValue) {
        return NextResponse.json(
          { error: `Environment variable '${settings.apiKeyEnvVar}' is not set or is empty` },
          { status: 400 }
        );
      }
    }

    // Validate Ollama specific requirements - allow if baseUrlEnvVar is set
    if (settings.provider === 'ollama' && !settings.baseUrlEnvVar) {
      // For Ollama, we'll use default localhost if no baseUrlEnvVar is provided
      console.log('Ollama provider will use default localhost:11434 endpoint');
    }

    // Deactivate previous settings
    await (prisma as any).lLMSettings.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // Create new settings record
    const newSettings = await (prisma as any).lLMSettings.create({
      data: {
        provider: settings.provider,
        model: settings.model,
        apiKeyEnvVar: settings.apiKeyEnvVar || null,
        baseUrlEnvVar: settings.baseUrlEnvVar || null,
        proxyUrlEnvVar: settings.proxyUrlEnvVar || null,
        customHeaders: settings.customHeaders ? JSON.stringify(settings.customHeaders) : null,
        headerMappings: settings.headerMappings ? JSON.stringify(settings.headerMappings) : null,
        // SSL Certificate Configuration
        caBundleEnvVar: settings.caBundleEnvVar || null,
        certFileEnvVar: settings.certFileEnvVar || null,
        keyFileEnvVar: settings.keyFileEnvVar || null,
        rejectUnauthorized: settings.rejectUnauthorized !== undefined ? settings.rejectUnauthorized : true,
        isActive: true
      }
    });

    return NextResponse.json({ 
      message: 'Settings saved successfully to database.',
      id: newSettings.id
    });
  } catch (error) {
    console.error('Error saving LLM settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
