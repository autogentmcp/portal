"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvSecretManager = void 0;
const env_factory_1 = require("./env-factory");
const logger_1 = require("../utils/logger");
/**
 * Secret Manager service for working with environment-configured security providers
 */
class EnvSecretManager {
    constructor() {
        this.provider = null;
        this.initialized = false;
    }
    /**
     * Get the singleton instance of the EnvSecretManager
     */
    static getInstance() {
        if (!EnvSecretManager.instance) {
            EnvSecretManager.instance = new EnvSecretManager();
        }
        return EnvSecretManager.instance;
    }
    /**
     * Initialize the secret manager with a provider from environment configuration
     * This should be called on application startup
     */
    async init() {
        if (this.initialized) {
            return;
        }
        try {
            (0, logger_1.logInfo)('Initializing EnvSecretManager from environment variables');
            this.provider = env_factory_1.EnvSecretProviderFactory.createProvider();
            if (this.provider) {
                const testResult = await this.provider.testConnection();
                if (testResult) {
                    (0, logger_1.logInfo)('Secret provider connection tested successfully');
                }
                else {
                    (0, logger_1.logError)('Secret provider connection test failed');
                    this.provider = null;
                }
            }
            this.initialized = true;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to initialize EnvSecretManager', error);
            this.provider = null;
        }
    }
    /**
     * Check if a secret provider is available
     */
    hasProvider() {
        return this.provider !== null;
    }
    /**
     * Store a security setting in the configured provider
     * @param key The key to store
     * @param value The value to store
     * @returns Promise resolving to boolean indicating success
     */
    async storeSecuritySetting(key, value) {
        try {
            if (!this.provider) {
                (0, logger_1.logError)('No secret provider available for storing security setting');
                return false;
            }
            (0, logger_1.logInfo)(`Storing security setting: ${key}`);
            return await this.provider.storeSecret(key, value);
        }
        catch (error) {
            (0, logger_1.logError)(`Failed to store security setting: ${key}`, error);
            return false;
        }
    }
    /**
     * Store credentials object in the configured provider with proper encoding
     * @param key The key to store
     * @param credentials The credentials object
     * @returns Promise resolving to boolean indicating success
     */
    async storeCredentials(key, credentials) {
        try {
            if (!this.provider) {
                (0, logger_1.logError)('No secret provider available for storing credentials');
                return false;
            }
            (0, logger_1.logInfo)(`Storing credentials: ${key}`);
            return await this.provider.storeCredentials(key, credentials);
        }
        catch (error) {
            (0, logger_1.logError)(`Failed to store credentials: ${key}`, error);
            return false;
        }
    }
    /**
     * Retrieve a security setting from the configured provider
     * @param key The key to retrieve
     * @returns Promise resolving to the value or null if not found
     */
    async getSecuritySetting(key) {
        try {
            if (!this.provider) {
                (0, logger_1.logError)('No secret provider available for retrieving security setting');
                return null;
            }
            (0, logger_1.logInfo)(`Retrieving security setting: ${key}`);
            return await this.provider.getSecret(key);
        }
        catch (error) {
            (0, logger_1.logError)(`Failed to retrieve security setting: ${key}`, error);
            return null;
        }
    }
    /**
     * Retrieve credentials object from the configured provider with proper decoding
     * @param key The key to retrieve
     * @returns Promise resolving to the credentials object or null if not found
     */
    async getCredentials(key) {
        try {
            if (!this.provider) {
                (0, logger_1.logError)('No secret provider available for retrieving credentials');
                return null;
            }
            (0, logger_1.logInfo)(`Retrieving credentials: ${key}`);
            return await this.provider.getCredentials(key);
        }
        catch (error) {
            (0, logger_1.logError)(`Failed to retrieve credentials: ${key}`, error);
            return null;
        }
    }
    /**
     * Delete a security setting from the configured provider
     * @param key The key to delete
     * @returns Promise resolving to boolean indicating success
     */
    async deleteSecuritySetting(key) {
        try {
            if (!this.provider) {
                (0, logger_1.logError)('No secret provider available for deleting security setting');
                return false;
            }
            (0, logger_1.logInfo)(`Deleting security setting: ${key}`);
            return await this.provider.deleteSecret(key);
        }
        catch (error) {
            (0, logger_1.logError)(`Failed to delete security setting: ${key}`, error);
            return false;
        }
    }
    /**
     * Test the current provider connection
     * @returns Promise resolving to boolean indicating success
     */
    async testConnection() {
        try {
            if (!this.provider) {
                (0, logger_1.logError)('No secret provider available for testing connection');
                return false;
            }
            (0, logger_1.logInfo)('Testing secret provider connection');
            return await this.provider.testConnection();
        }
        catch (error) {
            (0, logger_1.logError)('Provider connection test failed', error);
            return false;
        }
    }
}
exports.EnvSecretManager = EnvSecretManager;
