'use client'

import { ServerIcon, KeyIcon, ShieldCheckIcon, ChartBarIcon } from '@heroicons/react/24/outline'

interface ApplicationStatsProps {
  application: {
    _count: {
      environments: number
      apiKeys: number
      endpoints: number
    }
    healthStatus?: string
    lastHealthCheckAt?: string
  }
}

export default function ApplicationStats({ application }: ApplicationStatsProps) {
  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      case 'DEGRADED':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
      case 'INACTIVE':
        return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200'
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Environments */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <ServerIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="ml-5">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Environments</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {application._count.environments}
            </p>
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
              <KeyIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div className="ml-5">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">API Keys</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {application._count.apiKeys}
            </p>
          </div>
        </div>
      </div>

      {/* Endpoints */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <ShieldCheckIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="ml-5">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Endpoints</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {application._count.endpoints}
            </p>
          </div>
        </div>
      </div>

      {/* Health Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="ml-5">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Health Status</p>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthStatusColor(application.healthStatus || 'UNKNOWN')}`}>
                {application.healthStatus || 'UNKNOWN'}
              </span>
            </div>
            {application.lastHealthCheckAt && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Last check: {new Date(application.lastHealthCheckAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
