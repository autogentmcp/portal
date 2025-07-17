import { SecretProvider } from './env-types';
import { EnvSecretProviderFactory } from './env-factory';
import { logError, logInfo } from '../utils/logger';

/**
 * Secret Manager service for working with environment-configured security providers
 */
export class EnvSecretManager {
  private static instance: EnvSecretManager;
  private provider: SecretProvider | null = null;
  private initialized = false;

  /**
   * Get the singleton instance of the EnvSecretManager
   */
  public static getInstance(): EnvSecretManager {
    if (!EnvSecretManager.instance) {
      EnvSecretManager.instance = new EnvSecretManager();
    }
    return EnvSecretManager.instance;
  }

  /**
   * Initialize the secret manager with a provider from environment configuration
   * This should be called on application startup
   */
  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logInfo('Initializing EnvSecretManager from environment variables');
      this.provider = EnvSecretProviderFactory.createProvider();
      
      if (this.provider) {
        const testResult = await this.provider.testConnection();
        if (testResult) {
          logInfo('Secret provider connection tested successfully');
        } else {
          logError('Secret provider connection test failed');
          this.provider = null;
        }
      }
      
      this.initialized = true;
    } catch (error) {
      logError('Failed to initialize EnvSecretManager', error);
      this.provider = null;
    }
  }

  /**
   * Check if a secret provider is available
   */
  public hasProvider(): boolean {
    return this.provider !== null;
  }

  /**
   * Store a security setting in the configured provider
   * @param key The key to store
   * @param value The value to store
   * @returns Promise resolving to boolean indicating success
   */
  public async storeSecuritySetting(key: string, value: string): Promise<boolean> {
    try {
      if (!this.provider) {
        logError('No secret provider available for storing security setting');
        return false;
      }

      logInfo(`Storing security setting: ${key}`);
      return await this.provider.storeSecret(key, value);
    } catch (error) {
      logError(`Failed to store security setting: ${key}`, error);
      return false;
    }
  }

  /**
   * Store credentials object in the configured provider with proper encoding
   * @param key The key to store
   * @param credentials The credentials object
   * @returns Promise resolving to boolean indicating success
   */
  public async storeCredentials(key: string, credentials: Record<string, any>): Promise<boolean> {
    try {
      if (!this.provider) {
        logError('No secret provider available for storing credentials');
        return false;
      }

      logInfo(`Storing credentials: ${key}`);
      return await this.provider.storeCredentials(key, credentials);
    } catch (error) {
      logError(`Failed to store credentials: ${key}`, error);
      return false;
    }
  }

  /**
   * Retrieve a security setting from the configured provider
   * @param key The key to retrieve
   * @returns Promise resolving to the value or null if not found
   */
  public async getSecuritySetting(key: string): Promise<string | null> {
    try {
      if (!this.provider) {
        logError('No secret provider available for retrieving security setting');
        return null;
      }

      logInfo(`Retrieving security setting: ${key}`);
      return await this.provider.getSecret(key);
    } catch (error) {
      logError(`Failed to retrieve security setting: ${key}`, error);
      return null;
    }
  }

  /**
   * Retrieve credentials object from the configured provider with proper decoding
   * @param key The key to retrieve
   * @returns Promise resolving to the credentials object or null if not found
   */
  public async getCredentials(key: string): Promise<Record<string, any> | null> {
    try {
      if (!this.provider) {
        logError('No secret provider available for retrieving credentials');
        return null;
      }

      logInfo(`Retrieving credentials: ${key}`);
      return await this.provider.getCredentials(key);
    } catch (error) {
      logError(`Failed to retrieve credentials: ${key}`, error);
      return null;
    }
  }

  /**
   * Delete a security setting from the configured provider
   * @param key The key to delete
   * @returns Promise resolving to boolean indicating success
   */
  public async deleteSecuritySetting(key: string): Promise<boolean> {
    try {
      if (!this.provider) {
        logError('No secret provider available for deleting security setting');
        return false;
      }

      logInfo(`Deleting security setting: ${key}`);
      return await this.provider.deleteSecret(key);
    } catch (error) {
      logError(`Failed to delete security setting: ${key}`, error);
      return false;
    }
  }

  /**
   * Test the current provider connection
   * @returns Promise resolving to boolean indicating success
   */
  public async testConnection(): Promise<boolean> {
    try {
      if (!this.provider) {
        logError('No secret provider available for testing connection');
        return false;
      }

      logInfo('Testing secret provider connection');
      return await this.provider.testConnection();
    } catch (error) {
      logError('Provider connection test failed', error);
      return false;
    }
  }
}
