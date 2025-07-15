import { SecretProvider, ProviderType } from './env-types';
import { HashiCorpVaultProvider } from './hashicorp-vault';
import { AzureKeyVaultProvider } from './azure-keyvault';
import { AkeylessProvider } from './akeyless';
import { EnvConfigLoader } from './env-config-loader';
import { logError, logInfo } from '../utils/logger';

/**
 * Factory for creating secret providers based on environment configuration
 */
export class EnvSecretProviderFactory {
  /**
   * Create a secret provider based on environment configuration
   * @returns The appropriate SecretProvider implementation or null if not configured
   */
  static createProvider(): SecretProvider | null {
    const providerType = EnvConfigLoader.getProviderType();
    
    if (!providerType) {
      return null;
    }
    
    logInfo(`Creating secret provider of type: ${providerType} from environment variables`);
    
    switch (providerType) {
      case 'hashicorp_vault': {
        const config = EnvConfigLoader.loadHashiCorpVaultConfig();
        return config ? new HashiCorpVaultProvider(config) : null;
      }
      
      case 'azure_keyvault': {
        const config = EnvConfigLoader.loadAzureKeyVaultConfig();
        return config ? new AzureKeyVaultProvider(config) : null;
      }
      
      case 'akeyless': {
        const config = EnvConfigLoader.loadAkeylessConfig();
        return config ? new AkeylessProvider(config) : null;
      }
      
      default: {
        // This should never happen due to TypeScript's type checking
        const unreachableType: never = providerType;
        logError(`Unknown security provider type: ${providerType}`);
        return null;
      }
    }
  }
}
