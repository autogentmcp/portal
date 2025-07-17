'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeftIcon, PlusIcon, KeyIcon, ShieldCheckIcon, ServerIcon } from '@heroicons/react/24/outline'
import SettingsSection from './settings-section'
import ThemeToggle from '@/components/common/theme-toggle'

// Endpoint display component to avoid hooks inside of loops
const EndpointsDisplay = ({ endpoints }: { endpoints: any[] }) => {
  const [expandedEndpoints, setExpandedEndpoints] = useState<Record<string, boolean>>({});
  
  const toggleEndpoint = (id: string) => {
    setExpandedEndpoints(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Endpoints</h3>
      <div className="space-y-4">
        {endpoints.map((endpoint) => (
          <div key={endpoint.id} className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
            <div 
              className="flex items-center justify-between mb-3 cursor-pointer"
              onClick={() => toggleEndpoint(endpoint.id)}
            >
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100">{endpoint.name}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-mono bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs mr-2">
                    {endpoint.method}
                  </span>
                  {endpoint.path}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {endpoint.isPublic ? (
                  <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded-full text-xs font-medium">
                    Public
                  </span>
                ) : (
                  <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
                    Protected
                  </span>
                )}
                <svg 
                  className={`h-5 w-5 text-gray-500 transform transition-transform ${expandedEndpoints[endpoint.id] ? 'rotate-180' : ''}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            {/* Endpoint parameters section - only shown when expanded */}
            {expandedEndpoints[endpoint.id] && (
              <div className="mt-3 space-y-3 border-t border-gray-200 dark:border-gray-600 pt-3">
                {endpoint.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {endpoint.description}
                  </p>
                )}
                
                {/* Path Parameters */}
                {(() => {
                  // Safely parse pathParams which might be a JSON string or object
                  let parsedPathParams;
                  try {
                    parsedPathParams = typeof endpoint.pathParams === 'string' 
                      ? JSON.parse(endpoint.pathParams) 
                      : endpoint.pathParams;
                    
                    if (!parsedPathParams || Object.keys(parsedPathParams).length === 0) {
                      return null;
                    }
                    
                    return (
                      <div className="bg-gray-100 dark:bg-gray-600 rounded-md p-3">
                        <h5 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Path Parameters</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(parsedPathParams).map(([key, type]) => (
                            <div key={key} className="flex flex-col">
                              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{key}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{type as string}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  } catch (e) {
                    return null;
                  }
                })()}
                
                {/* Query Parameters */}
                {(() => {
                  // Safely parse queryParams which might be a JSON string or object
                  let parsedQueryParams;
                  try {
                    parsedQueryParams = typeof endpoint.queryParams === 'string' 
                      ? JSON.parse(endpoint.queryParams) 
                      : endpoint.queryParams;
                    
                    if (!parsedQueryParams || Object.keys(parsedQueryParams).length === 0) {
                      return null;
                    }
                    
                    return (
                      <div className="bg-gray-100 dark:bg-gray-600 rounded-md p-3">
                        <h5 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Query Parameters</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(parsedQueryParams).map(([key, type]) => (
                            <div key={key} className="flex flex-col">
                              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{key}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{type as string}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  } catch (e) {
                    return null;
                  }
                })()}
                
                {/* Request Body */}
                {(() => {
                  // Safely parse requestBody which might be a JSON string or object
                  let parsedRequestBody;
                  try {
                    parsedRequestBody = typeof endpoint.requestBody === 'string' 
                      ? JSON.parse(endpoint.requestBody) 
                      : endpoint.requestBody;
                    
                    if (!parsedRequestBody || Object.keys(parsedRequestBody).length === 0) {
                      return null;
                    }
                    
                    return (
                      <div className="bg-gray-100 dark:bg-gray-600 rounded-md p-3">
                        <h5 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Request Body</h5>
                        <pre className="text-xs bg-gray-200 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                          {JSON.stringify(parsedRequestBody, null, 2)}
                        </pre>
                      </div>
                    );
                  } catch (e) {
                    return null;
                  }
                })()}
                
                {/* Response Body */}
                {(() => {
                  // Safely parse responseBody which might be a JSON string or object
                  let parsedResponseBody;
                  try {
                    parsedResponseBody = typeof endpoint.responseBody === 'string' 
                      ? JSON.parse(endpoint.responseBody) 
                      : endpoint.responseBody;
                    
                    if (!parsedResponseBody || Object.keys(parsedResponseBody).length === 0) {
                      return null;
                    }
                    
                    return (
                      <div className="bg-gray-100 dark:bg-gray-600 rounded-md p-3">
                        <h5 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Response Body</h5>
                        <pre className="text-xs bg-gray-200 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                          {JSON.stringify(parsedResponseBody, null, 2)}
                        </pre>
                      </div>
                    );
                  } catch (e) {
                    return null;
                  }
                })()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

interface Application {
  id: string
  name: string
  description: string | null
  appKey: string
  status: string
  healthCheckUrl?: string
  healthStatus?: string
  lastHealthCheckAt?: string
  consecutiveFailures?: number
  consecutiveSuccesses?: number
  createdAt: string
  user: {
    name: string | null
    email: string
  }
  environments: Environment[]
  apiKeys: ApiKey[]
  endpoints: Endpoint[]
  healthCheckLogs?: HealthCheckLog[]
}

interface Environment {
  id: string
  name: string
  status: string
  baseDomain?: string
  healthStatus?: string
  lastHealthCheckAt?: string
  createdAt: string
  apiKeys: ApiKey[]
  security?: EnvironmentSecurity
  healthCheckLogs?: HealthCheckLog[]
}

interface EnvironmentSecurity {
  id: string
  authenticationMethod: string
  azureSubscription?: string
  azureResourceGroup?: string
  azureKeyVault?: string
  azureApimSubscriptionKey?: string
  azureApimService?: string
  azureApimApiVersion?: string
  awsAccessKey?: string
  awsSecretKey?: string
  awsRegion?: string
  awsIamRole?: string
  awsSessionToken?: string
  gcpProjectId?: string
  gcpKeyFile?: string
  gcpServiceAccount?: string
  oauth2ClientId?: string
  oauth2ClientSecret?: string
  oauth2AuthUrl?: string
  oauth2TokenUrl?: string
  oauth2Scopes?: string
  jwtSecret?: string
  jwtAlgorithm?: string
  jwtExpiration?: number
  signaturePrivateKey?: string
  signatureKeyVersion?: string
  signatureUniqueId?: string
  signatureAlgorithm?: string
  apiKey?: string
  apiKeyHeader?: string
  bearerToken?: string
  basicAuthUsername?: string
  basicAuthPassword?: string
  rateLimitEnabled: boolean
  rateLimitRequests?: number
  rateLimitWindow?: number
  secretKeys?: string
  customHeaders?: string
}

interface ApiKey {
  id: string
  name: string
  token: string
  status: string
  expiresAt: string | null
  lastUsed: string | null
  createdAt: string
  environment: {
    id: string
    name: string
  }
}

interface HealthCheckLog {
  id: string
  status: string
  statusCode?: number
  responseTime?: number
  message?: string
  consecutiveFailures: number
  consecutiveSuccesses: number
  createdAt: string
  environmentId?: string
  applicationId: string
}

interface Endpoint {
  id: string
  name: string
  path: string // Changed from url to match prisma schema
  method: string
  description?: string
  isPublic?: boolean
  pathParams?: Record<string, any> // For path parameters like {"orderId": "String"}
  queryParams?: Record<string, any> // For query parameters
  requestBody?: Record<string, any> // For request body schema
  responseBody?: Record<string, any> // For response body schema
  createdAt: string
  environmentId?: string
}

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

  const handleCreateEnvironment = async (formData: FormData) => {
    const name = formData.get('name') as string
    const status = formData.get('status') as string
    const baseDomain = formData.get('baseDomain') as string

    if (!baseDomain) {
      alert('Base domain is required');
      return;
    }

    try {
      const response = await fetch(`/api/admin/applications/${params.id}/environments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, status, baseDomain })
      })

      if (response.ok) {
        await fetchApplicationDetails()
        setShowCreateEnvironment(false)
      }
    } catch (error) {
      console.error('Error creating environment:', error)
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
          <div className="space-y-6">
            {/* Application Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Application Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">App Key</label>
                  <code className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-gray-100">
                    {application.appKey}
                  </code>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Created</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {new Date(application.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {application.healthCheckUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Health Check URL</label>
                    <code className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-gray-100">
                      {application.healthCheckUrl}
                    </code>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Health Status</label>
                  <div className="mt-1 flex items-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      application.healthStatus === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      application.healthStatus === 'DEGRADED' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      application.healthStatus === 'INACTIVE' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}>
                      {application.healthStatus || 'UNKNOWN'}
                    </span>
                    {application.lastHealthCheckAt && (
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                        Last check: {new Date(application.lastHealthCheckAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Health Check History */}
            {application.healthCheckLogs && application.healthCheckLogs.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Health Check History</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Response</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Environment</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {application.healthCheckLogs.slice(0, 5).map((log) => (
                        <tr key={log.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              log.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              log.status === 'failure' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {log.statusCode && `${log.statusCode}`}
                            {log.responseTime && ` (${log.responseTime}s)`}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {application.environments.find(e => e.id === log.environmentId)?.name || 'Global'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {log.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Endpoints */}
            <EndpointsDisplay endpoints={application.endpoints} />
          </div>
        )}

        {activeTab === 'environments' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Environments</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Manage your application environments and their configurations
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateEnvironment(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 flex items-center transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Environment
                </button>
              </div>
              
              {application.environments.length === 0 ? (
                <div className="text-center py-12">
                  <ServerIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No environments</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new environment.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowCreateEnvironment(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create Environment
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                  {application.environments.map((env) => (
                    <div key={env.id} className="rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow duration-200" style={{ backgroundColor: '#363940' }}>
                      <div className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-3">
                              <div className="flex items-center">
                                <ServerIcon className="h-5 w-5 text-gray-300 mr-2" />
                                <h4 className="text-lg font-semibold text-white">{env.name}</h4>
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  env.status === 'ACTIVE' 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}>
                                  {env.status}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  env.healthStatus === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                  env.healthStatus === 'DEGRADED' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                  env.healthStatus === 'INACTIVE' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                }`}>
                                  {env.healthStatus || 'UNKNOWN'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center text-sm text-gray-300">
                                <KeyIcon className="h-4 w-4 mr-2" />
                                <span>{env.apiKeys.length} API key{env.apiKeys.length !== 1 ? 's' : ''}</span>
                                <span className="mx-2">•</span>
                                <span>Created {new Date(env.createdAt).toLocaleDateString()}</span>
                              </div>
                              
                              {env.lastHealthCheckAt && (
                                <div className="flex items-center text-sm text-gray-300">
                                  <ShieldCheckIcon className="h-4 w-4 mr-2" />
                                  <span>Last health check: {new Date(env.lastHealthCheckAt).toLocaleString()}</span>
                                </div>
                              )}
                            </div>

                            {env.baseDomain ? (
                              <div className="flex items-center mb-4">
                                <div className="flex items-center bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                                  <span className="text-sm font-mono text-blue-700 dark:text-blue-300">{env.baseDomain}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDomainUpdateData({environmentId: env.id, currentDomain: env.baseDomain})
                                      setShowUpdateDomain(true)
                                    }}
                                    className="ml-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center mb-4">
                                <div className="flex items-center bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                                  <span className="text-sm text-red-700 dark:text-red-300">No base domain set</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDomainUpdateData({environmentId: env.id, currentDomain: ''})
                                      setShowUpdateDomain(true)
                                    }}
                                    className="ml-2 text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-colors"
                                  >
                                    Set Domain
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-gray-500">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => {
                                setActiveEnvironment(env.id)
                                setActiveTab('settings')
                                loadEnvironmentSettings(env.id)
                              }}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/70 transition-colors"
                            >
                              <ShieldCheckIcon className="h-3 w-3 mr-1" />
                              Configure Security
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEnvironment(env.id)
                                setShowCreateApiKey(true)
                              }}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/70 transition-colors"
                            >
                              <KeyIcon className="h-3 w-3 mr-1" />
                              Generate API Key
                            </button>
                          </div>
                          <button
                            onClick={() => {
                              setEnvironmentToDelete(env)
                              setShowDeleteEnvironment(true)
                            }}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70 transition-colors"
                          >
                            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">API Keys</h3>
              <button
                onClick={() => setShowCreateApiKey(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Generate API Key
              </button>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Environment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Last Used
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {application.apiKeys.map((key) => (
                    <tr key={key.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{key.name}</div>
                        <div className="flex items-center">
                          <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                            {/* Show plaintext key from vault if available, otherwise show truncated hashed key */}
                            {plaintextApiKeys[key.id] 
                              ? `${plaintextApiKeys[key.id].substring(0, 30)}...`
                              : `${key.token.substring(0, 12)}... (hashed)`}
                          </div>
                          <button
                            onClick={() => {
                              // Copy plaintext key from vault if available, otherwise use hashed key
                              if (plaintextApiKeys[key.id]) {
                                navigator.clipboard.writeText(plaintextApiKeys[key.id]);
                                alert('Original API key copied to clipboard');
                              } else {
                                navigator.clipboard.writeText(key.token);
                                alert('Hashed API key copied to clipboard - original key not found in vault');
                              }
                            }}
                            className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Copy API key"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{key.environment.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          key.status === 'ACTIVE' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {key.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <button 
                            onClick={() => {
                              // Copy plaintext key from vault if available, otherwise use hashed key
                              if (plaintextApiKeys[key.id]) {
                                navigator.clipboard.writeText(plaintextApiKeys[key.id]);
                                alert('Original API key copied to clipboard');
                              } else {
                                navigator.clipboard.writeText(key.token);
                                alert('Hashed API key copied to clipboard - original key not found in vault');
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                          </button>
                          <button 
                            onClick={() => handleRevokeApiKey(key.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                            Revoke
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Environment Modal */}
      {showCreateEnvironment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Create Environment</h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              handleCreateEnvironment(new FormData(e.target as HTMLFormElement))
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Environment Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g., Development, Staging, Production"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Base Domain
                  </label>
                  <input
                    type="text"
                    name="baseDomain"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g., api.dev.example.com"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Domain where this environment's API endpoints will be hosted
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateEnvironment(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 border border-transparent rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Domain Modal */}
      {showUpdateDomain && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {domainUpdateData.currentDomain ? 'Update Base Domain' : 'Set Base Domain'}
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const baseDomain = formData.get('baseDomain') as string;
              
              if (baseDomain) {
                updateEnvironmentDomain(domainUpdateData.environmentId, baseDomain);
                setShowUpdateDomain(false);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Base Domain
                  </label>
                  <input
                    type="text"
                    name="baseDomain"
                    required
                    defaultValue={domainUpdateData.currentDomain}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g., api.dev.example.com"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Domain where this environment's API endpoints will be hosted
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowUpdateDomain(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 border border-transparent rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  {domainUpdateData.currentDomain ? 'Update' : 'Set Domain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Create API Key Modal */}
      {showCreateApiKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Generate API Key</h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              handleCreateApiKey(new FormData(e.target as HTMLFormElement))
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Key Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g., Production API Key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Environment
                  </label>
                  <select
                    name="environmentId"
                    value={selectedEnvironment}
                    onChange={(e) => setSelectedEnvironment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select environment</option>
                    {application.environments.map((env) => (
                      <option key={env.id} value={env.id}>{env.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="date"
                    name="expiresAt"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateApiKey(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 border border-transparent rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Environment Confirmation Modal */}
      {showDeleteEnvironment && environmentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 19c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Delete Environment</h3>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to delete the environment <strong className="text-gray-900 dark:text-gray-100">"{environmentToDelete.name}"</strong>? 
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                This action cannot be undone and will permanently delete:
              </p>
              <ul className="mt-2 text-sm text-gray-500 dark:text-gray-400 list-disc list-inside space-y-1">
                <li>All API keys associated with this environment</li>
                <li>All security settings and vault credentials</li>
                <li>All endpoint configurations</li>
                <li>All health check logs</li>
              </ul>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteEnvironment(false)
                  setEnvironmentToDelete(null)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEnvironment}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-500 border border-transparent rounded-md hover:bg-red-700 dark:hover:bg-red-600"
              >
                Delete Environment
              </button>
            </div>
          </div>
        </div>
      )}

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
