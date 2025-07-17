import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { SecretProvider, GCPSecretManagerConfig } from './types';
import { logError, logInfo } from '../utils/logger';

/**
 * Google Cloud Secret Manager implementation of SecretProvider using the official SDK
 */
export class GCPSecretManagerProvider implements SecretProvider {
  private readonly client: SecretManagerServiceClient;
  private readonly projectId: string;
  
  /**
   * Create a new Google Cloud Secret Manager provider
   * @param config The GCP Secret Manager configuration
   */
  constructor(config: GCPSecretManagerConfig) {
    // Create the GCP Secret Manager client
    this.client = new SecretManagerServiceClient({
      credentials: config.credentials,
    });
    
    this.projectId = config.projectId;
    
    logInfo(`GCP Secret Manager client created for project: ${config.projectId}`);
  }

  /**
   * Store a secret in GCP Secret Manager
   * @param key The secret key
   * @param value The secret value
   */
  async storeSecret(key: string, value: string): Promise<boolean> {
    try {
      // Normalize key for GCP Secret Manager naming requirements
      const secretName = this.normalizeKey(key);
      const parent = `projects/${this.projectId}`;
      const secretId = secretName;
      const fullSecretName = `${parent}/secrets/${secretId}`;
      
      logInfo(`Storing secret in GCP Secret Manager with key: ${secretId}`);

      let secretExists = false;
      
      try {
        // Check if the secret already exists
        await this.client.getSecret({ name: fullSecretName });
        secretExists = true;
      } catch (error: any) {
        // Secret doesn't exist, will create it
        secretExists = false;
      }
      
      if (!secretExists) {
        // Create the secret
        await this.client.createSecret({
          parent,
          secretId,
          secret: {
            replication: {
              automatic: {},
            },
          },
        });
      }
      
      // Add a new version with the secret value
      await this.client.addSecretVersion({
        parent: fullSecretName,
        payload: {
          data: Buffer.from(value),
        },
      });
      
      return true;
    } catch (error) {
      logError('Error storing secret in GCP Secret Manager', error);
      return false;
    }
  }

  /**
   * Retrieve a secret from GCP Secret Manager
   * @param key The secret key
   */
  async getSecret(key: string): Promise<string | null> {
    try {
      const secretName = this.normalizeKey(key);
      const fullVersionName = `projects/${this.projectId}/secrets/${secretName}/versions/latest`;
      
      logInfo(`Getting secret from GCP Secret Manager with key: ${secretName}`);
      
      const [version] = await this.client.accessSecretVersion({ name: fullVersionName });
      
      if (!version.payload?.data) {
        return null;
      }
      
      return version.payload.data.toString();
    } catch (error: any) {
      // Handle not found errors
      if (error.code === 5) { // NOT_FOUND
        return null;
      }
      
      logError('Error retrieving secret from GCP Secret Manager', error);
      throw error;
    }
  }

  /**
   * Delete a secret from GCP Secret Manager
   * @param key The secret key
   */
  async deleteSecret(key: string): Promise<boolean> {
    try {
      const secretName = this.normalizeKey(key);
      const fullSecretName = `projects/${this.projectId}/secrets/${secretName}`;
      
      logInfo(`Deleting secret from GCP Secret Manager with key: ${secretName}`);
      
      try {
        await this.client.deleteSecret({ name: fullSecretName });
      } catch (error: any) {
        // If the secret doesn't exist, treat as success
        if (error.code === 5) { // NOT_FOUND
          return true;
        }
        throw error;
      }
      
      return true;
    } catch (error) {
      logError('Error deleting secret from GCP Secret Manager', error);
      return false;
    }
  }

  /**
   * Test connection to GCP Secret Manager
   */
  async testConnection(): Promise<boolean> {
    try {
      logInfo('Testing connection to GCP Secret Manager');
      
      // Try to list secrets to verify connectivity and permissions
      const parent = `projects/${this.projectId}`;
      const [secrets] = await this.client.listSecrets({ parent, pageSize: 1 });
      
      return true;
    } catch (error) {
      logError('Error connecting to GCP Secret Manager', error);
      return false;
    }
  }

  /**
   * Store credentials object in GCP Secret Manager with proper encoding for sensitive fields
   * @param key The key to store the credentials under
   * @param credentials The credentials object
   * @returns Promise resolving to boolean indicating success
   */
  async storeCredentials(key: string, credentials: Record<string, any>): Promise<boolean> {
    try {
      const credentialsJson = JSON.stringify(credentials);
      return await this.storeSecret(key, credentialsJson);
    } catch (error) {
      logError('Error storing credentials in GCP Secret Manager', error);
      return false;
    }
  }

  /**
   * Retrieve credentials object from GCP Secret Manager with proper decoding for sensitive fields
   * @param key The key to retrieve
   * @returns Promise resolving to the credentials object or null if not found
   */
  async getCredentials(key: string): Promise<Record<string, any> | null> {
    try {
      const credentialsJson = await this.getSecret(key);
      if (!credentialsJson) {
        return null;
      }
      return JSON.parse(credentialsJson);
    } catch (error) {
      logError('Error retrieving credentials from GCP Secret Manager', error);
      return null;
    }
  }

  /**
   * Normalize key for GCP Secret Manager naming conventions
   * @param key The key to normalize
   * @returns The normalized key
   */
  private normalizeKey(key: string): string {
    // GCP Secret Manager IDs must match [a-zA-Z0-9_-]+ pattern
    return key.replace(/[^a-zA-Z0-9_-]/g, '_');
  }
}
