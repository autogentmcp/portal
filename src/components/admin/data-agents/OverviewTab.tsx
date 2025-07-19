import { Environment, ENVIRONMENT_TYPES } from './types';

interface OverviewTabProps {
  environment: Environment;
}

export default function OverviewTab({ environment }: OverviewTabProps) {
  const getEnvironmentTypeLabel = (environment: Environment) => {
    const envTypeConfig = ENVIRONMENT_TYPES.find(t => t.value === environment.environmentType);
    return envTypeConfig ? envTypeConfig.label : environment.environmentType;
  };
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Connection Status</h3>
          <p className={`text-2xl font-bold mt-2 ${
            environment.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-400'
          }`}>
            {environment.status}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Tables</h3>
          <p className="text-2xl font-bold mt-2 text-blue-600">
            {environment._count?.dataAgentTables || 0}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Relationships</h3>
          <p className="text-2xl font-bold mt-2 text-purple-600">
            {environment._count?.dataAgentRelations || 0}
          </p>
        </div>
      </div>
      
      <div className="prose dark:prose-invert max-w-none">
        <h3>Environment Details</h3>
        <p>Environment Type: {getEnvironmentTypeLabel(environment)}</p>
        <p>Health Status: {environment.healthStatus}</p>
        {environment.lastConnectedAt && (
          <p>Last Connected: {new Date(environment.lastConnectedAt).toLocaleString()}</p>
        )}
        <p>Created: {new Date(environment.createdAt).toLocaleString()}</p>
      </div>
    </div>
  );
}
