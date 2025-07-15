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

      {/* Application-Level Settings */}
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

            {/* Credential input fields based on authentication method */}
            {applicationSettings.authenticationMethod && (
              <div className="space-y-4">
                {/* Azure Subscription */}
                {applicationSettings.authenticationMethod === 'azure_subscription' && (
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Azure Subscription Credentials</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subscription ID</label>
                        <input
                          type="text"
                          value={applicationSettings.credentials?.subscriptionId || ''}
                          onChange={(e) => setApplicationSettings((prev: any) => ({ 
                            ...prev, 
                            credentials: { ...prev.credentials, subscriptionId: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter Azure subscription ID"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tenant ID</label>
                        <input
                          type="text"
                          value={applicationSettings.credentials?.tenantId || ''}
                          onChange={(e) => setApplicationSettings((prev: any) => ({ 
                            ...prev, 
                            credentials: { ...prev.credentials, tenantId: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter Azure tenant ID"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Azure APIM */}
                {applicationSettings.authenticationMethod === 'azure_apim' && (
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Azure APIM Credentials</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subscription Key</label>
                        <input
                          type="password"
                          value={applicationSettings.credentials?.subscriptionKey || ''}
                          onChange={(e) => setApplicationSettings((prev: any) => ({ 
                            ...prev, 
                            credentials: { ...prev.credentials, subscriptionKey: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter APIM subscription key"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">APIM URL</label>
                        <input
                          type="url"
                          value={applicationSettings.credentials?.apimUrl || ''}
                          onChange={(e) => setApplicationSettings((prev: any) => ({ 
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
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">AWS IAM Credentials</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Access Key ID</label>
                        <input
                          type="text"
                          value={applicationSettings.credentials?.accessKeyId || ''}
                          onChange={(e) => setApplicationSettings((prev: any) => ({ 
                            ...prev, 
                            credentials: { ...prev.credentials, accessKeyId: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter AWS access key ID"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Secret Access Key</label>
                        <input
                          type="password"
                          value={applicationSettings.credentials?.secretAccessKey || ''}
                          onChange={(e) => setApplicationSettings((prev: any) => ({ 
                            ...prev, 
                            credentials: { ...prev.credentials, secretAccessKey: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter AWS secret access key"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Region</label>
                      <input
                        type="text"
                        value={applicationSettings.credentials?.region || ''}
                        onChange={(e) => setApplicationSettings((prev: any) => ({ 
                          ...prev, 
                          credentials: { ...prev.credentials, region: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="us-east-1"
                      />
                    </div>
                  </div>
                )}

                {/* GCP Service Account */}
                {applicationSettings.authenticationMethod === 'gcp_service_account' && (
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">GCP Service Account Credentials</h5>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Service Account JSON</label>
                      <textarea
                        value={applicationSettings.credentials?.serviceAccountJson || ''}
                        onChange={(e) => setApplicationSettings((prev: any) => ({ 
                          ...prev, 
                          credentials: { ...prev.credentials, serviceAccountJson: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Paste your service account JSON here"
                        rows={4}
                      />
                    </div>
                  </div>
                )}

                {/* OAuth 2.0 */}
                {applicationSettings.authenticationMethod === 'oauth2' && (
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">OAuth 2.0 Credentials</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client ID</label>
                        <input
                          type="text"
                          value={applicationSettings.credentials?.clientId || ''}
                          onChange={(e) => setApplicationSettings((prev: any) => ({ 
                            ...prev, 
                            credentials: { ...prev.credentials, clientId: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter OAuth client ID"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client Secret</label>
                        <input
                          type="password"
                          value={applicationSettings.credentials?.clientSecret || ''}
                          onChange={(e) => setApplicationSettings((prev: any) => ({ 
                            ...prev, 
                            credentials: { ...prev.credentials, clientSecret: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter OAuth client secret"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Authorization URL</label>
                      <input
                        type="url"
                        value={applicationSettings.credentials?.authUrl || ''}
                        onChange={(e) => setApplicationSettings((prev: any) => ({ 
                          ...prev, 
                          credentials: { ...prev.credentials, authUrl: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="https://oauth.provider.com/authorize"
                      />
                    </div>
                  </div>
                )}

                {/* JWT Token */}
                {applicationSettings.authenticationMethod === 'jwt' && (
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">JWT Configuration</h5>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">JWT Secret</label>
                      <input
                        type="password"
                        value={applicationSettings.credentials?.jwtSecret || ''}
                        onChange={(e) => setApplicationSettings((prev: any) => ({ 
                          ...prev, 
                          credentials: { ...prev.credentials, jwtSecret: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Enter JWT secret key"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Issuer</label>
                      <input
                        type="text"
                        value={applicationSettings.credentials?.issuer || ''}
                        onChange={(e) => setApplicationSettings((prev: any) => ({ 
                          ...prev, 
                          credentials: { ...prev.credentials, issuer: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Enter JWT issuer"
                      />
                    </div>
                  </div>
                )}

                {/* API Key */}
                {applicationSettings.authenticationMethod === 'api_key' && (
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">API Key Configuration</h5>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API Key</label>
                      <input
                        type="password"
                        value={applicationSettings.credentials?.apiKey || ''}
                        onChange={(e) => setApplicationSettings((prev: any) => ({ 
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
                        value={applicationSettings.credentials?.bearerToken || ''}
                        onChange={(e) => setApplicationSettings((prev: any) => ({ 
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
                          value={applicationSettings.credentials?.username || ''}
                          onChange={(e) => setApplicationSettings((prev: any) => ({ 
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
                          value={applicationSettings.credentials?.password || ''}
                          onChange={(e) => setApplicationSettings((prev: any) => ({ 
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

                {/* Signature Authentication */}
                {applicationSettings.authenticationMethod === 'signature_auth' && (
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Signature Authentication</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Private Key</label>
                        <textarea
                          value={applicationSettings.credentials?.privateKey || ''}
                          onChange={(e) => setApplicationSettings((prev: any) => ({ 
                            ...prev, 
                            credentials: { ...prev.credentials, privateKey: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter private key for signature"
                          rows={4}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Public Key</label>
                        <textarea
                          value={applicationSettings.credentials?.publicKey || ''}
                          onChange={(e) => setApplicationSettings((prev: any) => ({ 
                            ...prev, 
                            credentials: { ...prev.credentials, publicKey: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter public key for verification"
                          rows={4}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Algorithm</label>
                        <select
                          value={applicationSettings.credentials?.algorithm || ''}
                          onChange={(e) => setApplicationSettings((prev: any) => ({ 
                            ...prev, 
                            credentials: { ...prev.credentials, algorithm: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          <option value="">Select algorithm</option>
                          <option value="RS256">RS256</option>
                          <option value="RS384">RS384</option>
                          <option value="RS512">RS512</option>
                          <option value="ES256">ES256</option>
                          <option value="ES384">ES384</option>
                          <option value="ES512">ES512</option>
                          <option value="PS256">PS256</option>
                          <option value="PS384">PS384</option>
                          <option value="PS512">PS512</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key ID (Optional)</label>
                        <input
                          type="text"
                          value={applicationSettings.credentials?.keyId || ''}
                          onChange={(e) => setApplicationSettings((prev: any) => ({ 
                            ...prev, 
                            credentials: { ...prev.credentials, keyId: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter key identifier"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="includeDynamicFields"
                        checked={applicationSettings.credentials?.includeDynamicFields || false}
                        onChange={(e) => setApplicationSettings((prev: any) => ({ 
                          ...prev, 
                          credentials: { ...prev.credentials, includeDynamicFields: e.target.checked }
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="includeDynamicFields" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Include dynamic fields in signature (timestamp, nonce, etc.)
                      </label>
                    </div>
                    {applicationSettings.credentials?.includeDynamicFields && (
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Dynamic Field to Include</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="timestamp"
                                name="dynamicField"
                                value="timestamp"
                                checked={applicationSettings.credentials?.dynamicField === 'timestamp'}
                                onChange={(e) => setApplicationSettings((prev: any) => ({ 
                                  ...prev, 
                                  credentials: { 
                                    ...prev.credentials, 
                                    dynamicField: e.target.value
                                  }
                                }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <label htmlFor="timestamp" className="text-sm text-gray-700 dark:text-gray-300">
                                Timestamp
                              </label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="nonce"
                                name="dynamicField"
                                value="nonce"
                                checked={applicationSettings.credentials?.dynamicField === 'nonce'}
                                onChange={(e) => setApplicationSettings((prev: any) => ({ 
                                  ...prev, 
                                  credentials: { 
                                    ...prev.credentials, 
                                    dynamicField: e.target.value
                                  }
                                }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <label htmlFor="nonce" className="text-sm text-gray-700 dark:text-gray-300">
                                Nonce
                              </label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="method"
                                name="dynamicField"
                                value="method"
                                checked={applicationSettings.credentials?.dynamicField === 'method'}
                                onChange={(e) => setApplicationSettings((prev: any) => ({ 
                                  ...prev, 
                                  credentials: { 
                                    ...prev.credentials, 
                                    dynamicField: e.target.value
                                  }
                                }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <label htmlFor="method" className="text-sm text-gray-700 dark:text-gray-300">
                                HTTP Method
                              </label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="uri"
                                name="dynamicField"
                                value="uri"
                                checked={applicationSettings.credentials?.dynamicField === 'uri'}
                                onChange={(e) => setApplicationSettings((prev: any) => ({ 
                                  ...prev, 
                                  credentials: { 
                                    ...prev.credentials, 
                                    dynamicField: e.target.value
                                  }
                                }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <label htmlFor="uri" className="text-sm text-gray-700 dark:text-gray-300">
                                Request URI
                              </label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="bodyHash"
                                name="dynamicField"
                                value="bodyHash"
                                checked={applicationSettings.credentials?.dynamicField === 'bodyHash'}
                                onChange={(e) => setApplicationSettings((prev: any) => ({ 
                                  ...prev, 
                                  credentials: { 
                                    ...prev.credentials, 
                                    dynamicField: e.target.value
                                  }
                                }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <label htmlFor="bodyHash" className="text-sm text-gray-700 dark:text-gray-300">
                                Body Hash
                              </label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="other"
                                name="dynamicField"
                                value="other"
                                checked={applicationSettings.credentials?.dynamicField === 'other'}
                                onChange={(e) => setApplicationSettings((prev: any) => ({ 
                                  ...prev, 
                                  credentials: { 
                                    ...prev.credentials, 
                                    dynamicField: e.target.value
                                  }
                                }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <label htmlFor="other" className="text-sm text-gray-700 dark:text-gray-300">
                                Other (Custom)
                              </label>
                            </div>
                          </div>
                        </div>
                        
                        {applicationSettings.credentials?.dynamicField === 'other' && (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Field Name</label>
                              <input
                                type="text"
                                value={applicationSettings.credentials?.customDynamicField || ''}
                                onChange={(e) => setApplicationSettings((prev: any) => ({ 
                                  ...prev, 
                                  credentials: { ...prev.credentials, customDynamicField: e.target.value }
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="Enter custom field name (e.g., api_version, client_id)"
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Enter a single word to use as the custom field name in the signature
                              </p>
                            </div>
                          </div>
                        )}
                        
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                          <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                            <strong>Selected Dynamic Field:</strong>
                          </p>
                          <ul className="text-xs text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
                            {applicationSettings.credentials?.dynamicField === 'timestamp' && <li>Timestamp (current Unix timestamp)</li>}
                            {applicationSettings.credentials?.dynamicField === 'nonce' && <li>Nonce (random UUID for replay protection)</li>}
                            {applicationSettings.credentials?.dynamicField === 'method' && <li>HTTP Method (GET, POST, PUT, etc.)</li>}
                            {applicationSettings.credentials?.dynamicField === 'uri' && <li>Request URI (path and query parameters)</li>}
                            {applicationSettings.credentials?.dynamicField === 'bodyHash' && <li>Body Hash (SHA256 hash of request body)</li>}
                            {applicationSettings.credentials?.dynamicField === 'other' && (
                              <li>Custom field: {applicationSettings.credentials?.customDynamicField || 'Enter field name above'}</li>
                            )}
                            {!applicationSettings.credentials?.dynamicField && (
                              <li className="text-gray-500 dark:text-gray-400">No dynamic field selected</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Authentication */}
                {applicationSettings.authenticationMethod === 'custom' && (
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Authentication</h5>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Configuration</label>
                      <textarea
                        value={applicationSettings.credentials?.customConfig || ''}
                        onChange={(e) => setApplicationSettings((prev: any) => ({ 
                          ...prev, 
                          credentials: { ...prev.credentials, customConfig: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Enter custom authentication configuration (JSON format)"
                        rows={6}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Enter your custom authentication configuration in JSON format. This will be securely stored in your vault.
                      </p>
                    </div>
                    
                    {/* Multiple Custom Headers */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Headers</label>
                      {(applicationSettings.credentials?.customHeaders || []).map((header: any, index: number) => (
                        <div key={index} className="flex items-center space-x-2 mb-2">
                          <input
                            type="text"
                            value={header.name || ''}
                            onChange={(e) => {
                              const newHeaders = [...(applicationSettings.credentials?.customHeaders || [])]
                              newHeaders[index] = { ...newHeaders[index], name: e.target.value }
                              setApplicationSettings((prev: any) => ({ 
                                ...prev, 
                                credentials: { ...prev.credentials, customHeaders: newHeaders }
                              }))
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Header name"
                          />
                          <input
                            type="password"
                            value={header.value || ''}
                            onChange={(e) => {
                              const newHeaders = [...(applicationSettings.credentials?.customHeaders || [])]
                              newHeaders[index] = { ...newHeaders[index], value: e.target.value }
                              setApplicationSettings((prev: any) => ({ 
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
                              const newHeaders = [...(applicationSettings.credentials?.customHeaders || [])]
                              newHeaders.splice(index, 1)
                              setApplicationSettings((prev: any) => ({ 
                                ...prev, 
                                credentials: { ...prev.credentials, customHeaders: newHeaders }
                              }))
                            }}
                            className="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const newHeaders = [...(applicationSettings.credentials?.customHeaders || []), { name: '', value: '' }]
                          setApplicationSettings((prev: any) => ({ 
                            ...prev, 
                            credentials: { ...prev.credentials, customHeaders: newHeaders }
                          }))
                        }}
                        className="px-4 py-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 text-sm"
                      >
                        + Add Header
                      </button>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Validation Endpoint (Optional)</label>
                      <input
                        type="url"
                        value={applicationSettings.credentials?.validationEndpoint || ''}
                        onChange={(e) => setApplicationSettings((prev: any) => ({ 
                          ...prev, 
                          credentials: { ...prev.credentials, validationEndpoint: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="https://api.example.com/validate"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Optional endpoint to validate the custom authentication token
                      </p>
                    </div>
                  </div>
                )}

                {/* Show note about where credentials are stored */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> These credentials will be securely stored in your configured vault. 
                    They are encrypted and never stored in plain text in the database.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleSaveApplicationSettings}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Application Settings'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Environment-Specific Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100">
            Environment Settings
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">(rate limiting only)</span>
          </h4>
          
          {/* Environment Selector */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Environment:</label>
            <select
              value={activeEnvironment || ''}
              onChange={(e) => {
                setActiveEnvironment(e.target.value)
                loadEnvironmentSettings(e.target.value)
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
              >
                Save Environment Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
