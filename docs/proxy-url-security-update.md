# OpenAI Proxy URL Configuration - Security Enhancement

## Summary of Changes

This update enhances the security and reliability of OpenAI API proxy configuration by:

1. **Prioritizing proxy URLs over base URLs** for better routing control
2. **Removing fallback URL input fields from UI** for enhanced security
3. **Using environment variables exclusively** for URL configuration

## Changes Made

### 1. LLM Service (src/lib/llm.ts)

**URL Priority Logic Updated:**
- **Before:** `baseUrlEnvVar -> baseUrl -> proxyUrlEnvVar -> proxyUrl`
- **After:** `proxyUrlEnvVar -> baseUrlEnvVar -> OpenAI default`

**Removed Fields:**
- `baseUrl` (direct URL fallback)
- `proxyUrl` (direct URL fallback)

**Enhanced Security:**
- All URLs must now be configured via environment variables
- No more direct URL storage in database for security

### 2. API Routes (src/app/api/admin/settings/llm/route.ts)

**Interface Updates:**
- Removed `baseUrl` and `proxyUrl` from `LLMSettings` interface
- Kept only `baseUrlEnvVar` and `proxyUrlEnvVar` for security

**Database Changes:**
- No longer stores direct URLs in database
- Only stores environment variable names

### 3. Frontend (src/app/admin/settings/page.tsx)

**UI Security Enhancements:**
- Removed "Base URL" direct input field for OpenAI
- Removed "Proxy URL (Optional - Fallback)" direct input field
- Added "Base URL Environment Variable" field for OpenAI
- Updated "Proxy URL Environment Variable" as recommended approach

**Improved User Experience:**
- Clear labeling of recommended vs optional fields
- Better security messaging
- Consistent environment variable approach

## URL Priority Rules

### OpenAI Configuration
1. **Proxy URL Environment Variable** (highest priority)
   - If `proxyUrlEnvVar` is set and env var exists, use proxy URL
2. **Base URL Environment Variable** (fallback)
   - If `baseUrlEnvVar` is set and env var exists, use base URL  
3. **OpenAI Default** (default)
   - If neither is configured, OpenAI client uses default endpoint

### Ollama Configuration
1. **Base URL Environment Variable** (optional)
   - If `baseUrlEnvVar` is set and env var exists, use custom URL
2. **Localhost Default** (default)
   - Defaults to `http://localhost:11434/v1`

## Environment Variable Examples

### For OpenAI with Proxy
```bash
# Set these environment variables
export OPENAI_API_KEY="your-api-key"
export OPENAI_PROXY_URL="https://your-proxy.com/openai"

# Configure in UI:
# - API Key Environment Variable: OPENAI_API_KEY
# - Proxy URL Environment Variable: OPENAI_PROXY_URL
```

### For OpenAI with Custom Base URL
```bash
# Set these environment variables  
export OPENAI_API_KEY="your-api-key"
export OPENAI_BASE_URL="https://api.openai.com/v1"

# Configure in UI:
# - API Key Environment Variable: OPENAI_API_KEY
# - Base URL Environment Variable: OPENAI_BASE_URL
```

### For Ollama with Custom URL
```bash
# Set environment variable
export OLLAMA_BASE_URL="http://remote-ollama:11434/v1"

# Configure in UI:
# - Base URL Environment Variable: OLLAMA_BASE_URL
```

## Security Benefits

1. **No URL Storage in Database:** Direct URLs are no longer stored in the database
2. **Environment Variable Only:** All URLs must be configured via environment variables
3. **Proxy Priority:** Proxy URLs take priority for better traffic routing
4. **Reduced Attack Surface:** UI no longer accepts direct URL inputs

## Testing

Use the provided test script to verify configuration:

```bash
node test-proxy-url-priority.js
```

This script validates:
- Proxy URL environment variable priority
- Base URL fallback behavior  
- Default endpoint usage
- Ollama custom URL configuration

## Migration Notes

**Existing Configurations:**
- Direct URLs stored in database will be ignored
- Users must migrate to environment variable configuration
- UI will guide users to use environment variables

**Breaking Changes:**
- `baseUrl` and `proxyUrl` fields removed from API
- Direct URL input fields removed from UI
- Database schema changes (fields still exist but unused for security)
