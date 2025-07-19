'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeftIcon, KeyIcon, ShieldCheckIcon, ServerIcon } from '@heroicons/react/24/outline'
import SettingsSection from './settings-section'
import ThemeToggle from '@/components/common/theme-toggle'
import ApplicationOverview from './application-overview'
import ApplicationEnvironments from './application-environments'
import ApplicationApiKeys from './application-api-keys'
import ApplicationModals from './application-modals'
import { Application, Environment } from './types'

export default function ApplicationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [application, setApplication] = useState<Application | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateEnvironment, setShowCreateEnvironment] = useState(false)
  const [showCreateApiKey, setShowCreateApiKey] = useState(false)
  const [showUpdateDomain, setShowUpdateDomain] = useState(false)
  const [showDeleteEnvironment, setShowDeleteEnvironment] = useState(false)
  const [environmentToDelete, setEnvironmentToDelete] = useState<Environment | null>(null)
  const [domainUpdateData, setDomainUpdateData] = useState<{environmentId: string, currentDomain: string | undefined}>({environmentId: '', currentDomain: ''})
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('')
  const [activeEnvironment, setActiveEnvironment] = useState<string | null>(null)
  const [environmentSettings, setEnvironmentSettings] = useState<Record<string, any>>({})
  const [plaintextApiKeys, setPlaintextApiKeys] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchApplicationDetails()
  }, [params.id])

  useEffect(() => {
    if (application?.environments && application.environments.length > 0 && !activeEnvironment) {
      setActiveEnvironment(application.environments[0].id)
      loadEnvironmentSettings(application.environments[0].id)
    }
  }, [application, activeEnvironment])

  const loadEnvironmentSettings = async (environmentId: string) => {
    try {
      // Load settings from the security API endpoint to get proper credentials structure
      const response = await fetch(`/api/admin/environments/${environmentId}/security`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setEnvironmentSettings(data)
      } else {
        // Fallback to default settings if API call fails
        const environment = application?.environments.find(env => env.id === environmentId)
        if (environment?.security) {
          setEnvironmentSettings({
            ...environment.security,
            rateLimitEnabled: environment.security.rateLimitEnabled || false,
            rateLimitRequests: environment.security.rateLimitRequests || 100,
            rateLimitWindow: environment.security.rateLimitWindow || 60,
          })
        } else {
          // Default settings for new environment
          setEnvironmentSettings({
            authenticationMethod: 'none',
            rateLimitEnabled: false,
            rateLimitRequests: 100,
            rateLimitWindow: 60,
            credentials: {}
          })
        }
      }
    } catch (error) {
      console.error('Error loading environment settings:', error)
      // Fallback to default settings
      setEnvironmentSettings({
        authenticationMethod: 'none',
        rateLimitEnabled: false,
        rateLimitRequests: 100,
        rateLimitWindow: 60,
        credentials: {}
      })
    }
  }

  const fetchApplicationDetails = async () => {
    try {
      const response = await fetch(`/api/admin/applications/${params.id}/details`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setApplication(data)
        
        // Once we have the application data with API keys, fetch their plaintext versions
        if (data.apiKeys && data.apiKeys.length > 0) {
          fetchPlaintextApiKeys(data)
        }
      } else {
        router.push('/admin/dashboard')
      }
    } catch (error) {
      console.error('Error fetching application details:', error)
      router.push('/admin/dashboard')
    } finally {
      setIsLoading(false)
    }
  }
  
  const fetchPlaintextApiKeys = async (app = application) => {
    if (!app) return
    
    console.log('Fetching plaintext API keys from vault')
    const keys: Record<string, string> = {}
    
    // Fetch each API key from the vault
    for (const key of app.apiKeys) {
      try {
        console.log(`Fetching plaintext key for API key ID: ${key.id}`)
        const response = await fetch(`/api/admin/applications/${params.id}/api-keys/${key.id}/plaintext`, {
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log(`Retrieved plaintext key for API key ID: ${key.id}`)
          keys[key.id] = data.plaintextKey
        } else {
          const errorData = await response.json()
          console.error(`Failed to fetch plaintext key: ${errorData.error || 'Unknown error'}`)
        }
      } catch (error) {
        console.error(`Error fetching plaintext API key for ID ${key.id}:`, error)
      }
    }
    
    console.log(`Retrieved ${Object.keys(keys).length} plaintext keys from vault`)
    setPlaintextApiKeys(keys)
  }
  
  const updateEnvironmentDomain = async (environmentId: string, baseDomain: string) => {
    try {
      const response = await fetch(`/api/admin/environments/${environmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ baseDomain })
      });
      
      if (response.ok) {
        await fetchApplicationDetails(); // Refresh the data
      } else {
        const errorData = await response.json();
        alert(`Failed to update domain: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating environment domain:', error);
      alert('Failed to update environment domain. Please try again.');
    }
  }

  // Compute available environment types
  const allowedTypes = ['production', 'stage', 'development']
  const existingTypes = application?.environments.map(env => env.name.toLowerCase()) || [];
  const availableTypes = allowedTypes.filter(type => !existingTypes.includes(type));

  // New handler for modal: (type, baseDomain, status)
  const handleCreateEnvironment = async (type: string, baseDomain: string, status: string) => {
    if (!baseDomain) {
      alert('Base domain is required');
      return;
    }
    try {
      const response = await fetch(`/api/admin/applications/${params.id}/environments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: type, status, baseDomain })
      })
      if (response.ok) {
        await fetchApplicationDetails();
        setShowCreateEnvironment(false);
      }
    } catch (error) {
      console.error('Error creating environment:', error);
    }
  }

  const handleDeleteEnvironment = async () => {
    if (!environmentToDelete) return

    try {
      const response = await fetch(`/api/admin/environments/${environmentToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        await fetchApplicationDetails()
        setShowDeleteEnvironment(false)
        setEnvironmentToDelete(null)
        
        // If we're deleting the active environment, switch to the first remaining one
        if (activeEnvironment === environmentToDelete.id) {
          const remainingEnvironments = application?.environments.filter(env => env.id !== environmentToDelete.id)
          if (remainingEnvironments && remainingEnvironments.length > 0) {
            setActiveEnvironment(remainingEnvironments[0].id)
            loadEnvironmentSettings(remainingEnvironments[0].id)
          } else {
            setActiveEnvironment(null)
          }
        }
      } else {
        const errorData = await response.json()
        alert(`Failed to delete environment: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting environment:', error)
      alert('Failed to delete environment. Please try again.')
    }
  }

  const handleRevokeApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/applications/${params.id}/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (response.ok) {
        // Refresh the application details to update the UI
        await fetchApplicationDetails();
      } else {
        console.error('Error revoking API key:', await response.text());
      }
    } catch (error) {
      console.error('Error revoking API key:', error);
    }
  };

  const handleCreateApiKey = async (formData: FormData) => {
    const name = formData.get('name') as string
    const environmentId = formData.get('environmentId') as string
    const expiresAt = formData.get('expiresAt') as string

    try {
      const response = await fetch(`/api/admin/applications/${params.id}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          name, 
          environmentId, 
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null 
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // For newly created keys, we get the plaintext key directly in the response
        // So we can add it to our state without another API call
        if (data.plaintextToken) {
          setPlaintextApiKeys(prev => ({
            ...prev,
            [data.id]: data.plaintextToken
          }))
          
          // Show the key to the user
          alert(`New API key created: ${data.plaintextToken}\n\nThis key will only be shown once. Make sure to copy it now.`);
        }
        
        await fetchApplicationDetails()
        setShowCreateApiKey(false)
      }
    } catch (error) {
      console.error('Error creating API key:', error)
    }
  }

  const handleSaveSettings = async () => {
    if (!activeEnvironment) return
    
    try {
      const response = await fetch(`/api/admin/environments/${activeEnvironment}/security`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(environmentSettings)
      })

      if (response.ok) {
        alert('Settings saved successfully!')
        fetchApplicationDetails() // Refresh data
      }
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  // Handler functions for modular components
  const handleConfigureSecurity = (environmentId: string) => {
    setActiveEnvironment(environmentId)
    setActiveTab('settings')
    loadEnvironmentSettings(environmentId)
  }

  const handleGenerateApiKey = (environmentId: string) => {
    setSelectedEnvironment(environmentId)
    setShowCreateApiKey(true)
  }

  const handleUpdateDomain = (environmentId: string, currentDomain: string | undefined) => {
    setDomainUpdateData({ environmentId, currentDomain })
    setShowUpdateDomain(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg text-gray-900 dark:text-gray-100">Loading application details...</div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg text-red-600 dark:text-red-400">Application not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{application.name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{application.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                application.status === 'ACTIVE' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {application.status}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-8 flex-1 space-y-8 min-w-0 md:min-w-full lg:min-w-[1024px]">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: ServerIcon },
              { id: 'environments', name: 'Environments', icon: ServerIcon },
              { id: 'settings', name: 'Security Settings', icon: ShieldCheckIcon },
              { id: 'api-keys', name: 'API Keys', icon: KeyIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <ApplicationOverview application={application} />
        )}

        {activeTab === 'environments' && (
          <ApplicationEnvironments
            application={application}
            onCreateEnvironment={() => setShowCreateEnvironment(true)}
            onDeleteEnvironment={(env) => {
              setEnvironmentToDelete(env)
              setShowDeleteEnvironment(true)
            }}
            onUpdateDomain={handleUpdateDomain}
            onConfigureSecurity={handleConfigureSecurity}
            onGenerateApiKey={handleGenerateApiKey}
          />
        )}
        
        {activeTab === 'settings' && (
          <SettingsSection
            activeEnvironment={activeEnvironment}
            application={application}
            environmentSettings={environmentSettings}
            setEnvironmentSettings={setEnvironmentSettings}
            setActiveEnvironment={setActiveEnvironment}
            loadEnvironmentSettings={loadEnvironmentSettings}
            handleSaveSettings={handleSaveSettings}
          />
        )}

        {activeTab === 'api-keys' && (
          <ApplicationApiKeys
            application={application}
            plaintextApiKeys={plaintextApiKeys}
            onCreateApiKey={() => setShowCreateApiKey(true)}
            onRevokeApiKey={handleRevokeApiKey}
          />
        )}
      </div>

      {/* Modals */}
      <ApplicationModals
        showCreateEnvironment={showCreateEnvironment}
        setShowCreateEnvironment={setShowCreateEnvironment}
        onCreateEnvironment={handleCreateEnvironment}
        availableTypes={availableTypes}
        showUpdateDomain={showUpdateDomain}
        setShowUpdateDomain={setShowUpdateDomain}
        domainUpdateData={domainUpdateData}
        onUpdateDomain={updateEnvironmentDomain}
        showDeleteEnvironment={showDeleteEnvironment}
        setShowDeleteEnvironment={setShowDeleteEnvironment}
        environmentToDelete={environmentToDelete}
        setEnvironmentToDelete={setEnvironmentToDelete}
        onDeleteEnvironment={handleDeleteEnvironment}
        showCreateApiKey={showCreateApiKey}
        setShowCreateApiKey={setShowCreateApiKey}
        selectedEnvironment={selectedEnvironment}
        setSelectedEnvironment={setSelectedEnvironment}
        application={application}
        onCreateApiKey={handleCreateApiKey}
      />

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            Powered by{' '}
            <a 
              href="https://autogentmcp.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              autogentmcp.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}