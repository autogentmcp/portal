// Export all provider implementations
export * from './hashicorp-vault';
export * from './azure-keyvault';
export * from './akeyless';
export * from './aws-secrets-manager';
export * from './gcp-secret-manager';

// Export environment-based implementation
export * from './env-types';
export * from './env-config-loader';
export * from './env-factory';
export * from './env-manager';

// Export the environment-based manager as the default implementation
export { EnvSecretManager as SecretManager } from './env-manager';

// Import and re-export the setup function
import { initEnvSecretManagement } from './env-setup';
export { initEnvSecretManagement as initSecretManagement } from './env-setup';
