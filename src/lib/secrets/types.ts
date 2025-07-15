/**
 * Interface for secret providers
 */
export interface SecretProvider {
  /**
   * Store a secret in the vault
   * @param key The key to store the secret under
   * @param value The secret value
   * @returns Promise resolving to boolean indicating success
   */
  storeSecret(key: string, value: string): Promise<boolean>;

  /**
   * Retrieve a secret from the vault
   * @param key The key to retrieve
   * @returns Promise resolving to the secret value or null if not found
   */
  getSecret(key: string): Promise<string | null>;

  /**
   * Delete a secret from the vault
   * @param key The key to delete
   * @returns Promise resolving to boolean indicating success
   */
  deleteSecret(key: string): Promise<boolean>;

  /**
   * Test the connection to the vault
   * @returns Promise resolving to boolean indicating success
   */
  testConnection(): Promise<boolean>;
}

/**
 * Configuration for HashiCorp Vault
 */
export interface HashiCorpVaultConfig {
  vaultUrl: string;
  vaultToken: string;
  vaultNamespace?: string;
  vaultCaCert?: string;
  vaultMount?: string;
  vaultPath: string;
  vaultSkipVerify?: boolean;
}

/**
 * Configuration for Azure Key Vault
 */
export interface AzureKeyVaultConfig {
  azureKeyVaultUrl: string;
  azureTenantId: string;
  azureClientId: string;
  azureClientSecret: string;
}

/**
 * Configuration for Akeyless
 */
export interface AkeylessConfig {
  akeylessUrl: string;
  akeylessAccessId: string;
  akeylessAccessKey: string;
  akeylessPath: string;
}

/**
 * Configuration for AWS Secrets Manager
 */
export interface AWSSecretsManagerConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
}

/**
 * Configuration for Google Cloud Secret Manager
 */
export interface GCPSecretManagerConfig {
  projectId: string;
  credentials?: {
    client_email: string;
    private_key: string;
  };
}

/**
 * Union type of all provider configurations
 */
export type SecretProviderConfig = 
  | { type: 'hashicorp_vault'; config: HashiCorpVaultConfig }
  | { type: 'azure_keyvault'; config: AzureKeyVaultConfig }
  | { type: 'akeyless'; config: AkeylessConfig }
  | { type: 'aws_secrets_manager'; config: AWSSecretsManagerConfig }
  | { type: 'gcp_secret_manager'; config: GCPSecretManagerConfig };
