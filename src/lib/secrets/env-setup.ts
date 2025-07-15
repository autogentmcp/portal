import { EnvSecretManager } from '@/lib/secrets/env-manager';
import { logInfo } from '@/lib/utils/logger';

/**
 * Initialize the environment-based secret management system
 * This should be called during application startup
 */
export async function initEnvSecretManagement(): Promise<void> {
  logInfo('Initializing environment-based secret management...');
  
  try {
    // Get the singleton instance
    const secretManager = EnvSecretManager.getInstance();
    
    // Initialize provider from environment variables
    await secretManager.init();
    
    logInfo('Environment-based secret management initialized successfully');
  } catch (error) {
    logInfo('Failed to initialize environment-based secret management', error);
  }
}
