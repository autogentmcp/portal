"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AkeylessProvider = void 0;
const akeyless_1 = __importDefault(require("akeyless"));
const logger_1 = require("../utils/logger");
/**
 * Akeyless implementation of SecretProvider using the official SDK
 */
class AkeylessProvider {
    /**
     * Create a new Akeyless provider using the official SDK
     * @param config The Akeyless configuration
     */
    constructor(config) {
        // Set up Akeyless client
        this.client = akeyless_1.default.ApiClient.instance;
        // Configure base path if provided
        if (config.akeylessUrl) {
            this.client.basePath = config.akeylessUrl;
        }
        // Create API instance
        this.api = new akeyless_1.default.V2Api();
        // Store credentials for authentication
        this.accessId = config.akeylessAccessId;
        this.accessKey = config.akeylessAccessKey;
        // Store base path for secrets
        this.basePath = config.akeylessPath.endsWith('/')
            ? config.akeylessPath.slice(0, -1)
            : config.akeylessPath;
        (0, logger_1.logInfo)(`Akeyless client created for ${this.client.basePath}`);
    }
    /**
     * Authenticate with Akeyless
     */
    async authenticate() {
        try {
            (0, logger_1.logInfo)('Authenticating with Akeyless');
            const authBody = new akeyless_1.default.Auth({
                accessId: this.accessId,
                accessKey: this.accessKey,
            });
            const response = await this.api.auth(authBody);
            if (!response.token) {
                throw new Error('Failed to authenticate with Akeyless');
            }
            return response.token;
        }
        catch (error) {
            (0, logger_1.logError)('Error authenticating with Akeyless', error);
            throw new Error('Failed to authenticate with Akeyless');
        }
    }
    /**
     * Get the full path for a secret
     * @param key Secret key
     */
    getSecretPath(key) {
        // Normalize the key to avoid path traversal and invalid characters
        const normalizedKey = key.replace(/[^a-zA-Z0-9-_]/g, '-');
        return `${this.basePath}/${normalizedKey}`;
    }
    /**
     * Store a secret in Akeyless
     * @param key The secret key
     * @param value The secret value
     */
    async storeSecret(key, value) {
        try {
            const secretPath = this.getSecretPath(key);
            (0, logger_1.logInfo)(`Storing secret in Akeyless with key: ${secretPath}`);
            // Authenticate first
            const token = await this.authenticate();
            // Create or update secret
            const setSecretBody = new akeyless_1.default.SetItem({
                name: secretPath,
                value,
                token,
                type: 'password',
            });
            await this.api.setItem(setSecretBody);
            return true;
        }
        catch (error) {
            (0, logger_1.logError)('Error storing secret in Akeyless', error);
            return false;
        }
    }
    /**
     * Retrieve a secret from Akeyless
     * @param key The secret key
     */
    async getSecret(key) {
        try {
            const secretPath = this.getSecretPath(key);
            (0, logger_1.logInfo)(`Getting secret from Akeyless with key: ${secretPath}`);
            // Authenticate first
            const token = await this.authenticate();
            // Get secret
            const getSecretBody = new akeyless_1.default.GetSecretValue({
                names: [secretPath],
                token,
            });
            const response = await this.api.getSecretValue(getSecretBody);
            if (!response || !response[secretPath]) {
                return null;
            }
            return response[secretPath];
        }
        catch (error) {
            // Handle not found errors
            if (error.response && error.response.status === 404) {
                return null;
            }
            (0, logger_1.logError)('Error retrieving secret from Akeyless', error);
            throw error;
        }
    }
    /**
     * Delete a secret from Akeyless
     * @param key The secret key
     */
    async deleteSecret(key) {
        try {
            const secretPath = this.getSecretPath(key);
            (0, logger_1.logInfo)(`Deleting secret from Akeyless with key: ${secretPath}`);
            // Authenticate first
            const token = await this.authenticate();
            // Delete secret
            const deleteSecretBody = new akeyless_1.default.DeleteItem({
                name: secretPath,
                token,
                deleteImmediately: true, // Delete immediately without soft delete
            });
            await this.api.deleteItem(deleteSecretBody);
            return true;
        }
        catch (error) {
            // If the item doesn't exist, consider it a success
            if (error.response && error.response.status === 404) {
                return true;
            }
            (0, logger_1.logError)('Error deleting secret from Akeyless', error);
            return false;
        }
    }
    /**
     * Store credentials object in Akeyless with proper encoding for sensitive fields
     * @param key The key to store the credentials under
     * @param credentials The credentials object
     * @returns Promise resolving to boolean indicating success
     */
    async storeCredentials(key, credentials) {
        try {
            const credentialsJson = JSON.stringify(credentials);
            return await this.storeSecret(key, credentialsJson);
        }
        catch (error) {
            (0, logger_1.logError)('Error storing credentials in Akeyless', error);
            return false;
        }
    }
    /**
     * Retrieve credentials object from Akeyless with proper decoding for sensitive fields
     * @param key The key to retrieve
     * @returns Promise resolving to the credentials object or null if not found
     */
    async getCredentials(key) {
        try {
            const credentialsJson = await this.getSecret(key);
            if (!credentialsJson) {
                return null;
            }
            return JSON.parse(credentialsJson);
        }
        catch (error) {
            (0, logger_1.logError)('Error retrieving credentials from Akeyless', error);
            return null;
        }
    }
    /**
     * Test connection to Akeyless
     */
    async testConnection() {
        try {
            (0, logger_1.logInfo)('Testing connection to Akeyless');
            // Try to authenticate
            await this.authenticate();
            return true;
        }
        catch (error) {
            (0, logger_1.logError)('Error connecting to Akeyless', error);
            return false;
        }
    }
}
exports.AkeylessProvider = AkeylessProvider;
