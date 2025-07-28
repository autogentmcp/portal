'use client'

import { useEffect, useState } from 'react'

interface Application {
  id: string
  name: string
  description: string | null
  appKey: string
  createdAt: string
  updatedAt: string
  endpoints: {
    id: string
    name: string
    path: string
    method: string
    description: string | null
  }[]
  _count: {
    environments: number
    endpoints: number
  }
}

interface DataAgent {
  id: string
  name: string
  description: string | null
  connectionType: string
  status: string
  createdAt: string
  updatedAt: string
  _count: {
    environments: number
    tables: number
    relations: number
  }
}

export function PublicApplicationsList() {
  const [applications, setApplications] = useState<Application[]>([])
  const [dataAgents, setDataAgents] = useState<DataAgent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchApplications()
    fetchDataAgents()
  }, [])

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/applications')
      if (response.ok) {
        const data = await response.json()
        setApplications(data)
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    }
  }

  const fetchDataAgents = async () => {
    try {
      const response = await fetch('/api/data-agents')
      if (response.ok) {
        const data = await response.json()
        setDataAgents(data)
      }
    } catch (error) {
      console.error('Failed to fetch data agents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Loading Applications */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Applications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Loading Data Agents */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Data Agents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (applications.length === 0 && dataAgents.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7l2 2m0 0l2 2m-2-2v6m-6 5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No applications or data agents available</h3>
        <p className="text-gray-500">Applications and data agents will appear here once they are published.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Applications Section */}
      {applications.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Applications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {applications.map((app) => (
              <div key={app.id} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{app.name}</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
                
                {app.description && (
                  <p className="text-gray-600 mb-4 text-sm">{app.description}</p>
                )}
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Environments:</span>
                    <span className="font-medium">{app._count.environments}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Endpoints:</span>
                    <span className="font-medium">{app._count.endpoints}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Public Endpoints:</span>
                    <span className="font-medium">{app.endpoints.length}</span>
                  </div>
                </div>

                {app.endpoints.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Public Endpoints:</h4>
                    <div className="space-y-1">
                      {app.endpoints.slice(0, 3).map((endpoint) => (
                        <div key={endpoint.id} className="flex items-center space-x-2 text-xs">
                          <span className={`px-2 py-1 rounded text-white font-mono ${
                            endpoint.method === 'GET' ? 'bg-green-500' :
                            endpoint.method === 'POST' ? 'bg-blue-500' :
                            endpoint.method === 'PUT' ? 'bg-yellow-500' :
                            endpoint.method === 'DELETE' ? 'bg-red-500' : 'bg-gray-500'
                          }`}>
                            {endpoint.method}
                          </span>
                          <span className="text-gray-600 font-mono">{endpoint.path}</span>
                        </div>
                      ))}
                      {app.endpoints.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{app.endpoints.length - 3} more endpoints
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    Created {new Date(app.createdAt).toLocaleDateString()}
                  </span>
                  <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Agents Section */}
      {dataAgents.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Data Agents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dataAgents.map((agent) => (
              <div key={agent.id} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                  <div className="flex flex-col items-end space-y-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {agent.connectionType.toUpperCase()}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      agent.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {agent.status}
                    </span>
                  </div>
                </div>
                
                {agent.description && (
                  <p className="text-gray-600 mb-4 text-sm">{agent.description}</p>
                )}
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Environments:</span>
                    <span className="font-medium">{agent._count.environments}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tables:</span>
                    <span className="font-medium">{agent._count.tables}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Relationships:</span>
                    <span className="font-medium">{agent._count.relations}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    Created {new Date(agent.createdAt).toLocaleDateString()}
                  </span>
                  <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
