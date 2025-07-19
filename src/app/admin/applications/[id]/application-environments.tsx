import { PlusIcon, ServerIcon, KeyIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { Application, Environment } from './types'
import { useMemo } from 'react'

interface ApplicationEnvironmentsProps {
  application: Application
  onCreateEnvironment: () => void
  onDeleteEnvironment: (env: Environment) => void
  onUpdateDomain: (environmentId: string, currentDomain: string | undefined) => void
  onConfigureSecurity: (environmentId: string) => void
  onGenerateApiKey: (environmentId: string) => void
}

export default function ApplicationEnvironments({
  application,
  onCreateEnvironment,
  onDeleteEnvironment,
  onUpdateDomain,
  onConfigureSecurity,
  onGenerateApiKey
}: ApplicationEnvironmentsProps) {
  // Compute which environment types are already present
  const allowedTypes = ['production', 'stage', 'development']
  const existingTypes = useMemo(() =>
    application.environments.map(env => env.name.toLowerCase()),
    [application.environments]
  )
  const availableTypes = allowedTypes.filter(type => !existingTypes.includes(type))

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Environments</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your application environments and their configurations
            </p>
          </div>
          {/* Pass availableTypes to the modal trigger */}
          <button
            onClick={() => onCreateEnvironment()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 flex items-center transition-colors"
            disabled={availableTypes.length === 0}
            title={availableTypes.length === 0 ? 'All environment types created' : ''}
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
                onClick={() => onCreateEnvironment()}
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
                                onUpdateDomain(env.id, env.baseDomain)
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
                                onUpdateDomain(env.id, '')
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
                        onClick={() => onConfigureSecurity(env.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/70 transition-colors"
                      >
                        <ShieldCheckIcon className="h-3 w-3 mr-1" />
                        Configure Security
                      </button>
                      <button
                        onClick={() => onGenerateApiKey(env.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/70 transition-colors"
                      >
                        <KeyIcon className="h-3 w-3 mr-1" />
                        Generate API Key
                      </button>
                    </div>
                    <button
                      onClick={() => onDeleteEnvironment(env)}
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
  )
}
