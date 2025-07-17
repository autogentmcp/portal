"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvSecretProviderFactory = void 0;
const hashicorp_vault_1 = require("./hashicorp-vault");
const azure_keyvault_1 = require("./azure-keyvault");
const akeyless_1 = require("./akeyless");
const env_config_loader_1 = require("./env-config-loader");
const logger_1 = require("../utils/logger");
/**
 * Factory for creating secret providers based on environment configuration
 */
class EnvSecretProviderFactory {
    /**
     * Create a secret provider based on environment configuration
     * @returns The appropriate SecretProvider implementation or null if not configured
     */
    static createProvider() {
        const providerType = env_config_loader_1.EnvConfigLoader.getProviderType();
        if (!providerType) {
            return null;
        }
        (0, logger_1.logInfo)(`Creating secret provider of type: ${providerType} from environment variables`);
        switch (providerType) {
            case 'hashicorp_vault': {
                const config = env_config_loader_1.EnvConfigLoader.loadHashiCorpVaultConfig();
                return config ? new hashicorp_vault_1.HashiCorpVaultProvider(config) : null;
            }
            case 'azure_keyvault': {
                const config = env_config_loader_1.EnvConfigLoader.loadAzureKeyVaultConfig();
                return config ? new azure_keyvault_1.AzureKeyVaultProvider(config) : null;
            }
            case 'akeyless': {
                const config = env_config_loader_1.EnvConfigLoader.loadAkeylessConfig();
                return config ? new akeyless_1.AkeylessProvider(config) : null;
            }
            default: {
                // This should never happen due to TypeScript's type checking
                const unreachableType = providerType;
                (0, logger_1.logError)(`Unknown security provider type: ${providerType}`);
                return null;
            }
        }
    }
}
exports.EnvSecretProviderFactory = EnvSecretProviderFactory;
