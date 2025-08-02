'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/admin-layout'

interface SecureLLMSettings {
  provider: 'openai' | 'ollama'
  model: string
  // Configuration status (read-only)
  configurationStatus?: {
    apiKeySet: boolean
    proxyUrlSet: boolean
    baseUrlSet: boolean
    customHeadersSet: boolean
    sslConfigured: boolean
  }
  // Custom headers for advanced proxy configuration
  customHeaders?: Record<string, string>
  // SSL Certificate Configuration status
  rejectUnauthorized?: boolean
}

// Fixed environment variable names for security
const ENV_VARS = {
  OPENAI: {
    API_KEY: 'OPENAI_API_KEY',
    PROXY_URL: 'OPENAI_PROXY_URL',
    BASE_URL: 'OPENAI_BASE_URL',
    CUSTOM_HEADERS: 'OPENAI_CUSTOM_HEADERS',
    CA_BUNDLE: 'OPENAI_CA_BUNDLE',
    CLIENT_CERT: 'OPENAI_CLIENT_CERT',
    CLIENT_KEY: 'OPENAI_CLIENT_KEY',
    REJECT_UNAUTHORIZED: 'OPENAI_REJECT_UNAUTHORIZED'
  },
  OLLAMA: {
    PROXY_URL: 'OLLAMA_PROXY_URL',
    BASE_URL: 'OLLAMA_BASE_URL', 
    CUSTOM_HEADERS: 'OLLAMA_CUSTOM_HEADERS'
  }
};

