import { SecretProvider, SecretProviderConfig } from './types';
import { HashiCorpVaultProvider } from './hashicorp-vault';
import { AzureKeyVaultProvider } from './azure-keyvault';
import { AkeylessProvider } from './akeyless';
import { AWSSecretsManagerProvider } from './aws-secrets-manager';
import { GCPSecretManagerProvider } from './gcp-secret-manager';
import { logError, logInfo } from '../utils/logger';

/**
 * Factory for creating secret providers
 */
export class SecretProviderFactory {
  /**
   * Create a secret provider based on the provided configuration
   * @param config The provider configuration
   * @returns The appropriate SecretProvider implementation
   */
  static createProvider(config: SecretProviderConfig): SecretProvider {
    logInfo(`Creating secret provider of type: ${config.type}`);
    
    switch (config.type) {
      case 'hashicorp_vault':
        return new HashiCorpVaultProvider(config.config);
      
      case 'azure_keyvault':
        return new AzureKeyVaultProvider(config.config);
      
      case 'akeyless':
        return new AkeylessProvider(config.config);
      
      case 'aws_secrets_manager':
        return new AWSSecretsManagerProvider(config.config);
      
      case 'gcp_secret_manager':
        return new GCPSecretManagerProvider(config.config);
      
      default:
        // This should never happen due to TypeScript's type checking
        const unreachableConfig: never = config;
        throw new Error(`Unknown secret provider type: ${(config as any).type}`);
    }
  }

  // This factory now only creates providers from config objects that come from .env files
  // No database interaction required
}
