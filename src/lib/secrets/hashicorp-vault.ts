import * as vault from 'node-vault';
import { SecretProvider, HashiCorpVaultConfig } from './types';
import { logError, logInfo } from '@/lib/utils/logger';

/**
 * HashiCorp Vault implementation of SecretProvider using the official node-vault client
 */
export class HashiCorpVaultProvider implements SecretProvider {
  private readonly client: vault.client;
  private readonly mount: string;
  private readonly path: string;

  /**
   * Create a new HashiCorp Vault provider using the official SDK
   * @param config The vault configuration
   */
  constructor(config: HashiCorpVaultConfig) {
    // Create client options
    const options: vault.VaultOptions = {
      apiVersion: 'v1',
      endpoint: config.vaultUrl,
      token: config.vaultToken,
    };

    // Add namespace if provided (for Vault Enterprise)
    if (config.vaultNamespace) {
      options.namespace = config.vaultNamespace;
    }

    // Handle SSL/TLS configuration
    if (config.vaultSkipVerify) {
      // Disable SSL verification (not recommended for production)
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      logInfo('SSL verification disabled for HashiCorp Vault');
    }

    // Handle custom CA certificate
    if (config.vaultCaCert) {
      options.requestOptions = {
        ca: config.vaultCaCert
      };
      logInfo('Using custom CA certificate for HashiCorp Vault');
    }

    // Create vault client
    this.client = vault.default(options);
    
    // Set mount point and path
    this.mount = config.vaultMount || 'secret';
    this.path = config.vaultPath;
    
    logInfo(`HashiCorp Vault client created for ${config.vaultUrl}`);
  }

  /**
   * Store a secret in HashiCorp Vault
   * @param key The secret key
   * @param value The secret value
   */
  async storeSecret(key: string, value: string): Promise<boolean> {
    try {
      const secretPath = `${this.path}/${key}`;
      
      logInfo(`Storing secret in HashiCorp Vault with key: ${secretPath}`);
      
      // Different API for KV v1 vs KV v2
      if (this.mount === 'secret') {
        // KV v2
        const fullPath = `${this.mount}/data/${secretPath}`;
        logInfo(`Using KV v2 API, full path: ${fullPath}`);
        await this.client.write(fullPath, { data: { value } });
      } else {
        // KV v1
        const fullPath = `${this.mount}/${secretPath}`;
        logInfo(`Using KV v1 API, full path: ${fullPath}`);
        await this.client.write(fullPath, { value });
      }
      
      return true;
    } catch (error: any) {
      logError('Error storing secret in HashiCorp Vault', error);
      
      // Log detailed error information
      if (error.response) {
        logError(`Vault API Response Status: ${error.response.statusCode}`);
        logError(`Vault API Response Headers: ${JSON.stringify(error.response.headers)}`);
        logError(`Vault API Response Body: ${JSON.stringify(error.response.body)}`);
      }
      
      if (error.request) {
        logError(`Vault API Request URL: ${error.request.url}`);
        logError(`Vault API Request Method: ${error.request.method}`);
        logError(`Vault API Request Headers: ${JSON.stringify(error.request.headers)}`);
      }
      
      logError(`Full error object: ${JSON.stringify(error, null, 2)}`);
      
      return false;
    }
  }