export default function AdminSettingsPage() {
  const [llmSettings, setLlmSettings] = useState<SecureLLMSettings>({
    provider: 'ollama',
    model: 'llama3.2',
    customHeaders: {},
    configurationStatus: {
      apiKeySet: false,
      proxyUrlSet: false,
      baseUrlSet: false,
      customHeadersSet: false,
      sslConfigured: false
    },
    rejectUnauthorized: true
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [customHeadersText, setCustomHeadersText] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings/llm')
      if (response.ok) {
        const data = await response.json()
        setLlmSettings(data)
        // Set custom headers text for editing
        if (data.customHeaders) {
          setCustomHeadersText(JSON.stringify(data.customHeaders, null, 2))
        }
      } else {
        setError('Failed to load LLM settings')
      }
    } catch (error) {
      setError('Failed to load LLM settings')
      console.error('Error fetching LLM settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateSettings = (updates: Partial<SecureLLMSettings>) => {
    setLlmSettings(prev => ({ ...prev, ...updates }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      // Parse custom headers
      let customHeaders = {}
      if (customHeadersText.trim()) {
        try {
          customHeaders = JSON.parse(customHeadersText)
        } catch (error) {
          setError('Invalid JSON format for custom headers')
          setIsSaving(false)
          return
        }
      }

      const dataToSave = {
        ...llmSettings,
        customHeaders
      }

      const response = await fetch('/api/admin/settings/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      })

      if (response.ok) {
        setSuccess('LLM settings saved successfully!')
        setConnectionStatus(null)
        fetchSettings() // Refresh to get updated status
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to save settings')
      }
    } catch (error) {
      setError('Failed to save settings')
      console.error('Error saving LLM settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    setConnectionStatus(null)

    try {
      const response = await fetch('/api/admin/test/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider: llmSettings.provider }),
      })

      if (response.ok) {
        const result = await response.json()
        setConnectionStatus(result)
      } else {
        setConnectionStatus({
          success: false,
          message: 'Test connection failed'
        })
      }
    } catch (error) {
      setConnectionStatus({
        success: false,
        message: 'Failed to test connection'
      })
    } finally {
      setTestingConnection(false)
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600 dark:text-gray-400">Loading settings...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">LLM Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Configure your Large Language Model provider with secure fixed environment variables.
            </p>
          </div>

        {/* Security Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Secure Configuration
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>
                  Environment variable names are now <strong>fixed for security</strong>. 
                  Configure your actual values in environment variables, not in this UI.
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
            <div className="text-sm text-green-700 dark:text-green-300">{success}</div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
          <div className="space-y-6">
            {/* Provider Selection */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">LLM Provider</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    llmSettings.provider === 'ollama'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                  onClick={() => updateSettings({ 
                    provider: 'ollama',
                    model: 'llama3.2'
                  })}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">Ollama</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Local AI models</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      llmSettings.provider === 'ollama'
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}></div>
                  </div>
                </div>

                <div
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    llmSettings.provider === 'openai'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                  onClick={() => updateSettings({ 
                    provider: 'openai',
                    model: 'gpt-4o-mini'
                  })}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">OpenAI</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Cloud AI models</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      llmSettings.provider === 'openai'
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Model Selection */}
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Model
              </label>
              <select
                id="model"
                value={llmSettings.model}
                onChange={(e) => updateSettings({ model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              >
                {llmSettings.provider === 'openai' ? (
                  <>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </>
                ) : (
                  <>
                    <option value="llama3.2">Llama 3.2</option>
                    <option value="llama3.1">Llama 3.1</option>
                    <option value="llama3">Llama 3</option>
                    <option value="codellama">Code Llama</option>
                    <option value="mistral">Mistral</option>
                    <option value="gemma">Gemma</option>
                  </>
                )}
              </select>
            </div>

            {/* Environment Variable Configuration Display */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Required Environment Variables
              </h3>
              
              {llmSettings.provider === 'openai' && (
                <div className="space-y-4">
                  <EnvironmentVariableDisplay
                    name={ENV_VARS.OPENAI.API_KEY}
                    description="Your OpenAI API key"
                    required={true}
                    isSet={llmSettings.configurationStatus?.apiKeySet}
                  />
                  <EnvironmentVariableDisplay
                    name={ENV_VARS.OPENAI.PROXY_URL}
                    description="Proxy URL for OpenAI API calls (takes priority over base URL)"
                    required={false}
                    isSet={llmSettings.configurationStatus?.proxyUrlSet}
                  />
                  <EnvironmentVariableDisplay
                    name={ENV_VARS.OPENAI.BASE_URL}
                    description="Custom base URL for OpenAI API (fallback if no proxy URL)"
                    required={false}
                    isSet={llmSettings.configurationStatus?.baseUrlSet}
                  />
                  <EnvironmentVariableDisplay
                    name={ENV_VARS.OPENAI.CUSTOM_HEADERS}
                    description="Custom headers in JSON format for proxy authentication"
                    required={false}
                    isSet={llmSettings.configurationStatus?.customHeadersSet}
                  />
                </div>
              )}

              {llmSettings.provider === 'ollama' && (
                <div className="space-y-4">
                  <EnvironmentVariableDisplay
                    name={ENV_VARS.OLLAMA.PROXY_URL}
                    description="Proxy URL for Ollama API calls (takes priority over base URL)"
                    required={false}
                    isSet={llmSettings.configurationStatus?.proxyUrlSet}
                  />
                  <EnvironmentVariableDisplay
                    name={ENV_VARS.OLLAMA.BASE_URL}
                    description="Custom base URL for Ollama (default: http://localhost:11434/v1)"
                    required={false}
                    isSet={llmSettings.configurationStatus?.baseUrlSet}
                  />
                  <EnvironmentVariableDisplay
                    name={ENV_VARS.OLLAMA.CUSTOM_HEADERS}
                    description="Custom headers in JSON format for proxy authentication"
                    required={false}
                    isSet={llmSettings.configurationStatus?.customHeadersSet}
                  />
                </div>
              )}
            </div>

            {/* Custom Headers Editor */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Custom Headers (Optional)
              </h3>
              <div>
                <label htmlFor="customHeaders" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Custom Headers JSON
                </label>
                <textarea
                  id="customHeaders"
                  value={customHeadersText}
                  onChange={(e) => setCustomHeadersText(e.target.value)}
                  placeholder='{\n  "X-Proxy-Authorization": "Bearer your-token",\n  "X-Custom-Route": "openai",\n  "X-API-Version": "2024-01-01"\n}'
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter custom headers in JSON format for advanced proxy configurations.
                </p>
              </div>
            </div>

            {/* SSL Configuration */}
            {llmSettings.provider === 'openai' && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  SSL Certificate Configuration
                </h3>
                <div className="space-y-4">
                  <EnvironmentVariableDisplay
                    name={ENV_VARS.OPENAI.CA_BUNDLE}
                    description="Path to CA bundle file for certificate verification"
                    required={false}
                    isSet={llmSettings.configurationStatus?.sslConfigured}
                  />
                  <EnvironmentVariableDisplay
                    name={ENV_VARS.OPENAI.CLIENT_CERT}
                    description="Path to client certificate file for mutual TLS"
                    required={false}
                    isSet={false}
                  />
                  <EnvironmentVariableDisplay
                    name={ENV_VARS.OPENAI.CLIENT_KEY}
                    description="Path to client private key file for mutual TLS"
                    required={false}
                    isSet={false}
                  />
                  <EnvironmentVariableDisplay
                    name={ENV_VARS.OPENAI.REJECT_UNAUTHORIZED}
                    description="Whether to reject unauthorized certificates (default: true)"
                    required={false}
                    isSet={false}
                  />
                </div>
              </div>
            )}

            {/* Test Connection */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Test Connection</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Verify that the LLM provider is accessible with current configuration
                  </p>
                </div>
                <button
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {testingConnection ? 'Testing...' : 'Test Connection'}
                </button>
              </div>

              {connectionStatus && (
                <div className={`mt-4 p-3 rounded-md ${
                  connectionStatus.success 
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}>
                  <div className={`text-sm ${
                    connectionStatus.success 
                      ? 'text-green-700 dark:text-green-300' 
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    {connectionStatus.message}
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>

        {/* Configuration Examples */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Environment Variable Examples
          </h3>
          
          {llmSettings.provider === 'openai' ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">OpenAI with Proxy</h4>
                <pre className="bg-white dark:bg-gray-800 p-3 rounded border text-sm overflow-x-auto">
{`export OPENAI_API_KEY="sk-your-openai-api-key"
export OPENAI_PROXY_URL="https://your-proxy.com/openai"
export OPENAI_CUSTOM_HEADERS='{"X-Proxy-Auth":"Bearer token","X-Route":"openai"}'`}
                </pre>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">OpenAI with SSL Certificates</h4>
                <pre className="bg-white dark:bg-gray-800 p-3 rounded border text-sm overflow-x-auto">
{`export OPENAI_API_KEY="sk-your-openai-api-key"
export OPENAI_BASE_URL="https://secure-api.company.com/v1"
export OPENAI_CA_BUNDLE="/path/to/ca-bundle.pem"
export OPENAI_CLIENT_CERT="/path/to/client.crt"
export OPENAI_CLIENT_KEY="/path/to/client.key"
export OPENAI_REJECT_UNAUTHORIZED="true"`}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Ollama with Proxy</h4>
                <pre className="bg-white dark:bg-gray-800 p-3 rounded border text-sm overflow-x-auto">
{`export OLLAMA_PROXY_URL="https://your-proxy.com/ollama"
export OLLAMA_CUSTOM_HEADERS='{"X-Proxy-Auth":"Bearer token","X-Route":"ollama"}'`}
                </pre>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Ollama with Custom Base URL</h4>
                <pre className="bg-white dark:bg-gray-800 p-3 rounded border text-sm overflow-x-auto">
{`export OLLAMA_BASE_URL="http://remote-ollama:11434/v1"
export OLLAMA_CUSTOM_HEADERS='{"Authorization":"Bearer ollama-token"}'`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </AdminLayout>
  )
}

// Component to display environment variable status
function EnvironmentVariableDisplay({ 
  name, 
  description, 
  required, 
  isSet 
}: { 
  name: string; 
  description: string; 
  required: boolean; 
  isSet?: boolean;
}) {
  return (
    <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
      <div className="flex-shrink-0 mt-1">
        <div className={`w-3 h-3 rounded-full ${
          isSet ? 'bg-green-500' : (required ? 'bg-red-500' : 'bg-gray-400')
        }`}></div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <code className="text-sm font-mono text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 px-2 py-1 rounded">
            {name}
          </code>
          {required && (
            <span className="text-xs text-red-600 dark:text-red-400 font-medium">Required</span>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Status: {isSet ? '✅ Set' : (required ? '❌ Not set' : '⚪ Optional')}
        </p>
      </div>
    </div>
  )
}
