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
  createdAt: string
  user: {
    name: string | null
    email: string
  }
  environments: Environment[]
  apiKeys: ApiKey[]
  endpoints: Endpoint[]
}

interface Environment {
  id: string
  name: string
  status: string
  createdAt: string
  apiKeys: ApiKey[]
  security?: EnvironmentSecurity
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
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('')
  const [activeEnvironment, setActiveEnvironment] = useState<string | null>(null)
  const [environmentSettings, setEnvironmentSettings] = useState<Record<string, any>>({})

  useEffect(() => {
    fetchApplicationDetails()
  }, [params.id])

  useEffect(() => {
    if (application?.environments && application.environments.length > 0 && !activeEnvironment) {
      setActiveEnvironment(application.environments[0].id)
      loadEnvironmentSettings(application.environments[0].id)
    }
  }, [application, activeEnvironment])

  const loadEnvironmentSettings = (environmentId: string) => {
    const environment = application?.environments.find(env => env.id === environmentId)
    if (environment?.security) {
      setEnvironmentSettings({
        ...environment.security,
        // Only include rate limiting settings since that's what's stored in environment security now
        rateLimitEnabled: environment.security.rateLimitEnabled || false,
        rateLimitRequests: environment.security.rateLimitRequests || 100,
        rateLimitWindow: environment.security.rateLimitWindow || 60,
      })
    } else {
      // Default settings for new environment (only rate limiting)
      setEnvironmentSettings({
        rateLimitEnabled: false,
        rateLimitRequests: 100,
        rateLimitWindow: 60,
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

  const handleCreateEnvironment = async (formData: FormData) => {
    const name = formData.get('name') as string
    const status = formData.get('status') as string

    try {
      const response = await fetch(`/api/admin/applications/${params.id}/environments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, status })
      })

      if (response.ok) {
        await fetchApplicationDetails()
        setShowCreateEnvironment(false)
      }
    } catch (error) {
      console.error('Error creating environment:', error)
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
              </div>
            </div>

            {/* Endpoints */}
            <EndpointsDisplay endpoints={application.endpoints} />
          </div>
        )}

        {activeTab === 'environments' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Environments</h3>
                <button
                  onClick={() => setShowCreateEnvironment(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 flex items-center"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Environment
                </button>
              </div>
              
              <div className="space-y-4">
                {application.environments.map((env) => (
                  <div key={env.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">{env.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {env.apiKeys.length} API keys • Created {new Date(env.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        env.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {env.status}
                      </span>
                      <button
                        onClick={() => {
                          setActiveEnvironment(env.id);
                          setActiveTab('settings');
                          loadEnvironmentSettings(env.id);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Configure Security
                      </button>
                      <button
                        onClick={() => {
                          setSelectedEnvironment(env.id);
                          setShowCreateApiKey(true);
                        }}
                        className="text-sm text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                      >
                        Generate API Key
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                          {key.token.substring(0, 20)}...
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
                        <button 
                          onClick={() => handleRevokeApiKey(key.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                          Revoke
                        </button>
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
