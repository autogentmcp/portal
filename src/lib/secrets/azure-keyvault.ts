import { SecretClient } from '@azure/keyvault-secrets';
import { ClientSecretCredential } from '@azure/identity';
import { SecretProvider, AzureKeyVaultConfig } from './types';
import { logError, logInfo } from '../utils/logger';

/**
 * Azure Key Vault implementation of SecretProvider using the official Azure SDK
 */
export class AzureKeyVaultProvider implements SecretProvider {
  private readonly client: SecretClient;
  private readonly vaultUrl: string;

  /**
   * Create a new Azure Key Vault provider using the official Azure SDK
   * @param config The vault configuration
   */
  constructor(config: AzureKeyVaultConfig) {
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
      await this.client.setSecret(safeKey, value);
      return true;
    } catch (error) {
      logError('Error storing secret in Azure Key Vault', error);
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
      
      return response.value || null;
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
   * Delete a secret from Azure Key Vault
   * @param key The secret key
   */
  async deleteSecret(key: string): Promise<boolean> {
    try {
      const safeKey = key.replace(/[^a-zA-Z0-9-]/g, '-');
      
      logInfo(`Deleting secret from Azure Key Vault with key: ${safeKey}`);
      const poller = await this.client.beginDeleteSecret(safeKey);
      await poller.pollUntilDone();
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
      
      // Try to list one secret to verify permissions
      const response = await this.client.listPropertiesOfSecrets().next();
      
      return !response.done || !!response.value;
    } catch (error) {
      logError('Error connecting to Azure Key Vault', error);
      return false;
    }
  }
}
