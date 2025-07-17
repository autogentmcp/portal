import {
  SecretsManagerClient,
  GetSecretValueCommand,
  CreateSecretCommand,
  UpdateSecretCommand,
  DeleteSecretCommand,
  ListSecretsCommand,
} from '@aws-sdk/client-secrets-manager';
import { SecretProvider, AWSSecretsManagerConfig } from './types';
import { BaseSecretProvider } from './base-provider';
import { logError, logInfo } from '../utils/logger';

/**
 * AWS Secrets Manager implementation of SecretProvider using the official SDK
 */
export class AWSSecretsManagerProvider extends BaseSecretProvider implements SecretProvider {
  private readonly client: SecretsManagerClient;
  
  /**
   * Create a new AWS Secrets Manager provider
   * @param config The AWS Secrets Manager configuration
   */
  constructor(config: AWSSecretsManagerConfig) {
    super();
    
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
      logInfo(`Storing secret in AWS Secrets Manager with key: ${key}`);
      
      // Encode the value to prevent tampering and formatting issues
      const encodedValue = this.encodeSecretValue(value);
      
      // Try to create the secret first
      try {
        await this.client.send(
          new CreateSecretCommand({
            Name: key,
            SecretString: encodedValue,
          })
        );
        logInfo(`Secret created successfully: ${key}`);
      } catch (error: any) {
        // If secret exists, update it
        if (error.name === 'ResourceExistsException') {
          await this.client.send(
            new UpdateSecretCommand({
              SecretId: key,
              SecretString: encodedValue,
            })
          );
          logInfo(`Secret updated successfully: ${key}`);
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
   * Store credentials object in AWS Secrets Manager with proper encoding for sensitive fields
   * @param key The secret key
   * @param credentials The credentials object
   */
  async storeCredentials(key: string, credentials: Record<string, any>): Promise<boolean> {
    try {
      logInfo(`Storing credentials in AWS Secrets Manager with key: ${key}`);
      
      // Process credentials and encode sensitive fields
      const processedCredentials = this.processCredentialsForStorage(credentials);
      
      // Store as JSON string
      const credentialsJson = JSON.stringify(processedCredentials);
      
      // Try to create the secret first
      try {
        await this.client.send(
          new CreateSecretCommand({
            Name: key,
            SecretString: credentialsJson,
          })
        );
        logInfo(`Credentials created successfully: ${key}`);
      } catch (error: any) {
        // If secret exists, update it
        if (error.name === 'ResourceExistsException') {
          await this.client.send(
            new UpdateSecretCommand({
              SecretId: key,
              SecretString: credentialsJson,
            })
          );
          logInfo(`Credentials updated successfully: ${key}`);
        } else {
          throw error;
        }
      }
      
      return true;
    } catch (error) {
      logError('Error storing credentials in AWS Secrets Manager', error);
      return false;
    }
  }

  /**
   * Retrieve a secret from AWS Secrets Manager
   * @param key The secret key
   */
  async getSecret(key: string): Promise<string | null> {
    try {
      logInfo(`Getting secret from AWS Secrets Manager with key: ${key}`);
      
      const command = new GetSecretValueCommand({
        SecretId: key,
      });
      
      const response = await this.client.send(command);
      const encodedValue = response.SecretString || null;
      
      return encodedValue ? this.decodeSecretValue(encodedValue) : null;
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
   * Retrieve credentials from AWS Secrets Manager with proper decoding for sensitive fields
   * @param key The secret key
   */
  async getCredentials(key: string): Promise<Record<string, any> | null> {
    try {
      logInfo(`Getting credentials from AWS Secrets Manager with key: ${key}`);
      
      const command = new GetSecretValueCommand({
        SecretId: key,
      });
      
      const response = await this.client.send(command);
      
      if (!response.SecretString) {
        return null;
      }
      
      const storedCredentials = JSON.parse(response.SecretString);
      return this.processCredentialsFromStorage(storedCredentials);
    } catch (error: any) {
      // Handle not found errors
      if (error.name === 'ResourceNotFoundException') {
        return null;
      }
      
      logError('Error retrieving credentials from AWS Secrets Manager', error);
      throw error;
    }
  }

  /**
   * Delete a secret from AWS Secrets Manager
   * @param key The secret key
   */
  async deleteSecret(key: string): Promise<boolean> {
    try {
      logInfo(`Deleting secret from AWS Secrets Manager with key: ${key}`);
      
      const command = new DeleteSecretCommand({
        SecretId: key,
        ForceDeleteWithoutRecovery: true, // Delete immediately without recovery window
      });
      
      await this.client.send(command);
      return true;
    } catch (error: any) {
      // Handle not found errors
      if (error.name === 'ResourceNotFoundException') {
        return true; // Already deleted
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
      
      // Try to list secrets to test connection
      const command = new ListSecretsCommand({ MaxResults: 1 });
      await this.client.send(command);
      
      logInfo('AWS Secrets Manager connection test successful');
      return true;
    } catch (error) {
      logError('Error during AWS Secrets Manager connection test', error);
      return false;
    }
  }
}
