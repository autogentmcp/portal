import { useState } from 'react'
import { Application, Endpoint } from './types'

// Endpoint display component to avoid hooks inside of loops
const EndpointsDisplay = ({ endpoints }: { endpoints: Endpoint[] }) => {
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
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {typeof type === 'object' ? (type as any)?.type || JSON.stringify(type) : String(type)}
                              </span>
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

interface ApplicationOverviewProps {
  application: Application
}

export default function ApplicationOverview({ application }: ApplicationOverviewProps) {
  return (
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
  )
}
