import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSecureLLMConfig } from '@/lib/secure-llm-config';

interface SecureLLMSettings {
  provider: 'openai' | 'ollama';
  model: string;
  customHeaders?: Record<string, string>;
  configurationStatus?: {
    apiKeySet: boolean;
    proxyUrlSet: boolean;
    baseUrlSet: boolean;
    customHeadersSet: boolean;
    sslConfigured: boolean;
  };
  rejectUnauthorized?: boolean;
}

// Check configuration status from environment variables
function getConfigurationStatus(provider: 'openai' | 'ollama') {
  if (provider === 'openai') {
    return {
      apiKeySet: !!process.env.OPENAI_API_KEY,
      proxyUrlSet: !!process.env.OPENAI_PROXY_URL,
      baseUrlSet: !!process.env.OPENAI_BASE_URL,
      customHeadersSet: !!process.env.OPENAI_CUSTOM_HEADERS,
      sslConfigured: !!(process.env.OPENAI_CA_BUNDLE || process.env.OPENAI_CLIENT_CERT)
    };
  } else {
    return {
      apiKeySet: false, // Ollama doesn't require API key
      proxyUrlSet: !!process.env.OLLAMA_PROXY_URL,
      baseUrlSet: !!process.env.OLLAMA_BASE_URL,
      customHeadersSet: !!process.env.OLLAMA_CUSTOM_HEADERS,
      sslConfigured: false // Ollama typically doesn't use SSL certs
    };
  }
}

// Read current settings from environment and database
async function getCurrentSettings(): Promise<SecureLLMSettings> {
  try {
    // Get database settings
    const dbSettings = await (prisma as any).lLMSettings.findFirst({
      where: {
        isActive: true
      }
    });

    let provider: 'openai' | 'ollama' = 'ollama';
    let model = 'llama3.2';
    let customHeaders: Record<string, string> = {};

    if (dbSettings) {
      provider = (dbSettings.provider as 'openai' | 'ollama') || 'ollama';
      model = dbSettings.model || (provider === 'openai' ? 'gpt-4o-mini' : 'llama3.2');
      
      // Parse custom headers from JSON
      if (dbSettings.customHeaders) {
        try {
          customHeaders = typeof dbSettings.customHeaders === 'string' 
            ? JSON.parse(dbSettings.customHeaders) 
            : dbSettings.customHeaders as Record<string, string>;
        } catch (error) {
          console.warn('Failed to parse custom headers from database:', error);
        }
      }
    }

    // Get configuration status
    const configurationStatus = getConfigurationStatus(provider);

    return {
      provider,
      model,
      customHeaders,
      configurationStatus,
      rejectUnauthorized: process.env.OPENAI_REJECT_UNAUTHORIZED !== 'false'
    };
  } catch (error) {
    console.error('Error getting current settings:', error);
    // Return default settings
    return {
      provider: 'ollama',
      model: 'llama3.2',
      customHeaders: {},
      configurationStatus: getConfigurationStatus('ollama'),
      rejectUnauthorized: true
    };
  }
}

export async function GET() {
  try {
    const settings = await getCurrentSettings();
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching LLM settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LLM settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings: SecureLLMSettings = await request.json();

    // Validate the settings
    if (!settings.provider || !settings.model) {
      return NextResponse.json(
        { error: 'Provider and model are required' },
        { status: 400 }
      );
    }

    if (!['openai', 'ollama'].includes(settings.provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "openai" or "ollama"' },
        { status: 400 }
      );
    }

    // Validate custom headers if provided
    if (settings.customHeaders) {
      try {
        JSON.stringify(settings.customHeaders);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid custom headers format' },
          { status: 400 }
        );
      }
    }

    // Save to database
    const settingsData = {
      provider: settings.provider,
      model: settings.model,
      customHeaders: settings.customHeaders || {},
      rejectUnauthorized: settings.rejectUnauthorized ?? true
    };

    await (prisma as any).lLMSettings.upsert({
      where: { id: 'default' }, // Use a fixed ID for singleton settings
      update: {
        provider: settingsData.provider,
        model: settingsData.model,
        customHeaders: settingsData.customHeaders,
        rejectUnauthorized: settingsData.rejectUnauthorized,
        updatedAt: new Date()
      },
      create: {
        id: 'default',
        provider: settingsData.provider,
        model: settingsData.model,
        customHeaders: settingsData.customHeaders,
        rejectUnauthorized: settingsData.rejectUnauthorized,
        isActive: true
      }
    });

    // Update environment variables for custom headers if they were provided
    if (settings.customHeaders && Object.keys(settings.customHeaders).length > 0) {
      const envVarName = settings.provider === 'openai' 
        ? 'OPENAI_CUSTOM_HEADERS' 
        : 'OLLAMA_CUSTOM_HEADERS';
      
      // Note: In production, you would need to restart the application
      // or use a configuration service to update environment variables
      console.log(`To apply custom headers, set environment variable:`, {
        [envVarName]: JSON.stringify(settings.customHeaders)
      });
    }

    return NextResponse.json({ 
      message: 'LLM settings saved successfully',
      configurationStatus: getConfigurationStatus(settings.provider)
    });

  } catch (error) {
    console.error('Error saving LLM settings:', error);
    return NextResponse.json(
      { error: 'Failed to save LLM settings' },
      { status: 500 }
    );
  }
}
