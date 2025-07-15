# MCP Registry Portal

A professional web portal for managing Model Context Protocol (MCP) applications with enterprise-grade security provider integration.

## Features

- **Application Management**: Create, view, edit, and delete MCP applications
- **Environment Management**: Manage multiple environments (development, staging, production)
- **API Key Management**: Generate and manage API keys with expiration
- **Security Provider Integration**: Support for multiple secret management providers
- **Professional UI**: Clean, responsive interface with dark mode support
- **Admin Dashboard**: Comprehensive administration panel
- **Authentication**: JWT-based authentication with role-based access control

## Security Providers

This application supports multiple enterprise security providers for managing application secrets and authentication tokens. All security provider configurations are stored in environment variables for maximum security.

### Supported Providers

- **HashiCorp Vault** - Industry standard secret management
- **Azure KeyVault** - Microsoft Azure's secret management service
- **Akeyless** - Cloud-native secret management platform
- **Google Cloud Secret Manager** - Google Cloud's secret management service
- **AWS Secrets Manager** - Amazon Web Services secret management

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mcp-registry-portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Configure your security provider** (see Configuration section below)

5. **Set up the database**
   ```bash
   npx prisma migrate dev
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

## Configuration

### Basic Configuration

Configure the following basic settings in your `.env` file:

```env
# Database
DATABASE_URL="file:./dev.db"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-here"

# Application
NODE_ENV="development"
PORT=3000

