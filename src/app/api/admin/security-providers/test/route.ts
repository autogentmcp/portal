import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { SecretProviderFactory } from '@/lib/secrets/factory';
import { EnvSecretProviderFactory } from '@/lib/secrets/env-factory';

export async function POST(request: NextRequest) {
  try {
    // Verify admin user
    const user = await getAuthUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get provider configuration from request body
    const providerData = await request.json();
    
    // Create a provider instance for testing based on provider type
    let provider;
    
    if (providerData.type && typeof providerData.config === 'object') {
      // Use the new factory method for environment-based configuration
      provider = SecretProviderFactory.createProvider({
        type: providerData.type,
        config: providerData.config
      });
    } else {
      // For backward compatibility, attempt to use the legacy method
      console.warn('Using deprecated createProviderFromData method');
      provider = null; // The createProviderFromData method is no longer available
    }
    
    if (!provider) {
      return NextResponse.json(
        { error: 'Invalid provider configuration' },
        { status: 400 }
      );
    }

    // Test the connection
    const success = await provider.testConnection();
    
    if (success) {
      return NextResponse.json({ success: true, message: 'Connection successful' });
    } else {
      return NextResponse.json(
        { error: 'Failed to connect to provider' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error testing provider connection:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to test provider connection' },
      { status: 500 }
    );
  }
}
