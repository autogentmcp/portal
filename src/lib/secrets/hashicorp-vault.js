"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HashiCorpVaultProvider = void 0;
const vault = __importStar(require("node-vault"));
const base_provider_1 = require("./base-provider");
const logger_1 = require("../utils/logger");
/**
 * HashiCorp Vault implementation of SecretProvider using the official node-vault client
 */
class HashiCorpVaultProvider extends base_provider_1.BaseSecretProvider {
    /**
     * Create a new HashiCorp Vault provider using the official SDK
     * @param config The vault configuration
     */
    constructor(config) {
        super();
        // Create client options
        const options = {
            apiVersion: 'v1',
            endpoint: config.vaultUrl,
            token: config.vaultToken,
        };
        // Add namespace if provided (for Vault Enterprise)
        if (config.vaultNamespace) {
            options.namespace = config.vaultNamespace;
        }
        // Handle SSL/TLS configuration
        if (config.vaultSkipVerify) {
            // Disable SSL verification (not recommended for production)
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            (0, logger_1.logInfo)('SSL verification disabled for HashiCorp Vault');
        }
        // Handle custom CA certificate
        if (config.vaultCaCert) {
            options.requestOptions = {
                ca: config.vaultCaCert
            };
            (0, logger_1.logInfo)('Using custom CA certificate for HashiCorp Vault');
        }
        // Create vault client
        this.client = vault.default(options);
        // Set mount point and path
        this.mount = config.vaultMount || 'secret';
        this.path = config.vaultPath;
        (0, logger_1.logInfo)(`HashiCorp Vault client created for ${config.vaultUrl}`);
    }
    /**
     * Store a secret in HashiCorp Vault
     * @param key The secret key
     * @param value The secret value
     */
    async storeSecret(key, value) {
        try {
            const secretPath = `${this.path}/${key}`;
            (0, logger_1.logInfo)(`Storing secret in HashiCorp Vault with key: ${secretPath}`);
            // Encode the value to prevent tampering and formatting issues
            const encodedValue = this.encodeSecretValue(value);
            // Different API for KV v1 vs KV v2
            if (this.mount === 'secret') {
                // KV v2
                const fullPath = `${this.mount}/data/${secretPath}`;
                (0, logger_1.logInfo)(`Using KV v2 API, full path: ${fullPath}`);
                await this.client.write(fullPath, { data: { value: encodedValue } });
            }
            else {
                // KV v1
                const fullPath = `${this.mount}/${secretPath}`;
                (0, logger_1.logInfo)(`Using KV v1 API, full path: ${fullPath}`);
                await this.client.write(fullPath, { value: encodedValue });
            }
            return true;
        }
        catch (error) {
            (0, logger_1.logError)('Error storing secret in HashiCorp Vault', error);
            // Log detailed error information
            if (error.response) {
                (0, logger_1.logError)(`Vault API Response Status: ${error.response.statusCode}`);
                (0, logger_1.logError)(`Vault API Response Headers: ${JSON.stringify(error.response.headers)}`);
                (0, logger_1.logError)(`Vault API Response Body: ${JSON.stringify(error.response.body)}`);
            }
            if (error.request) {
                (0, logger_1.logError)(`Vault API Request URL: ${error.request.url}`);
                (0, logger_1.logError)(`Vault API Request Method: ${error.request.method}`);
                (0, logger_1.logError)(`Vault API Request Headers: ${JSON.stringify(error.request.headers)}`);
            }
            (0, logger_1.logError)(`Full error object: ${JSON.stringify(error, null, 2)}`);
            return false;
        }
    }
    /**
     * Retrieve a secret from HashiCorp Vault
     * @param key The secret key
     */
    async getSecret(key) {
        try {
            const secretPath = `${this.path}/${key}`;
            (0, logger_1.logInfo)(`Getting secret from HashiCorp Vault with key: ${secretPath}`);
            let result;
            // Different API for KV v1 vs KV v2
            if (this.mount === 'secret') {
                // KV v2
                const fullPath = `${this.mount}/data/${secretPath}`;
                (0, logger_1.logInfo)(`Using KV v2 API for read, full path: ${fullPath}`);
                result = await this.client.read(fullPath);
                (0, logger_1.logInfo)(`KV v2 read result: ${JSON.stringify(result?.data)}`);
                const encodedValue = result?.data?.data?.value || null;
                return encodedValue ? this.decodeSecretValue(encodedValue) : null;
            }
            else {
                // KV v1
                const fullPath = `${this.mount}/${secretPath}`;
                (0, logger_1.logInfo)(`Using KV v1 API for read, full path: ${fullPath}`);
                result = await this.client.read(fullPath);
                (0, logger_1.logInfo)(`KV v1 read result: ${JSON.stringify(result?.data)}`);
                const encodedValue = result?.data?.value || null;
                return encodedValue ? this.decodeSecretValue(encodedValue) : null;
            }
        }
        catch (error) {
            // Handle not found errors - Vault returns a 404 status
            if (error.response && error.response.statusCode === 404) {
                (0, logger_1.logInfo)(`Secret not found (404) for key: ${key}`);
                return null;
            }
            (0, logger_1.logError)('Error retrieving secret from HashiCorp Vault', error);
            // Log detailed error information
            if (error.response) {
                (0, logger_1.logError)(`Vault Read Response Status: ${error.response.statusCode}`);
                (0, logger_1.logError)(`Vault Read Response Headers: ${JSON.stringify(error.response.headers)}`);
                (0, logger_1.logError)(`Vault Read Response Body: ${JSON.stringify(error.response.body)}`);
            }
            if (error.request) {
                (0, logger_1.logError)(`Vault Read Request URL: ${error.request.url}`);
                (0, logger_1.logError)(`Vault Read Request Method: ${error.request.method}`);
                (0, logger_1.logError)(`Vault Read Request Headers: ${JSON.stringify(error.request.headers)}`);
            }
            throw error;
        }
    }
    /**
     * Store credentials object in HashiCorp Vault with proper encoding for sensitive fields
     * @param key The secret key
     * @param credentials The credentials object
     */
    async storeCredentials(key, credentials) {
        try {
            const secretPath = `${this.path}/${key}`;
            (0, logger_1.logInfo)(`Storing credentials in HashiCorp Vault with key: ${secretPath}`);
            // Process credentials and encode sensitive fields
            const processedCredentials = this.processCredentialsForStorage(credentials);
            // Different API for KV v1 vs KV v2
            if (this.mount === 'secret') {
                // KV v2
                const fullPath = `${this.mount}/data/${secretPath}`;
                (0, logger_1.logInfo)(`Using KV v2 API, full path: ${fullPath}`);
                await this.client.write(fullPath, { data: processedCredentials });
            }
            else {
                // KV v1
                const fullPath = `${this.mount}/${secretPath}`;
                (0, logger_1.logInfo)(`Using KV v1 API, full path: ${fullPath}`);
                await this.client.write(fullPath, processedCredentials);
            }
            return true;
        }
        catch (error) {
            (0, logger_1.logError)('Error storing credentials in HashiCorp Vault', error);
            // Log detailed error information
            if (error.response) {
                (0, logger_1.logError)(`Vault API Response Status: ${error.response.statusCode}`);
                (0, logger_1.logError)(`Vault API Response Headers: ${JSON.stringify(error.response.headers)}`);
                (0, logger_1.logError)(`Vault API Response Body: ${JSON.stringify(error.response.body)}`);
            }
            return false;
        }
    }
    /**
     * Retrieve credentials from HashiCorp Vault with proper decoding for sensitive fields
     * @param key The secret key
     */
    async getCredentials(key) {
        try {
            const secretPath = `${this.path}/${key}`;
            (0, logger_1.logInfo)(`Getting credentials from HashiCorp Vault with key: ${secretPath}`);
            let result;
            // Different API for KV v1 vs KV v2
            if (this.mount === 'secret') {
                // KV v2
                const fullPath = `${this.mount}/data/${secretPath}`;
                (0, logger_1.logInfo)(`Using KV v2 API for read, full path: ${fullPath}`);
                result = await this.client.read(fullPath);
                // (0, logger_1.logInfo)(`KV v2 read result: ${JSON.stringify(result?.data)}`);
                if (!result?.data?.data) {
                    return null;
                }
                return this.processCredentialsFromStorage(result.data.data);
            }
            else {
                // KV v1
                const fullPath = `${this.mount}/${secretPath}`;
                (0, logger_1.logInfo)(`Using KV v1 API for read, full path: ${fullPath}`);
                result = await this.client.read(fullPath);
                // (0, logger_1.logInfo)(`KV v1 read result: ${JSON.stringify(result?.data)}`);
                if (!result?.data) {
                    return null;
                }
                return this.processCredentialsFromStorage(result.data);
            }
        }
        catch (error) {
            // Handle not found errors - Vault returns a 404 status
            if (error.response && error.response.statusCode === 404) {
                (0, logger_1.logInfo)(`Credentials not found (404) for key: ${key}`);
                return null;
            }
            (0, logger_1.logError)('Error retrieving credentials from HashiCorp Vault', error);
            throw error;
        }
    }
    /**
     * Delete a secret from HashiCorp Vault
     * @param key The secret key
     */
    async deleteSecret(key) {
        try {
            const secretPath = `${this.path}/${key}`;
            (0, logger_1.logInfo)(`Deleting secret from HashiCorp Vault with key: ${secretPath}`);
            // Different API for KV v1 vs KV v2
            if (this.mount === 'secret') {
                // KV v1
                await this.client.delete(`${this.mount}/${secretPath}`);
            }
            else {
                // KV v2
                await this.client.delete(`${this.mount}/data/${secretPath}`);
            }
            return true;
        }
        catch (error) {
            (0, logger_1.logError)('Error deleting secret from HashiCorp Vault', error);
            return false;
        }
    }
    /**
     * Test connection to HashiCorp Vault
     */
    async testConnection() {
        try {
            (0, logger_1.logInfo)('Testing connection to HashiCorp Vault');
            // For KV v2 (which is the default for "secret" mount), use metadata path
            // For KV v1, use direct path
            const isKvV2 = this.mount === 'secret' || this.mount === 'kv';
            if (isKvV2) {
                // KV v2 - use metadata path
                const testPath = `${this.mount}/metadata/${this.path}`;
                (0, logger_1.logInfo)(`Testing KV v2 connection with path: ${testPath}`);
                await this.client.list(testPath);
            }
            else {
                // KV v1 - use direct path
                const testPath = `${this.mount}/${this.path}`;
                (0, logger_1.logInfo)(`Testing KV v1 connection with path: ${testPath}`);
                await this.client.list(testPath);
            }
            return true;
        }
        catch (error) {
            (0, logger_1.logError)('Error during vault connection test', error);
            // Log detailed error information
            if (error.response) {
                (0, logger_1.logError)(`Vault Test Response Status: ${error.response.statusCode}`);
                (0, logger_1.logError)(`Vault Test Response Headers: ${JSON.stringify(error.response.headers)}`);
                (0, logger_1.logError)(`Vault Test Response Body: ${JSON.stringify(error.response.body)}`);
            }
            // Special case: if the path doesn't exist but we can connect,
            // that's still a successful connection
            if (error.response && error.response.statusCode === 404) {
                try {
                    (0, logger_1.logInfo)('Path not found (404), attempting token lookup as fallback test');
                    // Check token status instead
                    await this.client.tokenLookupSelf();
                    (0, logger_1.logInfo)('Vault connection successful via token lookup (path does not exist yet)');
                    return true;
                }
                catch (err) {
                    (0, logger_1.logError)('Error during token lookup fallback', err);
                    if (err.response) {
                        (0, logger_1.logError)(`Token Lookup Response Status: ${err.response.statusCode}`);
                        (0, logger_1.logError)(`Token Lookup Response Body: ${JSON.stringify(err.response.body)}`);
                    }
                    return false;
                }
            }
            return false;
        }
    }
}
exports.HashiCorpVaultProvider = HashiCorpVaultProvider;