  /**
   * Retrieve a secret from HashiCorp Vault
   * @param key The secret key
   */
  async getSecret(key: string): Promise<string | null> {
    try {
      const secretPath = `${this.path}/${key}`;
      
      logInfo(`Getting secret from HashiCorp Vault with key: ${secretPath}`);
      
      let result;
      
      // Different API for KV v1 vs KV v2
      if (this.mount === 'secret') {
        // KV v2
        const fullPath = `${this.mount}/data/${secretPath}`;
        logInfo(`Using KV v2 API for read, full path: ${fullPath}`);
        result = await this.client.read(fullPath);
        logInfo(`KV v2 read result: ${JSON.stringify(result?.data)}`);
        return result?.data?.data?.value || null;
      } else {
        // KV v1
        const fullPath = `${this.mount}/${secretPath}`;
        logInfo(`Using KV v1 API for read, full path: ${fullPath}`);
        result = await this.client.read(fullPath);
        logInfo(`KV v1 read result: ${JSON.stringify(result?.data)}`);
        return result?.data?.value || null;
      }
    } catch (error: any) {
      // Handle not found errors - Vault returns a 404 status
      if (error.response && error.response.statusCode === 404) {
        logInfo(`Secret not found (404) for key: ${key}`);
        return null;
      }
      
      logError('Error retrieving secret from HashiCorp Vault', error);
      
      // Log detailed error information
      if (error.response) {
        logError(`Vault Read Response Status: ${error.response.statusCode}`);
        logError(`Vault Read Response Headers: ${JSON.stringify(error.response.headers)}`);
        logError(`Vault Read Response Body: ${JSON.stringify(error.response.body)}`);
      }
      
      if (error.request) {
        logError(`Vault Read Request URL: ${error.request.url}`);
        logError(`Vault Read Request Method: ${error.request.method}`);
        logError(`Vault Read Request Headers: ${JSON.stringify(error.request.headers)}`);
      }
      
      throw error;
    }
  }

  /**
   * Delete a secret from HashiCorp Vault
   * @param key The secret key
   */
  async deleteSecret(key: string): Promise<boolean> {
    try {
      const secretPath = `${this.path}/${key}`;
      
      logInfo(`Deleting secret from HashiCorp Vault with key: ${secretPath}`);
      
      // Different API for KV v1 vs KV v2
      if (this.mount === 'secret') {
        // KV v1
        await this.client.delete(`${this.mount}/${secretPath}`);
      } else {
        // KV v2
        await this.client.delete(`${this.mount}/data/${secretPath}`);
      }
      
      return true;
    } catch (error) {
      logError('Error deleting secret from HashiCorp Vault', error);
      return false;
    }
  }

  /**
   * Test connection to HashiCorp Vault
   */
  async testConnection(): Promise<boolean> {
    try {
      logInfo('Testing connection to HashiCorp Vault');
      
      // For KV v2 (which is the default for "secret" mount), use metadata path
      // For KV v1, use direct path
      const isKvV2 = this.mount === 'secret' || this.mount === 'kv';
      
      if (isKvV2) {
        // KV v2 - use metadata path
        const testPath = `${this.mount}/metadata/${this.path}`;
        logInfo(`Testing KV v2 connection with path: ${testPath}`);
        await this.client.list(testPath);
      } else {
        // KV v1 - use direct path
        const testPath = `${this.mount}/${this.path}`;
        logInfo(`Testing KV v1 connection with path: ${testPath}`);
        await this.client.list(testPath);
      }
      
      return true;
    } catch (error: any) {
      logError('Error during vault connection test', error);
      
      // Log detailed error information
      if (error.response) {
        logError(`Vault Test Response Status: ${error.response.statusCode}`);
        logError(`Vault Test Response Headers: ${JSON.stringify(error.response.headers)}`);
        logError(`Vault Test Response Body: ${JSON.stringify(error.response.body)}`);
      }
      
      // Special case: if the path doesn't exist but we can connect,
      // that's still a successful connection
      if (error.response && error.response.statusCode === 404) {
        try {
          logInfo('Path not found (404), attempting token lookup as fallback test');
          // Check token status instead
          await this.client.tokenLookupSelf();
          logInfo('Vault connection successful via token lookup (path does not exist yet)');
          return true;
        } catch (err: any) {
          logError('Error during token lookup fallback', err);
          
          if (err.response) {
            logError(`Token Lookup Response Status: ${err.response.statusCode}`);
            logError(`Token Lookup Response Body: ${JSON.stringify(err.response.body)}`);
          }
          
          return false;
        }
      }
      
      return false;
    }
  }
}
