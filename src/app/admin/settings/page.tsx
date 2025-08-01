'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/admin-layout'

interface LLMSettings {
  provider: 'openai' | 'ollama'
  model: string
  apiKey?: string
  apiKeyEnvVar?: string
  baseUrl?: string
  baseUrlEnvVar?: string
  proxyUrl?: string
  proxyUrlEnvVar?: string
  customHeaders?: Record<string, string>
  headerMappings?: Array<{ headerName: string; envVariable: string }>
  // SSL Certificate Configuration
  caBundleEnvVar?: string   // Environment variable name containing CA bundle file path
  certFileEnvVar?: string
  keyFileEnvVar?: string
  rejectUnauthorized?: boolean
}

export default function AdminSettingsPage() {
  const [llmSettings, setLlmSettings] = useState<LLMSettings>({
    provider: 'ollama',
    model: 'llama3.2',
    baseUrl: 'http://localhost:11434/v1',
    customHeaders: {},
    headerMappings: [],
    apiKeyEnvVar: 'LLM_API_KEY',
    // SSL Certificate Configuration defaults
    caBundleEnvVar: '',
    certFileEnvVar: '',
    keyFileEnvVar: '',
    rejectUnauthorized: true
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings/llm')
      if (response.ok) {
        const data = await response.json()
        setLlmSettings(data)
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/settings/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(llmSettings)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }

      const result = await response.json()
      setSuccess(result.message || 'Settings saved successfully!')
      
      if (result.warning) {
        console.warn(result.warning)
      }
      
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    setConnectionStatus(null)

    try {
      const response = await fetch('/api/admin/settings/llm/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(llmSettings)
      })

      const result = await response.json()
      setConnectionStatus(result)
    } catch (err) {
      setConnectionStatus({
        success: false,
        message: 'Failed to test connection'
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const updateSettings = (updates: Partial<LLMSettings>) => {
    setLlmSettings(prev => ({ ...prev, ...updates }))
  }

  if (isLoading) {
    return (
      <AdminLayout title="Settings">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Settings">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-md mb-6">
            {success}
          </div>
        )}

        {/* Environment Variables Warning */}
        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Environment Variables Recommended
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>For production use, it's recommended to set these values as environment variables:</p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">LLM_PROVIDER</code> - Set to "openai" or "ollama"</li>
                  <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">LLM_MODEL</code> - Model name (e.g., "gpt-4o", "llama3.2")</li>
                  <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">LLM_API_KEY_ENV_VAR</code> - Name of environment variable containing your API key (e.g., "OPENAI_API_KEY")</li>
                  <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">LLM_BASE_URL</code> - Custom base URL or Ollama server URL</li>
                  <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">LLM_PROXY_URL</code> - Proxy URL for OpenAI calls (optional)</li>
                  <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">LLM_CUSTOM_HEADERS</code> - JSON string of custom headers (optional)</li>
                  <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">LLM_HEADER_MAPPINGS</code> - JSON array of header to environment variable mappings (optional)</li>
                </ul>
                <p className="mt-2"><strong>Security Note:</strong> API keys are referenced by environment variable names for enhanced security. Set your actual API key as an environment variable (e.g., <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">OPENAI_API_KEY=your_key_here</code>) and specify its name in the configuration.</p>
                <p className="mt-1">Settings changed here will be temporary and reset when the server restarts.</p>
              </div>
            </div>
          </div>
        </div>

        {/* LLM Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              LLM Configuration
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Configure your language model provider and settings
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                LLM Provider
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    llmSettings.provider === 'ollama'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                  onClick={() => updateSettings({ 
                    provider: 'ollama',
                    baseUrl: 'http://localhost:11434/v1',
                    model: 'llama3.2',
                    proxyUrl: '',
                    customHeaders: {}
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
                    baseUrl: '',
                    model: 'gpt-4o-mini',
                    proxyUrl: '',
                    customHeaders: {}
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
              {llmSettings.provider === 'ollama' ? (
                <select
                  id="model"
                  value={llmSettings.model}
                  onChange={(e) => updateSettings({ model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="llama3.2">Llama 3.2</option>
                  <option value="llama3.2:1b">Llama 3.2 1B</option>
                  <option value="llama3.2:3b">Llama 3.2 3B</option>
                  <option value="llama3.1">Llama 3.1</option>
                  <option value="llama3.1:8b">Llama 3.1 8B</option>
                  <option value="llama3.1:70b">Llama 3.1 70B</option>
                  <option value="qwen2.5">Qwen 2.5</option>
                  <option value="qwen2.5:7b">Qwen 2.5 7B</option>
                  <option value="qwen2.5:14b">Qwen 2.5 14B</option>
                  <option value="mistral">Mistral</option>
                  <option value="codellama">CodeLlama</option>
                  <option value="gemma2">Gemma 2</option>
                </select>
              ) : (
                <select
                  id="model"
                  value={llmSettings.model}
                  onChange={(e) => updateSettings({ model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
              )}
            </div>

            {/* OpenAI API Key Environment Variable */}
            {llmSettings.provider === 'openai' && (
              <>
                <div>
                  <label htmlFor="apiKeyEnvVar" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API Key Environment Variable
                  </label>
                  <input
                    type="text"
                    id="apiKeyEnvVar"
                    value={llmSettings.apiKeyEnvVar || ''}
                    onChange={(e) => updateSettings({ apiKeyEnvVar: e.target.value })}
                    placeholder="LLM_API_KEY"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    The environment variable name that contains your OpenAI API key. Make sure to set this environment variable with your actual API key value.
                  </p>
                </div>

                <div>
                  <label htmlFor="baseUrlOpenAI" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Base URL (Optional)
                  </label>
                  <input
                    type="url"
                    id="baseUrlOpenAI"
                    value={llmSettings.baseUrl || ''}
                    onChange={(e) => updateSettings({ baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1 (default)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Override the default OpenAI API endpoint. Leave empty for default.
                  </p>
                </div>

                <div>
                  <label htmlFor="proxyUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Proxy URL Environment Variable (Optional)
                  </label>
                  <input
                    type="text"
                    id="proxyUrlEnvVar"
                    value={llmSettings.proxyUrlEnvVar || ''}
                    onChange={(e) => updateSettings({ proxyUrlEnvVar: e.target.value })}
                    placeholder="OPENAI_PROXY_URL"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Environment variable containing the proxy URL for OpenAI API calls.
                  </p>
                </div>

                <div>
                  <label htmlFor="proxyUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Proxy URL (Optional - Fallback)
                  </label>
                  <input
                    type="url"
                    id="proxyUrl"
                    value={llmSettings.proxyUrl || ''}
                    onChange={(e) => updateSettings({ proxyUrl: e.target.value })}
                    placeholder="https://your-proxy.com/openai"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Direct proxy URL (used only if environment variable above is not set).
                  </p>
                </div>

                <div>
                  <label htmlFor="customHeaders" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom Headers (Optional)
                  </label>
                  <textarea
                    id="customHeaders"
                    value={JSON.stringify(llmSettings.customHeaders || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        updateSettings({ customHeaders: parsed });
                      } catch (error) {
                        // Invalid JSON, don't update
                      }
                    }}
                    placeholder='{\n  "Authorization": "Bearer your-token",\n  "X-Custom-Header": "value"\n}'
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Additional headers to send with API requests (JSON format).
                  </p>
                </div>

                {/* Header Mappings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Environment Variable Header Mappings (Optional)
                  </label>
                  <div className="space-y-3">
                    {(llmSettings.headerMappings || []).map((mapping, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Header Name (e.g., Authorization)"
                          value={mapping.headerName}
                          onChange={(e) => {
                            const newMappings = [...(llmSettings.headerMappings || [])];
                            newMappings[index] = { ...mapping, headerName: e.target.value };
                            updateSettings({ headerMappings: newMappings });
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Environment Variable (e.g., AZURE_API_KEY)"
                          value={mapping.envVariable}
                          onChange={(e) => {
                            const newMappings = [...(llmSettings.headerMappings || [])];
                            newMappings[index] = { ...mapping, envVariable: e.target.value };
                            updateSettings({ headerMappings: newMappings });
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm"
                        />
                        <button
                          onClick={() => {
                            const newMappings = (llmSettings.headerMappings || []).filter((_, i) => i !== index);
                            updateSettings({ headerMappings: newMappings });
                          }}
                          className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newMappings = [...(llmSettings.headerMappings || []), { headerName: '', envVariable: '' }];
                        updateSettings({ headerMappings: newMappings });
                      }}
                      className="w-full px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400"
                    >
                      + Add Header Mapping
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Map environment variables to HTTP headers. Values will be read from environment variables at runtime.
                  </p>
                </div>

                {/* SSL Certificate Configuration */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">SSL Certificate Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="caBundleEnvVar" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        CA Bundle File Environment Variable (Optional)
                      </label>
                      <input
                        type="text"
                        id="caBundleEnvVar"
                        value={llmSettings.caBundleEnvVar || ''}
                        onChange={(e) => updateSettings({ caBundleEnvVar: e.target.value })}
                        placeholder="OPENAI_CA_BUNDLE_PATH"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Environment variable containing the file path to the CA bundle for custom certificate authorities.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="certFileEnvVar" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Client Certificate File Environment Variable (Optional)
                      </label>
                      <input
                        type="text"
                        id="certFileEnvVar"
                        value={llmSettings.certFileEnvVar || ''}
                        onChange={(e) => updateSettings({ certFileEnvVar: e.target.value })}
                        placeholder="OPENAI_CLIENT_CERT_PATH"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Environment variable containing the file path to the client certificate for mutual TLS.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="keyFileEnvVar" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Client Key File Environment Variable (Optional)
                      </label>
                      <input
                        type="text"
                        id="keyFileEnvVar"
                        value={llmSettings.keyFileEnvVar || ''}
                        onChange={(e) => updateSettings({ keyFileEnvVar: e.target.value })}
                        placeholder="OPENAI_CLIENT_KEY_PATH"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Environment variable containing the file path to the client private key for mutual TLS.
                      </p>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="rejectUnauthorized"
                        checked={llmSettings.rejectUnauthorized !== false}
                        onChange={(e) => updateSettings({ rejectUnauthorized: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <label htmlFor="rejectUnauthorized" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Reject Unauthorized Certificates
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                      When enabled, SSL certificates will be verified against trusted certificate authorities. Disable only for testing with self-signed certificates.
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Ollama Base URL */}
            {llmSettings.provider === 'ollama' && (
              <div>
                <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Base URL
                </label>
                <input
                  type="url"
                  id="baseUrl"
                  value={llmSettings.baseUrl || ''}
                  onChange={(e) => updateSettings({ baseUrl: e.target.value })}
                  placeholder="http://localhost:11434/v1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  The URL where your Ollama server is running.
                </p>
              </div>
            )}

            {/* Test Connection */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Test Connection</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Verify that the LLM provider is accessible with current settings
                  </p>
                </div>
                <button
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testingConnection ? 'Testing...' : 'Test Connection'}
                </button>
              </div>

              {connectionStatus && (
                <div className={`mt-3 p-3 rounded-md ${
                  connectionStatus.success
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                }`}>
                  <div className="flex items-center">
                    {connectionStatus.success ? (
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="text-sm">{connectionStatus.message}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>

        {/* Configuration Examples */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mt-6">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Configuration Examples
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Common configurations for different use cases
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Standard OpenAI */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Standard OpenAI</h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 text-sm font-mono">
                <div>LLM_PROVIDER=openai</div>
                <div>LLM_MODEL=gpt-4o-mini</div>
                <div>LLM_API_KEY=sk-your-api-key-here</div>
              </div>
            </div>

            {/* OpenAI through Corporate Proxy */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">OpenAI through Corporate Proxy</h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 text-sm font-mono">
                <div>LLM_PROVIDER=openai</div>
                <div>LLM_MODEL=gpt-4o-mini</div>
                <div>LLM_API_KEY=sk-your-api-key-here</div>
                <div>LLM_PROXY_URL=https://corporate-proxy.company.com/openai</div>
              </div>
            </div>

            {/* Azure OpenAI */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Azure OpenAI</h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 text-sm font-mono">
                <div>LLM_PROVIDER=openai</div>
                <div>LLM_MODEL=gpt-4o-mini</div>
                <div>LLM_BASE_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment/</div>
                <div>LLM_CUSTOM_HEADERS={`{"api-version": "2024-02-15-preview", "Authorization": "Bearer your-token"}`}</div>
              </div>
            </div>

            {/* OpenAI with Custom Headers */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">OpenAI with Custom Headers</h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 text-sm font-mono">
                <div>LLM_PROVIDER=openai</div>
                <div>LLM_MODEL=gpt-4o-mini</div>
                <div>LLM_API_KEY=sk-your-api-key-here</div>
                <div>LLM_CUSTOM_HEADERS={`{"X-Organization-ID": "org-123", "X-Custom-Auth": "token"}`}</div>
              </div>
            </div>

            {/* OpenAI with Environment Variable Header Mappings */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">OpenAI with Environment Variable Header Mappings</h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 text-sm font-mono">
                <div>LLM_PROVIDER=openai</div>
                <div>LLM_MODEL=gpt-4o-mini</div>
                <div>LLM_API_KEY=sk-your-api-key-here</div>
                <div>LLM_HEADER_MAPPINGS={`[{"headerName": "Authorization", "envVariable": "AZURE_API_KEY"}, {"headerName": "X-Client-ID", "envVariable": "CLIENT_ID"}]`}</div>
                <div className="text-gray-500 dark:text-gray-400"># Also set your environment variables:</div>
                <div>AZURE_API_KEY=your-azure-token</div>
                <div>CLIENT_ID=your-client-id</div>
              </div>
            </div>

            {/* Local Ollama */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Local Ollama</h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 text-sm font-mono">
                <div>LLM_PROVIDER=ollama</div>
                <div>LLM_MODEL=llama3.2</div>
                <div>LLM_BASE_URL=http://localhost:11434/v1</div>
              </div>
            </div>

            {/* Remote Ollama */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Remote Ollama Server</h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 text-sm font-mono">
                <div>LLM_PROVIDER=ollama</div>
                <div>LLM_MODEL=llama3.2</div>
                <div>LLM_BASE_URL=http://your-ollama-server:11434/v1</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
