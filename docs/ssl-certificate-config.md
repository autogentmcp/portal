# SSL Certificate Configuration for OpenAI LLM

This guide explains how to configure SSL certificates for secure communication with OpenAI or custom LLM endpoints that require client certificates or custom CA bundles.

## 🔐 Certificate Configuration Options

### 1. CA Bundle Configuration
For custom certificate authorities or self-signed certificates:

```bash
# Set the environment variable name that contains your CA bundle file path
LLM_CA_BUNDLE_ENV_VAR=OPENAI_CA_BUNDLE_PATH

# Set the actual CA bundle file path
OPENAI_CA_BUNDLE_PATH=/path/to/ca-bundle.crt
```

### 2. Client Certificate Configuration (Mutual TLS)
For environments requiring client certificate authentication:

```bash
# Set environment variable names for certificate files
LLM_CERT_FILE_ENV_VAR=OPENAI_CLIENT_CERT_PATH
LLM_KEY_FILE_ENV_VAR=OPENAI_CLIENT_KEY_PATH

# Set the actual file paths
OPENAI_CLIENT_CERT_PATH=/path/to/client.crt
OPENAI_CLIENT_KEY_PATH=/path/to/client.key
```

### 3. Certificate Validation Control
To disable certificate validation (useful for testing with self-signed certificates):

```bash
# Set to 'false' to disable certificate validation (NOT recommended for production)
LLM_REJECT_UNAUTHORIZED=false
```

## 🎛️ Admin UI Configuration

You can configure these settings through the Admin UI:

1. Navigate to **Admin → Settings**
2. Select **OpenAI** provider
3. Scroll down to **SSL Certificate Configuration** section
4. Configure the following fields:
   - **CA Bundle Environment Variable**: Name of env var containing CA bundle file path
   - **Client Certificate File Environment Variable**: Name of env var containing cert file path
   - **Client Key File Environment Variable**: Name of env var containing key file path
   - **Proxy URL Environment Variable**: Name of env var containing proxy URL (optional)
   - **Reject Unauthorized Certificates**: Toggle certificate validation

## 📝 Example Configurations

### Example 1: Corporate Environment with Custom CA
```bash
# Environment variables configuration
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o
LLM_API_KEY_ENV_VAR=OPENAI_API_KEY
LLM_CA_BUNDLE_ENV_VAR=CORPORATE_CA_BUNDLE_PATH

# File paths and API key
OPENAI_API_KEY=sk-your-api-key-here
CORPORATE_CA_BUNDLE_PATH=/etc/ssl/certs/corporate-ca-bundle.crt
```

### Example 2: Client Certificate Authentication
```bash
# Environment variables configuration
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o
LLM_API_KEY_ENV_VAR=OPENAI_API_KEY
LLM_CERT_FILE_ENV_VAR=CLIENT_CERT_PATH
LLM_KEY_FILE_ENV_VAR=CLIENT_KEY_PATH
LLM_PROXY_URL_ENV_VAR=OPENAI_PROXY_URL

# File paths, proxy URL, and API key
OPENAI_API_KEY=sk-your-api-key-here
CLIENT_CERT_PATH=/etc/ssl/certs/client.crt
CLIENT_KEY_PATH=/etc/ssl/private/client.key
OPENAI_PROXY_URL=https://corporate-proxy.example.com/openai
```

### Example 3: Testing with Self-Signed Certificates
```bash
# Environment variables configuration (NOT for production)
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o
LLM_API_KEY_ENV_VAR=OPENAI_API_KEY
LLM_REJECT_UNAUTHORIZED=false

# API key
OPENAI_API_KEY=sk-your-api-key-here
```

## 🔍 Testing Configuration

Use the test script to verify your certificate configuration:

```bash
node test-cert-config.js
```

This will validate:
- ✅ Environment variables are set correctly
- ✅ Certificate files can be read
- ✅ CA bundle content is accessible
- ✅ Reject unauthorized setting is configured

## 🛡️ Security Best Practices

1. **Never commit certificates to version control**
2. **Use environment variables for file paths only** (never embed certificate content in environment variables)
3. **Keep certificate files in secure locations** with appropriate permissions (e.g., `chmod 600`)
4. **Regularly rotate certificates** according to your security policy
5. **Always enable certificate validation in production** (`LLM_REJECT_UNAUTHORIZED=true`)
6. **Use separate environments** for testing with self-signed certificates

## 🚨 Troubleshooting

### Common Issues:

#### Certificate File Not Found
```
❌ Failed to read client certificate from /path/to/cert.crt: ENOENT: no such file or directory
```
**Solution**: Verify the file path and ensure the application has read permissions.

#### Permission Denied
```
❌ Failed to read client certificate from /path/to/cert.crt: EACCES: permission denied
```
**Solution**: Check file permissions: `chmod 600 /path/to/cert.crt`

#### Invalid Certificate Format
```
Error: error:0906D06C:PEM routines:PEM_read_bio:no start line
```
**Solution**: Ensure certificate files are in PEM format and properly formatted.

#### SSL Handshake Failure
```
Error: unable to verify the first certificate
```
**Solution**: 
- Check if CA bundle is correctly configured
- Verify certificate chain is complete
- Consider setting `LLM_REJECT_UNAUTHORIZED=false` for testing (not production)

## 📚 Related Documentation

- [Environment Variable Security Guide](./docs/api-key-security.md)
- [LLM Configuration Guide](./README.md)
- [Database Configuration](./SETUP_GUIDE.md)
