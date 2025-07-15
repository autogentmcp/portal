import {
  SecretsManagerClient,
  GetSecretValueCommand,
  CreateSecretCommand,
  UpdateSecretCommand,
  DeleteSecretCommand,
  ListSecretsCommand,
} from '@aws-sdk/client-secrets-manager';
import { SecretProvider, AWSSecretsManagerConfig } from './types';
import { logError, logInfo } from '@/lib/utils/logger';

/**
 * AWS Secrets Manager implementation of SecretProvider using the official SDK
 */
export class AWSSecretsManagerProvider implements SecretProvider {
  private readonly client: SecretsManagerClient;
  
  /**
   * Create a new AWS Secrets Manager provider
   * @param config The AWS Secrets Manager configuration
   */
  constructor(config: AWSSecretsManagerConfig) {
    // Create the AWS client with provided credentials
    this.client = new SecretsManagerClient({
      region: config.region,
      credentials: config.accessKeyId && config.secretAccessKey ? {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        sessionToken: config.sessionToken,
      } : undefined, // If no credentials provided, SDK will use environment vars or IAM role
    });
    
    logInfo(`AWS Secrets Manager client created for region: ${config.region}`);
  }

  /**
   * Store a secret in AWS Secrets Manager
   * @param key The secret key
   * @param value The secret value
   */
  async storeSecret(key: string, value: string): Promise<boolean> {
    try {
      // Normalize key for AWS naming requirements
      const secretName = this.normalizeKey(key);
      
      logInfo(`Storing secret in AWS Secrets Manager with key: ${secretName}`);
      
      try {
        // Try to get the secret to check if it exists
        await this.client.send(new GetSecretValueCommand({ SecretId: secretName }));
        
        // Secret exists, update it
        await this.client.send(new UpdateSecretCommand({
          SecretId: secretName,
          SecretString: value,
        }));
      } catch (error: any) {
        // Secret doesn't exist, create a new one
        if (error.name === 'ResourceNotFoundException') {
          await this.client.send(new CreateSecretCommand({
            Name: secretName,
            SecretString: value,
          }));
        } else {
          throw error;
        }
      }
      
      return true;
    } catch (error) {
      logError('Error storing secret in AWS Secrets Manager', error);
      return false;
    }
  }

  /**
   * Retrieve a secret from AWS Secrets Manager
   * @param key The secret key
   */
  async getSecret(key: string): Promise<string | null> {
    try {
      const secretName = this.normalizeKey(key);
      
      logInfo(`Getting secret from AWS Secrets Manager with key: ${secretName}`);
      
      const response = await this.client.send(
        new GetSecretValueCommand({ SecretId: secretName })
      );
      
      return response.SecretString || null;
    } catch (error: any) {
      // Handle not found errors
      if (error.name === 'ResourceNotFoundException') {
        return null;
      }
      
      logError('Error retrieving secret from AWS Secrets Manager', error);
      throw error;
    }
  }

  /**
   * Delete a secret from AWS Secrets Manager
   * @param key The secret key
   */
  async deleteSecret(key: string): Promise<boolean> {
    try {
      const secretName = this.normalizeKey(key);
      
      logInfo(`Deleting secret from AWS Secrets Manager with key: ${secretName}`);
      
      await this.client.send(new DeleteSecretCommand({
        SecretId: secretName,
        // Don't use recovery window to ensure immediate deletion
        ForceDeleteWithoutRecovery: true,
      }));
      
      return true;
    } catch (error: any) {
      // If the secret doesn't exist, treat as success
      if (error.name === 'ResourceNotFoundException') {
        return true;
      }
      
      logError('Error deleting secret from AWS Secrets Manager', error);
      return false;
    }
  }

  /**
   * Test connection to AWS Secrets Manager
   */
  async testConnection(): Promise<boolean> {
    try {
      logInfo('Testing connection to AWS Secrets Manager');
      
      // Try to list secrets to verify connectivity and permissions
      await this.client.send(new ListSecretsCommand({ MaxResults: 1 }));
      
      return true;
    } catch (error) {
      logError('Error connecting to AWS Secrets Manager', error);
      return false;
    }
  }

  /**
   * Normalize key for AWS Secrets Manager naming conventions
   * @param key The key to normalize
   * @returns The normalized key
   */
  private normalizeKey(key: string): string {
    // AWS Secret names must be ASCII letters, numbers, or the following characters: /_+=.@-
    return key.replace(/[^a-zA-Z0-9/_+=.@-]/g, '-');
  }
}
