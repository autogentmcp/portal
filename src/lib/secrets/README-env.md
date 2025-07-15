# Environment-Based Secret Vault Integration

This module provides integration with various secret providers using environment variables:
- HashiCorp Vault
- Azure Key Vault
- Akeyless

## Configuration

Configure your preferred secret provider using environment variables in your `.env` file:

### Provider Selection

```env
# Choose one of: hashicorp_vault, azure_keyvault, akeyless
SECURITY_PROVIDER="hashicorp_vault"
```

### HashiCorp Vault Configuration

```env
SECURITY_PROVIDER="hashicorp_vault"
VAULT_URL="https://vault.example.com"
VAULT_TOKEN="hvs.XXXXXXXXXXXX"
VAULT_NAMESPACE="admin"  # Optional
VAULT_PATH="secret/data/mcp"
VAULT_MOUNT="kv"
```

### Azure KeyVault Configuration

```env
SECURITY_PROVIDER="azure_keyvault"
AZURE_KEYVAULT_URL="https://myvault.vault.azure.net/"
AZURE_TENANT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
AZURE_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
AZURE_CLIENT_SECRET="your-client-secret"
```

### Akeyless Configuration

```env
SECURITY_PROVIDER="akeyless"
AKEYLESS_URL="https://api.akeyless.io"
AKEYLESS_ACCESS_ID="p-xxxxxxxx"
AKEYLESS_ACCESS_KEY="your-access-key"
AKEYLESS_PATH="/mcp/secrets"
```

## HashiCorp Vault Local Setup

Here's how to set up a local HashiCorp Vault for development:

```bash
# Start Vault server in dev mode
docker run --rm -p 8200:8200 --name vault hashicorp/vault:latest server -dev -dev-root-token-id="root"

# Set environment variables (PowerShell)
$env:VAULT_ADDR = "http://localhost:8200"
$env:VAULT_TOKEN = "root"

# Enable the KV v2 secrets engine if needed
vault secrets enable -version=2 kv
vault secrets enable -path=secret -version=2 kv

# Create an example secret
vault kv put secret/mcp/test key=value
```

## Usage

### Application Startup

Add the following to your application startup code:

```typescript
import { initSecretManagement } from '@/lib/secrets/env-setup';

// Initialize the secret manager during app startup
await initSecretManagement();
```

### Storing Secrets

```typescript
import { SecretManager } from '@/lib/secrets/env-manager';

const secretManager = SecretManager.getInstance();
await secretManager.storeSecuritySetting('my-app/api-key', 'secret-value');
```

### Retrieving Secrets

```typescript
import { SecretManager } from '@/lib/secrets/env-manager';

const secretManager = SecretManager.getInstance();
const secret = await secretManager.getSecuritySetting('my-app/api-key');
```

## Architecture

- `SecretProvider`: Interface defining the contract for secret providers
- `HashiCorpVaultProvider`: Implementation for HashiCorp Vault
- `AzureKeyVaultProvider`: Implementation for Azure Key Vault
- `AkeylessProvider`: Implementation for Akeyless
- `EnvConfigLoader`: Loads configuration from environment variables
- `EnvSecretProviderFactory`: Creates providers based on environment configuration
- `EnvSecretManager`: Singleton service for managing the environment-configured provider
