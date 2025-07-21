import { Environment, ENVIRONMENT_TYPES } from './types';

interface OverviewTabProps {
  environment: Environment;
}

export default function OverviewTab({ environment }: OverviewTabProps) {
  const getEnvironmentTypeLabel = (environment: Environment) => {
    const envTypeConfig = ENVIRONMENT_TYPES.find(t => t.value === environment.name);
    return envTypeConfig ? envTypeConfig.label : environment.name;
  };
  
  return (
    <div className="space-y-6">
      {/* Combined Environment Status Card */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Environment Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Connection Status */}
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Connection</h4>
            <p className={`text-3xl font-bold mt-2 ${
              environment.status === 'ACTIVE' 
                ? 'text-green-600' 
                : environment.status === 'UNKNOWN'
                ? 'text-gray-500'
                : 'text-red-500'
            }`}>
              {environment.status}
            </p>
            <p className={`text-xs mt-1 ${
              environment.healthStatus === 'HEALTHY' 
                ? 'text-green-600' 
                : environment.healthStatus === 'UNKNOWN'
                ? 'text-gray-500'
                : 'text-yellow-600'
            }`}>
              {environment.healthStatus}
              {environment.status === 'UNKNOWN' && (
                <span className="block text-gray-400 text-xs mt-1">Test connection to verify</span>
              )}
            </p>
          </div>
          
          {/* Tables */}
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Tables</h4>
            <p className="text-3xl font-bold mt-2 text-blue-600">
              {environment._count?.tables || 0}
            </p>
            <p className="text-xs mt-1 text-gray-500">imported</p>
          </div>
          
          {/* Relationships */}
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Relationships</h4>
            <p className="text-3xl font-bold mt-2 text-purple-600">
              {environment._count?.relations || 0}
            </p>
            <p className="text-xs mt-1 text-gray-500">discovered</p>
          </div>
        </div>
        
        {/* Environment Details */}
        <div className="border-t pt-4 border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-900 dark:text-gray-100">Environment Type:</span>
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                {getEnvironmentTypeLabel(environment)}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-900 dark:text-gray-100">Created:</span>
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                {new Date(environment.createdAt).toLocaleDateString()}
              </span>
            </div>
            {environment.lastConnectedAt && (
              <div className="md:col-span-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">Last Connected:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  {new Date(environment.lastConnectedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
