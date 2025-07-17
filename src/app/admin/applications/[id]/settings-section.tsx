import React, { useState, useEffect } from 'react'

interface SettingsSectionProps {
  activeEnvironment: string | null
  application: any
  environmentSettings: any
  setEnvironmentSettings: (settings: any) => void
  setActiveEnvironment: (id: string) => void
  loadEnvironmentSettings: (id: string) => void
  handleSaveSettings: () => void
}

export default function SettingsSection({
  activeEnvironment,
  application,
  environmentSettings,
  setEnvironmentSettings,
  setActiveEnvironment,
  loadEnvironmentSettings,
  handleSaveSettings
}: SettingsSectionProps) {
  const [applicationSettings, setApplicationSettings] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Load application-level security settings
  useEffect(() => {
    const loadApplicationSettings = async () => {
      if (!application?.id) return

      try {
        setLoading(true)
        const response = await fetch(`/api/admin/applications/${application.id}/security`, {
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          setApplicationSettings({
            ...data,
            credentials: data.credentials || {}
          })
        }
      } catch (error) {
        console.error('Error loading application settings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadApplicationSettings()
  }, [application?.id])

  // Save application-level settings
  const handleSaveApplicationSettings = async () => {
    if (!application?.id || !applicationSettings) return

    try {
      setLoading(true)
      const response = await fetch(`/api/admin/applications/${application.id}/security`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(applicationSettings),
      })

      if (response.ok) {
        alert('Application settings saved successfully!')
      } else {
        alert('Failed to save application settings')
      }
    } catch (error) {
      console.error('Error saving application settings:', error)
      alert('Error saving application settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Security Settings</h3>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      )}

      {/* Application Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Application Settings
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">(applies to all environments)</span>
        </h4>

        {applicationSettings && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Authentication Method</label>
              <select
                value={applicationSettings.authenticationMethod || ''}
                onChange={(e) => setApplicationSettings((prev: any) => ({ ...prev, authenticationMethod: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select authentication method</option>
                <optgroup label="Cloud Providers">
                  <option value="azure_subscription">Azure Subscription</option>
                  <option value="azure_apim">Azure APIM</option>
                  <option value="aws_iam">AWS IAM</option>
                  <option value="gcp_service_account">GCP Service Account</option>
                </optgroup>
                <optgroup label="Token-based">
                  <option value="oauth2">OAuth 2.0</option>
                  <option value="jwt">JWT Token</option>
                  <option value="api_key">API Key</option>
                  <option value="bearer_token">Bearer Token</option>
                </optgroup>
                <optgroup label="Signature-based">
                  <option value="signature_auth">Signature Authentication</option>
                </optgroup>
                <optgroup label="Traditional">
                  <option value="basic_auth">Basic Authentication</option>
                  <option value="custom">Custom</option>
                </optgroup>
              </select>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveApplicationSettings}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save App Settings'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Environment Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Environment Settings
        </h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Environment</label>
            <select
              value={activeEnvironment || ''}
              onChange={(e) => {
                const envId = e.target.value
                setActiveEnvironment(envId)
                loadEnvironmentSettings(envId)
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select environment</option>
              {application.environments.map((env: any) => (
                <option key={env.id} value={env.id}>{env.name}</option>
              ))}
            </select>
          </div>
        </div>

        {activeEnvironment && (
          <div className="space-y-4">
            {/* Authentication Settings */}
            <div className="space-y-4">
              <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">Authentication Settings</h4>
              
              {/* Show auth method from application settings */}
              {applicationSettings?.authenticationMethod && (
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Authentication Method: <span className="font-medium">{applicationSettings.authenticationMethod.replace('_', ' ').toUpperCase()}</span>
                  </p>
                </div>
              )}

              {/* Credential input fields based on authentication method */}
              {applicationSettings?.authenticationMethod && (
                <div className="space-y-4">
                  {/* API Key */}
                  {applicationSettings.authenticationMethod === 'api_key' && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">API Key Configuration</h5>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API Key</label>
                        <input
                          type="password"
                          value={environmentSettings.credentials?.apiKey || ''}
                          onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                            ...prev, 
                            credentials: { ...prev.credentials, apiKey: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter API key"
                        />
                      </div>
                    </div>
                  )}

                  {/* Bearer Token */}
                  {applicationSettings.authenticationMethod === 'bearer_token' && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Bearer Token Configuration</h5>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bearer Token</label>
                        <input
                          type="password"
                          value={environmentSettings.credentials?.bearerToken || ''}
                          onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                            ...prev, 
                            credentials: { ...prev.credentials, bearerToken: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter bearer token"
                        />
                      </div>
                    </div>
                  )}

                  {/* Basic Authentication */}
                  {applicationSettings.authenticationMethod === 'basic_auth' && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Basic Authentication</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username</label>
                          <input
                            type="text"
                            value={environmentSettings.credentials?.username || ''}
                            onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                              ...prev, 
                              credentials: { ...prev.credentials, username: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Enter username"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
                          <input
                            type="password"
                            value={environmentSettings.credentials?.password || ''}
                            onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                              ...prev, 
                              credentials: { ...prev.credentials, password: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Enter password"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* OAuth 2.0 */}
                  {applicationSettings.authenticationMethod === 'oauth2' && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">OAuth 2.0 Configuration</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client ID</label>
                          <input
                            type="text"
                            value={environmentSettings.credentials?.clientId || ''}
                            onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                              ...prev, 
                              credentials: { ...prev.credentials, clientId: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Enter client ID"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client Secret</label>
                          <input
                            type="password"
                            value={environmentSettings.credentials?.clientSecret || ''}
                            onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                              ...prev, 
                              credentials: { ...prev.credentials, clientSecret: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Enter client secret"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Token URL</label>
                          <input
                            type="url"
                            value={environmentSettings.credentials?.tokenUrl || ''}
                            onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                              ...prev, 
                              credentials: { ...prev.credentials, tokenUrl: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="https://oauth.example.com/token"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Scope</label>
                          <input
                            type="text"
                            value={environmentSettings.credentials?.scope || ''}
                            onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                              ...prev, 
                              credentials: { ...prev.credentials, scope: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="read write"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* JWT Token */}
                  {applicationSettings.authenticationMethod === 'jwt' && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">JWT Token Configuration</h5>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">JWT Token</label>
                        <textarea
                          value={environmentSettings.credentials?.jwtToken || ''}
                          onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                            ...prev, 
                            credentials: { ...prev.credentials, jwtToken: e.target.value }
                          }))}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter JWT token"
                        />
                      </div>
                    </div>
                  )}

                  {/* Azure Subscription */}
                  {applicationSettings.authenticationMethod === 'azure_subscription' && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Azure Subscription Configuration</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subscription ID</label>
                          <input
                            type="text"
                            value={environmentSettings.credentials?.subscriptionId || ''}
                            onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                              ...prev, 
                              credentials: { ...prev.credentials, subscriptionId: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Enter subscription ID"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Resource Group</label>
                          <input
                            type="text"
                            value={environmentSettings.credentials?.resourceGroup || ''}
                            onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                              ...prev, 
                              credentials: { ...prev.credentials, resourceGroup: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Enter resource group"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tenant ID</label>
                          <input
                            type="text"
                            value={environmentSettings.credentials?.tenantId || ''}
                            onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                              ...prev, 
                              credentials: { ...prev.credentials, tenantId: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Enter tenant ID"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client ID</label>
                          <input
                            type="text"
                            value={environmentSettings.credentials?.clientId || ''}
                            onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                              ...prev, 
                              credentials: { ...prev.credentials, clientId: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Enter client ID"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Azure APIM */}
                  {applicationSettings.authenticationMethod === 'azure_apim' && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Azure APIM Configuration</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subscription Key</label>
                          <input
                            type="password"
                            value={environmentSettings.credentials?.subscriptionKey || ''}
                            onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                              ...prev, 
                              credentials: { ...prev.credentials, subscriptionKey: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Enter subscription key"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">APIM Instance URL</label>
                          <input
                            type="url"
                            value={environmentSettings.credentials?.apimUrl || ''}
                            onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                              ...prev, 
                              credentials: { ...prev.credentials, apimUrl: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="https://your-apim.azure-api.net"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AWS IAM */}
                  {applicationSettings.authenticationMethod === 'aws_iam' && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">AWS IAM Configuration</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Access Key ID</label>
                          <input
                            type="text"
                            value={environmentSettings.credentials?.accessKeyId || ''}
                            onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                              ...prev, 
                              credentials: { ...prev.credentials, accessKeyId: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Enter access key ID"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Secret Access Key</label>
                          <input
                            type="password"
                            value={environmentSettings.credentials?.secretAccessKey || ''}
                            onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                              ...prev, 
                              credentials: { ...prev.credentials, secretAccessKey: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Enter secret access key"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Region</label>
                          <input
                            type="text"
                            value={environmentSettings.credentials?.region || ''}
                            onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                              ...prev, 
                              credentials: { ...prev.credentials, region: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="us-east-1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Session Token (optional)</label>
                          <input
                            type="password"
                            value={environmentSettings.credentials?.sessionToken || ''}
                            onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                              ...prev, 
                              credentials: { ...prev.credentials, sessionToken: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Enter session token"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* GCP Service Account */}
                  {applicationSettings.authenticationMethod === 'gcp_service_account' && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">GCP Service Account Configuration</h5>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Service Account JSON</label>
                        <textarea
                          value={environmentSettings.credentials?.serviceAccountJson || ''}
                          onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                            ...prev, 
                            credentials: { ...prev.credentials, serviceAccountJson: e.target.value }
                          }))}
                          rows={6}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Paste service account JSON here..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project ID</label>
                        <input
                          type="text"
                          value={environmentSettings.credentials?.projectId || ''}
                          onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                            ...prev, 
                            credentials: { ...prev.credentials, projectId: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter project ID"
                        />
                      </div>
                    </div>
                  )}

                  {/* Signature Authentication */}
                  {applicationSettings.authenticationMethod === 'signature_auth' && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Signature Authentication Configuration</h5>
                      
                      {/* Basic signature fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Private Key</label>
                          <textarea
                            value={environmentSettings.credentials?.privateKey || ''}
                            onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                              ...prev, 
                              credentials: { ...prev.credentials, privateKey: e.target.value }
                            }))}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Enter private key"
                          />
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key Version</label>
                            <input
                              type="text"
                              value={environmentSettings.credentials?.keyVersion || ''}
                              onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                                ...prev, 
                                credentials: { ...prev.credentials, keyVersion: e.target.value }
                              }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              placeholder="v1"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Unique Identifier</label>
                            <input
                              type="text"
                              value={environmentSettings.credentials?.uniqueIdentifier || ''}
                              onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                                ...prev, 
                                credentials: { ...prev.credentials, uniqueIdentifier: e.target.value }
                              }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              placeholder="Enter unique identifier"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Signature Algorithm */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Signature Algorithm</label>
                          <select
                            value={environmentSettings.credentials?.signatureAlgorithm || ''}
                            onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                              ...prev, 
                              credentials: { ...prev.credentials, signatureAlgorithm: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            <option value="">Select algorithm</option>
                            <option value="HMAC-SHA256">HMAC-SHA256</option>
                            <option value="HMAC-SHA1">HMAC-SHA1</option>
                            <option value="RSA-SHA256">RSA-SHA256</option>
                            <option value="ECDSA-SHA256">ECDSA-SHA256</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Signature Header</label>
                          <input
                            type="text"
                            value={environmentSettings.credentials?.signatureHeader || ''}
                            onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                              ...prev, 
                              credentials: { ...prev.credentials, signatureHeader: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Authorization"
                          />
                        </div>
                      </div>

                      {/* Dynamic Fields Selection */}
                      <div className="space-y-3">
                        <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300">Include Dynamic Fields in Signature</h6>
                        
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="noDynamicFields"
                              name="dynamicFields"
                              value="none"
                              checked={!environmentSettings.credentials?.includeDynamicFields}
                              onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                                ...prev, 
                                credentials: { 
                                  ...prev.credentials, 
                                  includeDynamicFields: false,
                                  dynamicFieldsConfig: {}
                                }
                              }))}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <label htmlFor="noDynamicFields" className="text-sm text-gray-700 dark:text-gray-300">
                              No dynamic fields
                            </label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="includeDynamicFields"
                              name="dynamicFields"
                              value="include"
                              checked={environmentSettings.credentials?.includeDynamicFields === true}
                              onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                                ...prev, 
                                credentials: { 
                                  ...prev.credentials, 
                                  includeDynamicFields: true,
                                  dynamicFieldsConfig: prev.credentials?.dynamicFieldsConfig || {}
                                }
                              }))}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <label htmlFor="includeDynamicFields" className="text-sm text-gray-700 dark:text-gray-300">
                              Include dynamic fields
                            </label>
                          </div>
                        </div>

                        {/* Dynamic Fields Configuration */}
                        {environmentSettings.credentials?.includeDynamicFields && (
                          <div className="ml-6 space-y-3 border-l-2 border-blue-200 dark:border-blue-700 pl-4">
                            <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Dynamic Fields:</h6>
                            
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="timestamp"
                                  checked={environmentSettings.credentials?.dynamicFieldsConfig?.timestamp === true}
                                  onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                                    ...prev, 
                                    credentials: { 
                                      ...prev.credentials, 
                                      dynamicFieldsConfig: {
                                        ...prev.credentials?.dynamicFieldsConfig,
                                        timestamp: e.target.checked
                                      }
                                    }
                                  }))}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="timestamp" className="text-sm text-gray-700 dark:text-gray-300">
                                  Timestamp <span className="text-gray-500">(Current Unix timestamp)</span>
                                </label>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="nonce"
                                  checked={environmentSettings.credentials?.dynamicFieldsConfig?.nonce === true}
                                  onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                                    ...prev, 
                                    credentials: { 
                                      ...prev.credentials, 
                                      dynamicFieldsConfig: {
                                        ...prev.credentials?.dynamicFieldsConfig,
                                        nonce: e.target.checked
                                      }
                                    }
                                  }))}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="nonce" className="text-sm text-gray-700 dark:text-gray-300">
                                  Nonce <span className="text-gray-500">(Random UUID for replay protection)</span>
                                </label>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="httpMethod"
                                  checked={environmentSettings.credentials?.dynamicFieldsConfig?.httpMethod === true}
                                  onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                                    ...prev, 
                                    credentials: { 
                                      ...prev.credentials, 
                                      dynamicFieldsConfig: {
                                        ...prev.credentials?.dynamicFieldsConfig,
                                        httpMethod: e.target.checked
                                      }
                                    }
                                  }))}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="httpMethod" className="text-sm text-gray-700 dark:text-gray-300">
                                  HTTP Method <span className="text-gray-500">(GET, POST, PUT, etc.)</span>
                                </label>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="requestUri"
                                  checked={environmentSettings.credentials?.dynamicFieldsConfig?.requestUri === true}
                                  onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                                    ...prev, 
                                    credentials: { 
                                      ...prev.credentials, 
                                      dynamicFieldsConfig: {
                                        ...prev.credentials?.dynamicFieldsConfig,
                                        requestUri: e.target.checked
                                      }
                                    }
                                  }))}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="requestUri" className="text-sm text-gray-700 dark:text-gray-300">
                                  Request URI <span className="text-gray-500">(Path and query parameters)</span>
                                </label>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="bodyHash"
                                  checked={environmentSettings.credentials?.dynamicFieldsConfig?.bodyHash === true}
                                  onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                                    ...prev, 
                                    credentials: { 
                                      ...prev.credentials, 
                                      dynamicFieldsConfig: {
                                        ...prev.credentials?.dynamicFieldsConfig,
                                        bodyHash: e.target.checked
                                      }
                                    }
                                  }))}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="bodyHash" className="text-sm text-gray-700 dark:text-gray-300">
                                  Body Hash <span className="text-gray-500">(SHA256 hash of request body)</span>
                                </label>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="customFields"
                                  checked={environmentSettings.credentials?.dynamicFieldsConfig?.customFields === true}
                                  onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                                    ...prev, 
                                    credentials: { 
                                      ...prev.credentials, 
                                      dynamicFieldsConfig: {
                                        ...prev.credentials?.dynamicFieldsConfig,
                                        customFields: e.target.checked
                                      }
                                    }
                                  }))}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="customFields" className="text-sm text-gray-700 dark:text-gray-300">
                                  Custom Fields <span className="text-gray-500">(User-defined custom fields)</span>
                                </label>
                              </div>
                            </div>

                            {/* Custom Fields Input */}
                            {environmentSettings.credentials?.dynamicFieldsConfig?.customFields && (
                              <div className="ml-6 space-y-2">
                                <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Fields:</h6>
                                <div className="space-y-2">
                                  {(environmentSettings.credentials?.customDynamicFields || []).map((field: any, index: number) => (
                                    <div key={index} className="flex gap-2">
                                      <input
                                        type="text"
                                        value={field.name || ''}
                                        onChange={(e) => {
                                          const newFields = [...(environmentSettings.credentials?.customDynamicFields || [])]
                                          newFields[index] = { ...newFields[index], name: e.target.value }
                                          setEnvironmentSettings((prev: any) => ({ 
                                            ...prev, 
                                            credentials: { ...prev.credentials, customDynamicFields: newFields }
                                          }))
                                        }}
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="Field name"
                                      />
                                      <input
                                        type="text"
                                        value={field.value || ''}
                                        onChange={(e) => {
                                          const newFields = [...(environmentSettings.credentials?.customDynamicFields || [])]
                                          newFields[index] = { ...newFields[index], value: e.target.value }
                                          setEnvironmentSettings((prev: any) => ({ 
                                            ...prev, 
                                            credentials: { ...prev.credentials, customDynamicFields: newFields }
                                          }))
                                        }}
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="Field value or pattern"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newFields = (environmentSettings.credentials?.customDynamicFields || []).filter((_: any, i: number) => i !== index)
                                          setEnvironmentSettings((prev: any) => ({ 
                                            ...prev, 
                                            credentials: { ...prev.credentials, customDynamicFields: newFields }
                                          }))
                                        }}
                                        className="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newFields = [...(environmentSettings.credentials?.customDynamicFields || []), { name: '', value: '' }]
                                      setEnvironmentSettings((prev: any) => ({ 
                                        ...prev, 
                                        credentials: { ...prev.credentials, customDynamicFields: newFields }
                                      }))
                                    }}
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                                  >
                                    + Add Custom Field
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Signature Format */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Signature Format</label>
                        <input
                          type="text"
                          value={environmentSettings.credentials?.signatureFormat || ''}
                          onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                            ...prev, 
                            credentials: { ...prev.credentials, signatureFormat: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Signature keyId='{uniqueIdentifier}',algorithm='{algorithm}',signature='{signature}'"
                        />
                      </div>
                    </div>
                  )}

                  {/* Custom Authentication */}
                  {applicationSettings.authenticationMethod === 'custom' && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Authentication Configuration</h5>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Authentication Script</label>
                        <textarea
                          value={environmentSettings.credentials?.customScript || ''}
                          onChange={(e) => setEnvironmentSettings((prev: any) => ({ 
                            ...prev, 
                            credentials: { ...prev.credentials, customScript: e.target.value }
                          }))}
                          rows={8}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter custom authentication script or logic..."
                        />
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          <strong>Note:</strong> Custom authentication allows you to implement any authentication logic. 
                          Use this for proprietary or complex authentication schemes.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Custom Headers - Available for all authentication methods */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Headers</h5>
                    <div className="space-y-2">
                      {(environmentSettings.credentials?.customHeaders || []).map((header: any, index: number) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={header.name || ''}
                            onChange={(e) => {
                              const newHeaders = [...(environmentSettings.credentials?.customHeaders || [])]
                              newHeaders[index] = { ...newHeaders[index], name: e.target.value }
                              setEnvironmentSettings((prev: any) => ({ 
                                ...prev, 
                                credentials: { ...prev.credentials, customHeaders: newHeaders }
                              }))
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Header name"
                          />
                          <input
                            type="text"
                            value={header.value || ''}
                            onChange={(e) => {
                              const newHeaders = [...(environmentSettings.credentials?.customHeaders || [])]
                              newHeaders[index] = { ...newHeaders[index], value: e.target.value }
                              setEnvironmentSettings((prev: any) => ({ 
                                ...prev, 
                                credentials: { ...prev.credentials, customHeaders: newHeaders }
                              }))
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Header value"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newHeaders = (environmentSettings.credentials?.customHeaders || []).filter((_: any, i: number) => i !== index)
                              setEnvironmentSettings((prev: any) => ({ 
                                ...prev, 
                                credentials: { ...prev.credentials, customHeaders: newHeaders }
                              }))
                            }}
                            className="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const newHeaders = [...(environmentSettings.credentials?.customHeaders || []), { name: '', value: '' }]
                          setEnvironmentSettings((prev: any) => ({ 
                            ...prev, 
                            credentials: { ...prev.credentials, customHeaders: newHeaders }
                          }))
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                      >
                        + Add Custom Header
                      </button>
                    </div>
                  </div>

                  {/* Show note about where credentials are stored */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Note:</strong> These credentials will be securely stored in your configured vault.
                      Only a reference to the vault entry will be stored in the database, not the actual credentials.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Rate Limiting Settings */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="rateLimitEnabled"
                  checked={environmentSettings.rateLimitEnabled || false}
                  onChange={(e) => setEnvironmentSettings((prev: any) => ({ ...prev, rateLimitEnabled: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="rateLimitEnabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Rate Limiting
                </label>
              </div>

              {environmentSettings.rateLimitEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-7">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Requests per Window</label>
                    <input
                      type="number"
                      value={environmentSettings.rateLimitRequests || ''}
                      onChange={(e) => setEnvironmentSettings((prev: any) => ({ ...prev, rateLimitRequests: parseInt(e.target.value) || null }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Window (seconds)</label>
                    <input
                      type="number"
                      value={environmentSettings.rateLimitWindow || ''}
                      onChange={(e) => setEnvironmentSettings((prev: any) => ({ ...prev, rateLimitWindow: parseInt(e.target.value) || null }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="60"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Environment Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
