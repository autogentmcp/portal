# Secret Vault Integration

This module provides integration with various secret providers using environment variables:
- HashiCorp Vault
- Azure Key Vault
- Akeyless
- AWS Secrets Manager
- GCP Secret Manager

## Installation

No additional dependencies needed! This implementation uses environment variables instead of database tables.

## Setting Up Secret Providers

### Configure Your Environment Variables

Add the required environment variables to your `.env` file:

```env
# Provider Selection
# Choose one of: hashicorp_vault, azure_keyvault, akeyless, aws_secrets_manager, gcp_secret_manager
SECURITY_PROVIDER="hashicorp_vault"

# For HashiCorp Vault
VAULT_URL="https://vault.example.com"
VAULT_TOKEN="hvs.XXXXXXXXXXXX"
VAULT_NAMESPACE="admin"  # Optional
VAULT_PATH="secret/data/mcp"
VAULT_MOUNT="kv"

# For Azure KeyVault
# AZURE_KEYVAULT_URL="https://myvault.vault.azure.net/"
# AZURE_TENANT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
# AZURE_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
# AZURE_CLIENT_SECRET="your-client-secret"

# For Akeyless
# AKEYLESS_URL="https://api.akeyless.io"
# AKEYLESS_ACCESS_ID="p-xxxxxxxx"
# AKEYLESS_ACCESS_KEY="your-access-key"
# AKEYLESS_PATH="/mcp/secrets"

# For AWS Secrets Manager
# AWS_REGION="us-west-2"
# AWS_ACCESS_KEY_ID="AKIAXXXXXXXX"
# AWS_SECRET_ACCESS_KEY="your-secret-key"
# AWS_SESSION_TOKEN="optional-session-token"

# For GCP Secret Manager
# GCP_PROJECT_ID="your-gcp-project"
# GCP_CLIENT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
# GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXXXXXXX\n-----END PRIVATE KEY-----\n"
# GCP_PARENT="projects/your-project-id"
```

### HashiCorp Vault Setup

Here's how to set up a local HashiCorp Vault for development:

```bash
# Start Vault server in dev mode
docker run --rm -p 8200:8200 --name vault hashicorp/vault:latest server -dev -dev-root-token-id="root"

# Set environment variables
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=root

# Enable the KV v2 secrets engine if needed
vault secrets enable -version=2 kv
vault secrets enable -path=secret -version=2 kv

# Create an example secret
vault kv put secret/mcp/test key=value
```

## Usage

### Initializing the Secret Management System

The system is automatically initialized during application startup using environment variables:

```typescript
// In your application startup code
import { initSecretManagement } from '@/lib/secrets';

// Initialize the system
await initSecretManagement();
```

### Storing Secrets

```typescript
import { SecretManager } from '@/lib/secrets';

const secretManager = SecretManager.getInstance();
const result = await secretManager.storeSecuritySetting('my-app/api-key', 'secret-value');
```

### Retrieving Secrets

```typescript
import { SecretManager } from '@/lib/secrets';

const secretManager = SecretManager.getInstance();
const secret = await secretManager.getSecuritySetting('my-app/api-key');
```

## Architecture

- `SecretProvider`: Interface defining the contract for secret providers
- `HashiCorpVaultProvider`: Implementation for HashiCorp Vault
- `AzureKeyVaultProvider`: Implementation for Azure Key Vault
- `AkeylessProvider`: Implementation for Akeyless
- `AWSSecretsManagerProvider`: Implementation for AWS Secrets Manager
- `GCPSecretManagerProvider`: Implementation for GCP Secret Manager
- `EnvConfigLoader`: Loads configuration from environment variables
- `EnvSecretProviderFactory`: Creates providers based on environment configuration
- `EnvSecretManager`: Singleton service for managing the environment-configured provider

Note: The database-based implementation (`SecretManager` and related files) has been removed as all configuration now comes from environment variables.

## Error Handling

The integration includes robust error handling and logging. Check the application logs for details if you encounter issues.

## Security Considerations

- Always store vault credentials securely
- Use least-privilege policies for vault access
- Rotate vault tokens and secrets regularly
- Enable audit logging in your vault servers
