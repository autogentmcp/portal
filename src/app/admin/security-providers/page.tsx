'use client'

import { useState, useEffect } from 'react'

interface SecurityProvider {
  id: string
  name: string
  provider: string
  isActive: boolean
  vaultUrl?: string
  vaultToken?: string
  vaultNamespace?: string
  vaultPath?: string
  vaultMount?: string
  azureKeyVaultUrl?: string
  azureTenantId?: string
  azureClientId?: string
  azureClientSecret?: string
  akeylessUrl?: string
  akeylessAccessId?: string
  akeylessAccessKey?: string
  akeylessPath?: string
  createdAt: string
  updatedAt: string
}

export default function SecurityProviderPage() {
  const [providers, setProviders] = useState<SecurityProvider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<SecurityProvider | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    isActive: true,
    vaultUrl: '',
    vaultToken: '',
    vaultNamespace: '',
    vaultPath: '',
    vaultMount: '',
    azureKeyVaultUrl: '',
    azureTenantId: '',
    azureClientId: '',
    azureClientSecret: '',
    akeylessUrl: '',
    akeylessAccessId: '',
    akeylessAccessKey: '',
    akeylessPath: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchProviders()
  }, [])

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/admin/security-providers')
      if (response.ok) {
        const data = await response.json()
        setProviders(data)
      }
    } catch (error) {
      setError('Failed to fetch security providers')
    }
  }

  const handleProviderSelect = (provider: SecurityProvider) => {
    setSelectedProvider(provider)
    setFormData({
      name: provider.name,
      provider: provider.provider,
      isActive: provider.isActive,
      vaultUrl: provider.vaultUrl || '',
      vaultToken: provider.vaultToken || '',
      vaultNamespace: provider.vaultNamespace || '',
      vaultPath: provider.vaultPath || '',
      vaultMount: provider.vaultMount || '',
      azureKeyVaultUrl: provider.azureKeyVaultUrl || '',
      azureTenantId: provider.azureTenantId || '',
      azureClientId: provider.azureClientId || '',
      azureClientSecret: provider.azureClientSecret || '',
      akeylessUrl: provider.akeylessUrl || '',
      akeylessAccessId: provider.akeylessAccessId || '',
      akeylessAccessKey: provider.akeylessAccessKey || '',
      akeylessPath: provider.akeylessPath || ''
    })
    setError('')
    setSuccess('')
  }

  const handleNewProvider = () => {
    setSelectedProvider(null)
    setFormData({
      name: '',
      provider: '',
      isActive: true,
      vaultUrl: '',
      vaultToken: '',
      vaultNamespace: '',
      vaultPath: '',
      vaultMount: '',
      azureKeyVaultUrl: '',
      azureTenantId: '',
      azureClientId: '',
      azureClientSecret: '',
      akeylessUrl: '',
      akeylessAccessId: '',
      akeylessAccessKey: '',
      akeylessPath: ''
    })
    setError('')
    setSuccess('')
  }

  const handleSave = async () => {
    if (!formData.name || !formData.provider) {
      setError('Name and provider are required')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const url = selectedProvider 
        ? `/api/admin/security-providers/${selectedProvider.id}`
        : '/api/admin/security-providers'
      
      const method = selectedProvider ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSuccess(selectedProvider ? 'Provider updated successfully' : 'Provider created successfully')
        fetchProviders()
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to save provider')
      }
    } catch (error) {
      setError('Failed to save provider')
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    if (!formData.provider) {
      setError('Please select a provider first')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/security-providers/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSuccess('Connection test successful!')
      } else {
        const error = await response.json()
        setError(error.error || 'Connection test failed')
      }
    } catch (error) {
      setError('Connection test failed')
    } finally {
      setLoading(false)
    }
  }

  const renderProviderConfig = () => {
    switch (formData.provider) {
      case 'hashicorp_vault':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="vaultUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vault URL</label>
                <input
                  id="vaultUrl"
                  type="text"
                  value={formData.vaultUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, vaultUrl: e.target.value }))}
                  placeholder="https://vault.example.com"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="vaultToken" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vault Token</label>
                <input
                  id="vaultToken"
                  type="password"
                  value={formData.vaultToken}
                  onChange={(e) => setFormData(prev => ({ ...prev, vaultToken: e.target.value }))}
                  placeholder="hvs.XXXXXXXXXXXX"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="vaultNamespace" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Namespace (optional)</label>
                <input
                  id="vaultNamespace"
                  type="text"
                  value={formData.vaultNamespace}
                  onChange={(e) => setFormData(prev => ({ ...prev, vaultNamespace: e.target.value }))}
                  placeholder="admin"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="vaultPath" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Path</label>
                <input
                  id="vaultPath"
                  type="text"
                  value={formData.vaultPath}
                  onChange={(e) => setFormData(prev => ({ ...prev, vaultPath: e.target.value }))}
                  placeholder="secret/data/mcp"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="vaultMount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mount (optional)</label>
                <input
                  id="vaultMount"
                  type="text"
                  value={formData.vaultMount}
                  onChange={(e) => setFormData(prev => ({ ...prev, vaultMount: e.target.value }))}
                  placeholder="kv"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>
        )

      case 'azure_keyvault':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="azureKeyVaultUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">KeyVault URL</label>
                <input
                  id="azureKeyVaultUrl"
                  type="text"
                  value={formData.azureKeyVaultUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, azureKeyVaultUrl: e.target.value }))}
                  placeholder="https://myvault.vault.azure.net/"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="azureTenantId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tenant ID</label>
                <input
                  id="azureTenantId"
                  type="text"
                  value={formData.azureTenantId}
                  onChange={(e) => setFormData(prev => ({ ...prev, azureTenantId: e.target.value }))}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="azureClientId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client ID</label>
                <input
                  id="azureClientId"
                  type="text"
                  value={formData.azureClientId}
                  onChange={(e) => setFormData(prev => ({ ...prev, azureClientId: e.target.value }))}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="azureClientSecret" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client Secret</label>
                <input
                  id="azureClientSecret"
                  type="password"
                  value={formData.azureClientSecret}
                  onChange={(e) => setFormData(prev => ({ ...prev, azureClientSecret: e.target.value }))}
                  placeholder="Client secret"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>
        )

      case 'akeyless':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="akeylessUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Akeyless URL</label>
                <input
                  id="akeylessUrl"
                  type="text"
                  value={formData.akeylessUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, akeylessUrl: e.target.value }))}
                  placeholder="https://api.akeyless.io"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="akeylessPath" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Path</label>
                <input
                  id="akeylessPath"
                  type="text"
                  value={formData.akeylessPath}
                  onChange={(e) => setFormData(prev => ({ ...prev, akeylessPath: e.target.value }))}
                  placeholder="/mcp/secrets"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="akeylessAccessId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Access ID</label>
                <input
                  id="akeylessAccessId"
                  type="text"
                  value={formData.akeylessAccessId}
                  onChange={(e) => setFormData(prev => ({ ...prev, akeylessAccessId: e.target.value }))}
                  placeholder="p-xxxxxxxx"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="akeylessAccessKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Access Key</label>
                <input
                  id="akeylessAccessKey"
                  type="password"
                  value={formData.akeylessAccessKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, akeylessAccessKey: e.target.value }))}
                  placeholder="Access key"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Security Provider Configuration</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure global security providers for accessing secrets and authentication tokens
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Providers List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            🛡️ Security Providers
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Manage your security providers
          </p>
          
          <div className="space-y-2">
            <button 
              onClick={handleNewProvider}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              🔑 Add New Provider
            </button>
            
            {providers.map((provider) => (
              <div
                key={provider.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedProvider?.id === provider.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-600'
                }`}
                onClick={() => handleProviderSelect(provider)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{provider.name}</div>
                    <div className="text-sm text-gray-500 capitalize">
                      {provider.provider.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {provider.isActive ? (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Active</span>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">Inactive</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Provider Configuration */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            {selectedProvider ? 'Edit Provider' : 'New Provider'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Configure your security provider settings
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <span className="text-red-600 mr-2">⚠️</span>
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✅</span>
                <span className="text-green-700">{success}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Provider Name</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Production Vault"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="provider" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Provider Type</label>
                <select
                  id="provider"
                  value={formData.provider}
                  onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select provider</option>
                  <option value="hashicorp_vault">HashiCorp Vault</option>
                  <option value="azure_keyvault">Azure KeyVault</option>
                  <option value="akeyless">Akeyless</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</label>
            </div>

            {renderProviderConfig()}

            <div className="flex gap-2 pt-4">
              <button 
                onClick={handleSave} 
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : '💾 Save Provider'}
              </button>
              <button 
                onClick={handleTestConnection}
                disabled={loading || !formData.provider}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Test Connection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface SecurityProvider {
  id: string
  name: string
  provider: string
  isActive: boolean
  vaultUrl?: string
  vaultToken?: string
  vaultNamespace?: string
  vaultPath?: string
  vaultMount?: string
  azureKeyVaultUrl?: string
  azureTenantId?: string
  azureClientId?: string
  azureClientSecret?: string
  akeylessUrl?: string
  akeylessAccessId?: string
  akeylessAccessKey?: string
  akeylessPath?: string
  createdAt: string
  updatedAt: string
}

export default function SecurityProviderPage() {
  const [providers, setProviders] = useState<SecurityProvider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<SecurityProvider | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    isActive: true,
    vaultUrl: '',
    vaultToken: '',
    vaultNamespace: '',
    vaultPath: '',
    vaultMount: '',
    azureKeyVaultUrl: '',
    azureTenantId: '',
    azureClientId: '',
    azureClientSecret: '',
    akeylessUrl: '',
    akeylessAccessId: '',
    akeylessAccessKey: '',
    akeylessPath: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchProviders()
  }, [])

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/admin/security-providers')
      if (response.ok) {
        const data = await response.json()
        setProviders(data)
      }
    } catch (error) {
      setError('Failed to fetch security providers')
    }
  }

  const handleProviderSelect = (provider: SecurityProvider) => {
    setSelectedProvider(provider)
    setFormData({
      name: provider.name,
      provider: provider.provider,
      isActive: provider.isActive,
      vaultUrl: provider.vaultUrl || '',
      vaultToken: provider.vaultToken || '',
      vaultNamespace: provider.vaultNamespace || '',
      vaultPath: provider.vaultPath || '',
      vaultMount: provider.vaultMount || '',
      azureKeyVaultUrl: provider.azureKeyVaultUrl || '',
      azureTenantId: provider.azureTenantId || '',
      azureClientId: provider.azureClientId || '',
      azureClientSecret: provider.azureClientSecret || '',
      akeylessUrl: provider.akeylessUrl || '',
      akeylessAccessId: provider.akeylessAccessId || '',
      akeylessAccessKey: provider.akeylessAccessKey || '',
      akeylessPath: provider.akeylessPath || ''
    })
    setError('')
    setSuccess('')
  }

  const handleNewProvider = () => {
    setSelectedProvider(null)
    setFormData({
      name: '',
      provider: '',
      isActive: true,
      vaultUrl: '',
      vaultToken: '',
      vaultNamespace: '',
      vaultPath: '',
      vaultMount: '',
      azureKeyVaultUrl: '',
      azureTenantId: '',
      azureClientId: '',
      azureClientSecret: '',
      akeylessUrl: '',
      akeylessAccessId: '',
      akeylessAccessKey: '',
      akeylessPath: ''
    })
    setError('')
    setSuccess('')
  }

  const handleSave = async () => {
    if (!formData.name || !formData.provider) {
      setError('Name and provider are required')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const url = selectedProvider 
        ? `/api/admin/security-providers/${selectedProvider.id}`
        : '/api/admin/security-providers'
      
      const method = selectedProvider ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSuccess(selectedProvider ? 'Provider updated successfully' : 'Provider created successfully')
        fetchProviders()
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to save provider')
      }
    } catch (error) {
      setError('Failed to save provider')
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    if (!formData.provider) {
      setError('Please select a provider first')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/security-providers/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSuccess('Connection test successful!')
      } else {
        const error = await response.json()
        setError(error.error || 'Connection test failed')
      }
    } catch (error) {
      setError('Connection test failed')
    } finally {
      setLoading(false)
    }
  }

  const renderProviderConfig = () => {
    switch (formData.provider) {
      case 'hashicorp_vault':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vaultUrl">Vault URL</Label>
                <Input
                  id="vaultUrl"
                  value={formData.vaultUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, vaultUrl: e.target.value }))}
                  placeholder="https://vault.example.com"
                />
              </div>
              <div>
                <Label htmlFor="vaultToken">Vault Token</Label>
                <Input
                  id="vaultToken"
                  type="password"
                  value={formData.vaultToken}
                  onChange={(e) => setFormData(prev => ({ ...prev, vaultToken: e.target.value }))}
                  placeholder="hvs.XXXXXXXXXXXX"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="vaultNamespace">Namespace (optional)</Label>
                <Input
                  id="vaultNamespace"
                  value={formData.vaultNamespace}
                  onChange={(e) => setFormData(prev => ({ ...prev, vaultNamespace: e.target.value }))}
                  placeholder="admin"
                />
              </div>
              <div>
                <Label htmlFor="vaultPath">Path</Label>
                <Input
                  id="vaultPath"
                  value={formData.vaultPath}
                  onChange={(e) => setFormData(prev => ({ ...prev, vaultPath: e.target.value }))}
                  placeholder="secret/data/mcp"
                />
              </div>
              <div>
                <Label htmlFor="vaultMount">Mount (optional)</Label>
                <Input
                  id="vaultMount"
                  value={formData.vaultMount}
                  onChange={(e) => setFormData(prev => ({ ...prev, vaultMount: e.target.value }))}
                  placeholder="kv"
                />
              </div>
            </div>
          </div>
        )

      case 'azure_keyvault':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="azureKeyVaultUrl">KeyVault URL</Label>
                <Input
                  id="azureKeyVaultUrl"
                  value={formData.azureKeyVaultUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, azureKeyVaultUrl: e.target.value }))}
                  placeholder="https://myvault.vault.azure.net/"
                />
              </div>
              <div>
                <Label htmlFor="azureTenantId">Tenant ID</Label>
                <Input
                  id="azureTenantId"
                  value={formData.azureTenantId}
                  onChange={(e) => setFormData(prev => ({ ...prev, azureTenantId: e.target.value }))}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="azureClientId">Client ID</Label>
                <Input
                  id="azureClientId"
                  value={formData.azureClientId}
                  onChange={(e) => setFormData(prev => ({ ...prev, azureClientId: e.target.value }))}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              </div>
              <div>
                <Label htmlFor="azureClientSecret">Client Secret</Label>
                <Input
                  id="azureClientSecret"
                  type="password"
                  value={formData.azureClientSecret}
                  onChange={(e) => setFormData(prev => ({ ...prev, azureClientSecret: e.target.value }))}
                  placeholder="Client secret"
                />
              </div>
            </div>
          </div>
        )

      case 'akeyless':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="akeylessUrl">Akeyless URL</Label>
                <Input
                  id="akeylessUrl"
                  value={formData.akeylessUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, akeylessUrl: e.target.value }))}
                  placeholder="https://api.akeyless.io"
                />
              </div>
              <div>
                <Label htmlFor="akeylessPath">Path</Label>
                <Input
                  id="akeylessPath"
                  value={formData.akeylessPath}
                  onChange={(e) => setFormData(prev => ({ ...prev, akeylessPath: e.target.value }))}
                  placeholder="/mcp/secrets"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="akeylessAccessId">Access ID</Label>
                <Input
                  id="akeylessAccessId"
                  value={formData.akeylessAccessId}
                  onChange={(e) => setFormData(prev => ({ ...prev, akeylessAccessId: e.target.value }))}
                  placeholder="p-xxxxxxxx"
                />
              </div>
              <div>
                <Label htmlFor="akeylessAccessKey">Access Key</Label>
                <Input
                  id="akeylessAccessKey"
                  type="password"
                  value={formData.akeylessAccessKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, akeylessAccessKey: e.target.value }))}
                  placeholder="Access key"
                />
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Security Provider Configuration</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure global security providers for accessing secrets and authentication tokens
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Providers List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security Providers
            </CardTitle>
            <CardDescription>
              Manage your security providers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                onClick={handleNewProvider}
                className="w-full justify-start"
              >
                <Key className="w-4 h-4 mr-2" />
                Add New Provider
              </Button>
              
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedProvider?.id === provider.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleProviderSelect(provider)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{provider.name}</div>
                      <div className="text-sm text-gray-500 capitalize">
                        {provider.provider.replace('_', ' ')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {provider.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Provider Configuration */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedProvider ? 'Edit Provider' : 'New Provider'}
            </CardTitle>
            <CardDescription>
              Configure your security provider settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Provider Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Production Vault"
                />
              </div>
              <div>
                <Label htmlFor="provider">Provider Type</Label>
                <Select 
                  value={formData.provider} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, provider: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hashicorp_vault">HashiCorp Vault</SelectItem>
                    <SelectItem value="azure_keyvault">Azure KeyVault</SelectItem>
                    <SelectItem value="akeyless">Akeyless</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            {renderProviderConfig()}

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleSave} 
                disabled={loading}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Provider'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleTestConnection}
                disabled={loading || !formData.provider}
              >
                Test Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
