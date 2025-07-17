import { SecretClient } from '@azure/keyvault-secrets';
import { ClientSecretCredential } from '@azure/identity';
import { SecretProvider, AzureKeyVaultConfig } from './types';
import { BaseSecretProvider } from './base-provider';
import { logError, logInfo } from '../utils/logger';

/**
 * Azure Key Vault implementation of SecretProvider using the official Azure SDK
 */
export class AzureKeyVaultProvider extends BaseSecretProvider implements SecretProvider {
  private readonly client: SecretClient;
  private readonly vaultUrl: string;

  /**
   * Create a new Azure Key Vault provider using the official Azure SDK
   * @param config The vault configuration
   */
  constructor(config: AzureKeyVaultConfig) {
    super();
    
    this.vaultUrl = config.azureKeyVaultUrl.endsWith('/') 
      ? config.azureKeyVaultUrl.slice(0, -1) 
      : config.azureKeyVaultUrl;
      
    // Create a credential using client secret
    const credential = new ClientSecretCredential(
      config.azureTenantId,
      config.azureClientId,
      config.azureClientSecret
    );
    
    // Create the secret client
    this.client = new SecretClient(this.vaultUrl, credential);
    
    logInfo(`Azure Key Vault client created for ${this.vaultUrl}`);
  }

  /**
   * Store a secret in Azure Key Vault
   * @param key The secret key
   * @param value The secret value
   */
  async storeSecret(key: string, value: string): Promise<boolean> {
    try {
      // Azure Key Vault keys can't contain spaces or special characters
      const safeKey = key.replace(/[^a-zA-Z0-9-]/g, '-');
      
      logInfo(`Storing secret in Azure Key Vault with key: ${safeKey}`);
      
      // Encode the value to prevent tampering and formatting issues
      const encodedValue = this.encodeSecretValue(value);
      await this.client.setSecret(safeKey, encodedValue);
      return true;
    } catch (error) {
      logError('Error storing secret in Azure Key Vault', error);
      return false;
    }
  }

  /**
   * Store credentials object in Azure Key Vault with proper encoding for sensitive fields
   * @param key The secret key
   * @param credentials The credentials object
   */
  async storeCredentials(key: string, credentials: Record<string, any>): Promise<boolean> {
    try {
      // Azure Key Vault keys can't contain spaces or special characters
      const safeKey = key.replace(/[^a-zA-Z0-9-]/g, '-');
      
      logInfo(`Storing credentials in Azure Key Vault with key: ${safeKey}`);
      
      // Process credentials and encode sensitive fields
      const processedCredentials = this.processCredentialsForStorage(credentials);
      
      // Store as JSON string
      await this.client.setSecret(safeKey, JSON.stringify(processedCredentials));
      return true;
    } catch (error) {
      logError('Error storing credentials in Azure Key Vault', error);
      return false;
    }
  }

  /**
   * Retrieve a secret from Azure Key Vault
   * @param key The secret key
   */
  async getSecret(key: string): Promise<string | null> {
    try {
      const safeKey = key.replace(/[^a-zA-Z0-9-]/g, '-');
      
      logInfo(`Getting secret from Azure Key Vault with key: ${safeKey}`);
      const response = await this.client.getSecret(safeKey);
      
      const encodedValue = response.value || null;
      return encodedValue ? this.decodeSecretValue(encodedValue) : null;
    } catch (error: any) {
      // Handle not found errors
      if (error.code === 'SecretNotFound') {
        return null;
      }
      
      logError('Error retrieving secret from Azure Key Vault', error);
      throw error;
    }
  }

  /**
   * Retrieve credentials from Azure Key Vault with proper decoding for sensitive fields
   * @param key The secret key
   */
  async getCredentials(key: string): Promise<Record<string, any> | null> {
    try {
      const safeKey = key.replace(/[^a-zA-Z0-9-]/g, '-');
      
      logInfo(`Getting credentials from Azure Key Vault with key: ${safeKey}`);
      const response = await this.client.getSecret(safeKey);
      
      if (!response.value) {
        return null;
      }
      
      const storedCredentials = JSON.parse(response.value);
      return this.processCredentialsFromStorage(storedCredentials);
    } catch (error: any) {
      // Handle not found errors
      if (error.code === 'SecretNotFound') {
        return null;
      }
      
      logError('Error retrieving credentials from Azure Key Vault', error);
      throw error;
    }
  }

  /**
   * Delete a secret from Azure Key Vault
   * @param key The secret key
   */
  async deleteSecret(key: string): Promise<boolean> {
    try {
      const safeKey = key.replace(/[^a-zA-Z0-9-]/g, '-');
      
      logInfo(`Deleting secret from Azure Key Vault with key: ${safeKey}`);
      await this.client.beginDeleteSecret(safeKey);
      return true;
    } catch (error) {
      logError('Error deleting secret from Azure Key Vault', error);
      return false;
    }
  }

  /**
   * Test connection to Azure Key Vault
   */
  async testConnection(): Promise<boolean> {
    try {
      logInfo('Testing connection to Azure Key Vault');
      
      // Try to list secrets (this will fail if we don't have permissions)
      const iterator = this.client.listPropertiesOfSecrets();
      
      // Just try to get the first result to test connection
      const firstResult = await iterator.next();
      logInfo('Azure Key Vault connection test successful');
      
      return true;
    } catch (error) {
      logError('Error during Azure Key Vault connection test', error);
      return false;
    }
  }
}
