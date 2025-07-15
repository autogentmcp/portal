// Only include the environment-based implementation
export * from './hashicorp-vault';
export * from './azure-keyvault';
export * from './akeyless';

// Simplified environment-based implementation
export * from './env-types';
export * from './env-config-loader';
export * from './env-factory';
export * from './env-manager';
export * from './env-setup';

// Export the environment-based manager as the default implementation
export { EnvSecretManager as SecretManager } from './env-manager';
export { initEnvSecretManagement as initSecretManagement } from './env-setup';
