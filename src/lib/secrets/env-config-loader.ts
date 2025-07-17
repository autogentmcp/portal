import { 
  HashiCorpVaultConfig, 
  AzureKeyVaultConfig, 
  AkeylessConfig, 
  ProviderType 
} from './env-types';
import { logInfo, logError } from '../utils/logger';

/**
 * Loads secret provider configuration from environment variables
 */
export class EnvConfigLoader {
  /**
   * Get the active provider type from environment variables
   * @returns The provider type or null if not configured
   */
  static getProviderType(): ProviderType | null {
    const providerType = process.env.SECURITY_PROVIDER as ProviderType;
    
    if (!providerType) {
      logInfo('No security provider configured in environment variables');
      return null;
    }
    
    if (!['hashicorp_vault', 'azure_keyvault', 'akeyless'].includes(providerType)) {
      logError(`Invalid security provider type: ${providerType}`);
      return null;
    }
    
    return providerType;
  }
  
  /**
   * Load HashiCorp Vault configuration from environment variables
   * @returns HashiCorp Vault configuration or null if not properly configured
   */
  static loadHashiCorpVaultConfig(): HashiCorpVaultConfig | null {
    const vaultUrl = process.env.VAULT_URL;
    const vaultToken = process.env.VAULT_TOKEN;
    const vaultPath = process.env.VAULT_PATH || 'secret/data/mcp';
    
    if (!vaultUrl || !vaultToken) {
      logError('Missing required HashiCorp Vault configuration in environment variables');
      return null;
    }
    
    // Handle SSL certificate configuration
    const vaultSkipVerify = process.env.VAULT_SKIP_VERIFY === 'true';
    let vaultCaCert: string | undefined;
    
    // Check for CA certificate file path
    if (process.env.VAULT_CACERT) {
      try {
        const fs = require('fs');
        vaultCaCert = fs.readFileSync(process.env.VAULT_CACERT, 'utf8');
        logInfo('Loaded CA certificate from file for HashiCorp Vault');
      } catch (error) {
        logError('Failed to load CA certificate file for HashiCorp Vault', error);
      }
    }
    
    // Check for CA certificate content directly
    if (!vaultCaCert && process.env.VAULT_CA_CERT_CONTENT) {
      try {
        // Decode base64 encoded certificate content
        vaultCaCert = Buffer.from(process.env.VAULT_CA_CERT_CONTENT, 'base64').toString('utf8');
        logInfo('Loaded CA certificate from environment variable for HashiCorp Vault');
      } catch (error) {
        logError('Failed to decode CA certificate content for HashiCorp Vault', error);
      }
    }
    
    return {
      vaultUrl,
      vaultToken,
      vaultNamespace: process.env.VAULT_NAMESPACE,
      vaultPath,
      vaultMount: process.env.VAULT_MOUNT || 'kv',
      vaultSkipVerify,
      vaultCaCert
    };
  }
  
  /**
   * Load Azure KeyVault configuration from environment variables
   * @returns Azure KeyVault configuration or null if not properly configured
   */
  static loadAzureKeyVaultConfig(): AzureKeyVaultConfig | null {
    const azureKeyVaultUrl = process.env.AZURE_KEYVAULT_URL;
    const azureTenantId = process.env.AZURE_TENANT_ID;
    const azureClientId = process.env.AZURE_CLIENT_ID;
    const azureClientSecret = process.env.AZURE_CLIENT_SECRET;
    
    if (!azureKeyVaultUrl || !azureTenantId || !azureClientId || !azureClientSecret) {
      logError('Missing required Azure KeyVault configuration in environment variables');
      return null;
    }
    
    return {
      azureKeyVaultUrl,
      azureTenantId,
      azureClientId,
      azureClientSecret
    };
  }
  
  /**
   * Load Akeyless configuration from environment variables
   * @returns Akeyless configuration or null if not properly configured
   */
  static loadAkeylessConfig(): AkeylessConfig | null {
    const akeylessUrl = process.env.AKEYLESS_URL;
    const akeylessAccessId = process.env.AKEYLESS_ACCESS_ID;
    const akeylessAccessKey = process.env.AKEYLESS_ACCESS_KEY;
    const akeylessPath = process.env.AKEYLESS_PATH || '/mcp/secrets';
    
    if (!akeylessUrl || !akeylessAccessId || !akeylessAccessKey) {
      logError('Missing required Akeyless configuration in environment variables');
      return null;
    }
    
    return {
      akeylessUrl,
      akeylessAccessId,
      akeylessAccessKey,
      akeylessPath
    };
  }
}
