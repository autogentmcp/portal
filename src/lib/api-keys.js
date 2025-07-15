const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { SecretManager } = require('../../script-utils');

// Try to import logger, but provide fallbacks if not available
let logInfo, logError;
try {
  const logger = require('./utils/logger');
  logInfo = logger.logInfo;
  logError = logger.logError;
} catch (e) {
  logInfo = console.log;
  logError = console.error;
}

// Initialize prisma client
const prisma = new PrismaClient();

// Constants for API key security
const API_KEY_PREFIX = 'mcp_key_';
const API_KEY_VAULT_PREFIX = 'api_key_';
const SALT_ROUNDS = 10;

/**
 * Generate a secure API key
 * @returns A randomly generated API key with prefix
 */
async function generateApiKey() {
  // Create a random buffer of 32 bytes (256 bits)
  const buffer = crypto.randomBytes(32);
  // Convert to a base64 string and replace characters that might cause issues
  const randomString = buffer.toString('base64')
    .replace(/\+/g, 'A')
    .replace(/\//g, 'B')
    .replace(/=/g, 'C');
  
  // Add prefix to make it clear this is an API key
  return `${API_KEY_PREFIX}${randomString}`;
}

/**
 * Hash an API key for storage in the database
 * @param apiKey The API key to hash
 * @returns The hashed API key
 */
async function hashApiKey(apiKey) {
  return bcrypt.hash(apiKey, SALT_ROUNDS);
}

/**
 * Verify an API key against its hashed version
 * @param apiKey The API key to verify
 * @param hashedApiKey The hashed API key from the database
 * @returns True if the API key matches the hash
 */
async function verifyApiKey(apiKey, hashedApiKey) {
  return bcrypt.compare(apiKey, hashedApiKey);
}

/**
 * Create a new API key with vault storage and database hash
 * @param {Object} params Parameters for key creation
 * @param {string} params.name The name of the API key
 * @param {string} params.applicationId The application ID the key belongs to
 * @param {string} params.environmentId The environment ID the key belongs to
 * @param {string} params.userId The user ID who created the key
 * @param {Date|null} [params.expiresAt=null] Optional expiration date
 * @returns The created API key object with plaintext key (only available at creation time)
 */
async function createApiKey({ 
  name, 
  applicationId, 
  environmentId, 
  userId, 
  expiresAt = null 
}) {
  // Generate a new API key
  const apiKey = await generateApiKey();
  
  // Hash the API key for database storage
  const hashedApiKey = await hashApiKey(apiKey);
  
  // Create a unique vault key using application and key ID
  const keyId = crypto.randomUUID();
  const vaultKey = `${API_KEY_VAULT_PREFIX}${applicationId}_${keyId}`;
  
  // Store the original API key in the vault
  const secretManager = SecretManager.getInstance();
  
  // Check if secret manager is available
  if (!secretManager.hasProvider()) {
    logError('No secret provider available for API key storage');
    throw new Error('Secret provider unavailable');
  }
  
  // Store the API key in the vault
  const storedInVault = await secretManager.storeSecuritySetting(vaultKey, apiKey);
  
  if (!storedInVault) {
    logError('Failed to store API key in vault');
    throw new Error('Failed to store API key in vault');
  }
  
  // Create the API key record in the database with the hash
  const apiKeyRecord = await prisma.apiKey.create({
    data: {
      id: keyId,
      name,
      token: hashedApiKey, // Store the hashed version in the database
      applicationId,
      environmentId,
      userId,
      expiresAt,
      status: 'ACTIVE',
    }
  });
  
  logInfo(`Created API key ${name} for application ${applicationId}`);
  
  // Return the API key details including the plaintext key (only shown once)
  return {
    ...apiKeyRecord,
    plaintextToken: apiKey // Only returned at creation time
  };
}

/**
 * Verify an API key by checking the hash in the database
 * @param {string} apiKey The API key to verify
 * @returns The API key record if valid, null otherwise
 */
async function verifyApiKeyFromDatabase(apiKey) {
  // Find all API keys (this is inefficient but we need to check each one)
  const apiKeys = await prisma.apiKey.findMany({
    where: { status: 'ACTIVE' },
    include: {
      application: true,
      environment: true
    }
  });
  
  // Check each API key
  for (const keyRecord of apiKeys) {
    const isValid = await verifyApiKey(apiKey, keyRecord.token);
    if (isValid) {
      // Update last used timestamp
      await prisma.apiKey.update({
        where: { id: keyRecord.id },
        data: { lastUsed: new Date() }
      });
      
      return keyRecord;
    }
  }
  
  return null;
}

/**
 * Delete an API key from both database and vault
 * @param {string} keyId The ID of the API key to delete
 */
async function deleteApiKey(keyId) {
  try {
    // Get the API key record
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: keyId }
    });
    
    if (!apiKey) {
      throw new Error(`API key with ID ${keyId} not found`);
    }
    
    // Delete from vault first
    const secretManager = SecretManager.getInstance();
    const vaultKey = `${API_KEY_VAULT_PREFIX}${apiKey.applicationId}_${keyId}`;
    
    if (secretManager.hasProvider()) {
      await secretManager.deleteSecuritySetting(vaultKey);
      logInfo(`Deleted API key ${keyId} from vault`);
    }
    
    // Then delete from database
    await prisma.apiKey.delete({
      where: { id: keyId }
    });
    
    logInfo(`Deleted API key ${keyId} from database`);
    
    return true;
  } catch (error) {
    logError(`Error deleting API key ${keyId}`, error);
    throw error;
  }
}

module.exports = {
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  createApiKey,
  verifyApiKeyFromDatabase,
  deleteApiKey
};
