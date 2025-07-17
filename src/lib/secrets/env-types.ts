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
   * Store credentials object in the vault with proper encoding for sensitive fields
   * @param key The key to store the credentials under
   * @param credentials The credentials object
   * @returns Promise resolving to boolean indicating success
   */
  storeCredentials(key: string, credentials: Record<string, any>): Promise<boolean>;

  /**
   * Retrieve credentials object from the vault with proper decoding for sensitive fields
   * @param key The key to retrieve
   * @returns Promise resolving to the credentials object or null if not found
   */
  getCredentials(key: string): Promise<Record<string, any> | null>;

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
  vaultPath: string;
  vaultMount?: string;
  vaultSkipVerify?: boolean;
  vaultCaCert?: string;
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
 * Supported provider types
 */
export type ProviderType = 'hashicorp_vault' | 'azure_keyvault' | 'akeyless';
