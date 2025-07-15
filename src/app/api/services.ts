'use server';

import { EnvSecretManager } from '@/lib/secrets/env-manager';
import { logInfo } from '@/lib/utils/logger';

/**
 * Initialize server-side services
 * This is called during application startup
 */
export async function initializeServices() {
  try {
    logInfo('Initializing server-side services...');
    
    // Initialize environment-based secret management
    const secretManager = EnvSecretManager.getInstance();
    await secretManager.init();
    
    logInfo('Server-side services initialized successfully');
    return { success: true };
  } catch (error) {
    logInfo('Failed to initialize server-side services', error);
    return { success: false, error };
  }
}

// Export the initialized services
export { EnvSecretManager as SecretManager } from '@/lib/secrets/env-manager';