# Security Provider (choose one)
SECURITY_PROVIDER="hashicorp_vault"
```

### Security Provider Configuration

Choose one of the supported security providers and configure it with the appropriate environment variables:

#### HashiCorp Vault

```env
SECURITY_PROVIDER="hashicorp_vault"
VAULT_URL="https://vault.example.com"
VAULT_TOKEN="hvs.XXXXXXXXXXXX"
VAULT_NAMESPACE="admin"
VAULT_PATH="secret/data/mcp"
VAULT_MOUNT="kv"
```

**Setup Instructions:**

1. **Install Vault** (if running locally):
   ```bash
   # Download and install Vault from https://www.vaultproject.io/downloads
   vault server -dev
   ```

2. **Configure Vault**:
   ```bash
   export VAULT_ADDR='http://127.0.0.1:8200'
   export VAULT_TOKEN="your-vault-token"
   
   # Enable KV secrets engine
   vault secrets enable -version=2 kv
   
   # Create a policy for MCP applications
   vault policy write mcp-policy - <<EOF
   path "secret/data/mcp/*" {
     capabilities = ["create", "read", "update", "delete", "list"]
   }
   EOF
   ```

3. **Store application secrets**:
   ```bash
   # Example: Store secrets for an application
   vault kv put secret/mcp/my-app-key \
     api_key="your-api-key" \
     bearer_token="your-bearer-token" \
     custom_header="your-custom-header"
   ```

#### Azure KeyVault

```env
SECURITY_PROVIDER="azure_keyvault"
AZURE_KEYVAULT_URL="https://myvault.vault.azure.net/"
AZURE_TENANT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
AZURE_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
AZURE_CLIENT_SECRET="your-client-secret"
```

**Setup Instructions:**

1. **Create a KeyVault**:
   ```bash
   az keyvault create --name "mcp-keyvault" --resource-group "mcp-rg" --location "East US"
   ```

2. **Create a service principal**:
   ```bash
   az ad sp create-for-rbac --name "mcp-sp" --role "Key Vault Secrets Officer" --scopes "/subscriptions/{subscription-id}/resourceGroups/mcp-rg/providers/Microsoft.KeyVault/vaults/mcp-keyvault"
   ```

3. **Set access policies**:
   ```bash
   az keyvault set-policy --name "mcp-keyvault" --spn {client-id} --secret-permissions get set list delete
   ```

4. **Store application secrets**:
   ```bash
   # Example: Store secrets for an application (secrets are named: {app-key}-{secret-name})
   az keyvault secret set --vault-name "mcp-keyvault" --name "my-app-key-api-key" --value "your-api-key"
   az keyvault secret set --vault-name "mcp-keyvault" --name "my-app-key-bearer-token" --value "your-bearer-token"
   ```

#### Akeyless

```env
SECURITY_PROVIDER="akeyless"
AKEYLESS_URL="https://api.akeyless.io"
AKEYLESS_ACCESS_ID="p-xxxxxxxx"
AKEYLESS_ACCESS_KEY="your-access-key"
AKEYLESS_PATH="/mcp/secrets"
```

**Setup Instructions:**

1. **Create an Akeyless account** at https://akeyless.io

2. **Create access credentials**:
   - Log in to Akeyless Console
   - Go to Access → Access Roles
   - Create a new role with permissions for `/mcp/secrets/*`
   - Generate access credentials

3. **Store application secrets**:
   ```bash
   # Use Akeyless CLI or Console to store secrets
   akeyless create-secret --name "/mcp/secrets/my-app-key/api_key" --value "your-api-key"
   akeyless create-secret --name "/mcp/secrets/my-app-key/bearer_token" --value "your-bearer-token"
   ```

#### Google Cloud Secret Manager

```env
SECURITY_PROVIDER="gcp_secret_manager"
GCP_PROJECT_ID="your-project-id"
GCP_SERVICE_ACCOUNT_KEY_PATH="/path/to/service-account.json"
GCP_SECRET_PATH_PREFIX="mcp-secrets"
```

**Setup Instructions:**

1. **Enable Secret Manager API**:
   ```bash
   gcloud services enable secretmanager.googleapis.com
   ```

2. **Create a service account**:
   ```bash
   gcloud iam service-accounts create mcp-secrets-sa --display-name="MCP Secrets Service Account"
   ```

3. **Grant permissions**:
   ```bash
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:mcp-secrets-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/secretmanager.admin"
   ```

4. **Download service account key**:
   ```bash
   gcloud iam service-accounts keys create /path/to/service-account.json \
     --iam-account=mcp-secrets-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

5. **Store application secrets**:
   ```bash
   # Example: Store secrets for an application (secrets are named: {prefix}-{app-key}-{secret-name})
   echo "your-api-key" | gcloud secrets create mcp-secrets-my-app-key-api-key --data-file=-
   echo "your-bearer-token" | gcloud secrets create mcp-secrets-my-app-key-bearer-token --data-file=-
   ```

#### AWS Secrets Manager

```env
SECURITY_PROVIDER="aws_secrets_manager"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
AWS_SECRETS_PATH_PREFIX="mcp/secrets"
```

**Setup Instructions:**

1. **Create IAM user with SecretsManager permissions**:
   ```bash
   aws iam create-user --user-name mcp-secrets-user
   aws iam attach-user-policy --user-name mcp-secrets-user --policy-arn arn:aws:iam::aws:policy/SecretsManagerFullAccess
   aws iam create-access-key --user-name mcp-secrets-user
   ```

2. **Store application secrets**:
   ```bash
   # Example: Store secrets for an application (secrets are named: {prefix}/{app-key}/{secret-name})
   aws secretsmanager create-secret --name "mcp/secrets/my-app-key/api_key" --secret-string "your-api-key"
   aws secretsmanager create-secret --name "mcp/secrets/my-app-key/bearer_token" --secret-string "your-bearer-token"
   ```

## Usage

### Application Security Configuration

For each application, you can configure:

1. **Authentication Method**: Choose from API Key, OAuth2, JWT, Bearer Token, or Custom
2. **Rate Limiting**: Configure request limits per time window
3. **Secret Keys**: Specify which secrets to retrieve from your security provider
4. **Custom Headers**: Add any non-sensitive custom headers

### Secret Management

The MCP portal integrates with your configured security provider to:

- **Retrieve secrets** when calling external APIs
- **Store secrets** securely in your chosen provider
- **Rotate secrets** through your provider's management interface
- **Audit secret access** through your provider's logging

### MCP Server Integration

When your MCP server calls external APIs, it will:

1. **Authenticate** with the MCP portal using the application's API key
2. **Request secrets** for the specific application
3. **Receive the secrets** from the configured security provider
4. **Add authentication headers** to the outgoing API calls

## API Endpoints

### Application Management
- `GET /api/applications` - List all applications
- `POST /api/applications` - Create new application
- `GET /api/applications/{id}` - Get application details
- `PUT /api/applications/{id}` - Update application
- `DELETE /api/applications/{id}` - Delete application

### Secret Management
- `GET /api/applications/{id}/secrets` - Get application secrets
- `POST /api/applications/{id}/secrets` - Store application secrets
- `PUT /api/applications/{id}/secrets` - Update application secrets

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

## Security Best Practices

1. **Never store sensitive tokens in the database**
2. **Use environment variables for all security provider configurations**
3. **Rotate secrets regularly through your chosen provider**
4. **Monitor secret access through your provider's audit logs**
5. **Use least-privilege access for service accounts**
6. **Enable encryption in transit and at rest**

## Development

### Database Schema

The application uses Prisma ORM with the following key models:

- **Application**: Core application information
- **ApplicationSecurity**: Security configuration per application
- **Environment**: Application environments (dev, staging, prod)
- **ApiKey**: API keys for authentication
- **User**: User accounts and roles

### Adding New Security Providers

To add a new security provider:

1. **Update the SecurityProviderService** class in `src/lib/security-provider.ts`
2. **Add environment variable configuration** in `.env.example`
3. **Implement the provider methods**: `getSecrets()`, `setSecrets()`, `testConnection()`
4. **Update the README** with setup instructions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation for configuration examples
- Review the security provider setup guides
