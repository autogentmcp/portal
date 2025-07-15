import akeyless from 'akeyless';
import { SecretProvider, AkeylessConfig } from './types';
import { logError, logInfo } from '../utils/logger';

/**
 * Akeyless implementation of SecretProvider using the official SDK
 */
export class AkeylessProvider implements SecretProvider {
  private readonly client: akeyless.ApiClient;
  private readonly api: akeyless.V2Api;
  private readonly accessId: string;
  private readonly accessKey: string;
  private readonly basePath: string;
  
  /**
   * Create a new Akeyless provider using the official SDK
   * @param config The Akeyless configuration
   */
  constructor(config: AkeylessConfig) {
    // Set up Akeyless client
    this.client = akeyless.ApiClient.instance;
    
    // Configure base path if provided
    if (config.akeylessUrl) {
      this.client.basePath = config.akeylessUrl;
    }
    
    // Create API instance
    this.api = new akeyless.V2Api();
    
    // Store credentials for authentication
    this.accessId = config.akeylessAccessId;
    this.accessKey = config.akeylessAccessKey;
    
    // Store base path for secrets
    this.basePath = config.akeylessPath.endsWith('/') 
      ? config.akeylessPath.slice(0, -1) 
      : config.akeylessPath;
    
    logInfo(`Akeyless client created for ${this.client.basePath}`);
  }

  /**
   * Authenticate with Akeyless
   */
  private async authenticate(): Promise<string> {
    try {
      logInfo('Authenticating with Akeyless');
      
      const authBody = new akeyless.Auth({
        accessId: this.accessId,
        accessKey: this.accessKey,
      });
      
      const response = await this.api.auth(authBody);
      
      if (!response.token) {
        throw new Error('Failed to authenticate with Akeyless');
      }
      
      return response.token;
    } catch (error) {
      logError('Error authenticating with Akeyless', error);
      throw new Error('Failed to authenticate with Akeyless');
    }
  }

  /**
   * Get the full path for a secret
   * @param key Secret key
   */
  private getSecretPath(key: string): string {
    // Normalize the key to avoid path traversal and invalid characters
    const normalizedKey = key.replace(/[^a-zA-Z0-9-_]/g, '-');
    return `${this.basePath}/${normalizedKey}`;
  }

  /**
   * Store a secret in Akeyless
   * @param key The secret key
   * @param value The secret value
   */
  async storeSecret(key: string, value: string): Promise<boolean> {
    try {
      const secretPath = this.getSecretPath(key);
      
      logInfo(`Storing secret in Akeyless with key: ${secretPath}`);
      
      // Authenticate first
      const token = await this.authenticate();
      
      // Create or update secret
      const setSecretBody = new akeyless.SetItem({
        name: secretPath,
        value,
        token,
        type: 'password',
      });
      
      await this.api.setItem(setSecretBody);
      return true;
    } catch (error) {
      logError('Error storing secret in Akeyless', error);
      return false;
    }
  }

  /**
   * Retrieve a secret from Akeyless
   * @param key The secret key
   */
  async getSecret(key: string): Promise<string | null> {
    try {
      const secretPath = this.getSecretPath(key);
      
      logInfo(`Getting secret from Akeyless with key: ${secretPath}`);
      
      // Authenticate first
      const token = await this.authenticate();
      
      // Get secret
      const getSecretBody = new akeyless.GetSecretValue({
        names: [secretPath],
        token,
      });
      
      const response = await this.api.getSecretValue(getSecretBody);
      
      if (!response || !response[secretPath]) {
        return null;
      }
      
      return response[secretPath];
    } catch (error: any) {
      // Handle not found errors
      if (error.response && error.response.status === 404) {
        return null;
      }
      
      logError('Error retrieving secret from Akeyless', error);
      throw error;
    }
  }

  /**
   * Delete a secret from Akeyless
   * @param key The secret key
   */
  async deleteSecret(key: string): Promise<boolean> {
    try {
      const secretPath = this.getSecretPath(key);
      
      logInfo(`Deleting secret from Akeyless with key: ${secretPath}`);
      
      // Authenticate first
      const token = await this.authenticate();
      
      // Delete secret
      const deleteSecretBody = new akeyless.DeleteItem({
        name: secretPath,
        token,
        deleteImmediately: true, // Delete immediately without soft delete
      });
      
      await this.api.deleteItem(deleteSecretBody);
      return true;
    } catch (error: any) {
      // If the item doesn't exist, consider it a success
      if (error.response && error.response.status === 404) {
        return true;
      }
      
      logError('Error deleting secret from Akeyless', error);
      return false;
    }
  }

  /**
   * Test connection to Akeyless
   */
  async testConnection(): Promise<boolean> {
    try {
      logInfo('Testing connection to Akeyless');
      
      // Try to authenticate
      await this.authenticate();
      
      return true;
    } catch (error) {
      logError('Error connecting to Akeyless', error);
      return false;
    }
  }
}
