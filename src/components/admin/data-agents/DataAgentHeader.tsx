import { DataAgent, ENVIRONMENT_TYPES } from './types';

interface DataAgentHeaderProps {
  dataAgent: DataAgent;
  onCreateEnvironment: () => void;
  onDeleteAgent: () => void;
  deletingAgent: boolean;
}

export default function DataAgentHeader({
  dataAgent,
  onCreateEnvironment,
  onDeleteAgent,
  deletingAgent
}: DataAgentHeaderProps) {
  // Check if all environment types are created
  const environments = dataAgent.environments || [];
  const existingTypes = new Set(environments.map(env => env.environmentType));
  const allTypesCreated = ENVIRONMENT_TYPES.every(type => existingTypes.has(type.value));
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{dataAgent.name}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{dataAgent.description}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                {dataAgent.connectionType.toUpperCase()}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                dataAgent.status === 'ACTIVE' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
              }`}>
                {dataAgent.status}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCreateEnvironment}
              disabled={allTypesCreated}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title={allTypesCreated ? "All environment types have been created" : "Add new environment"}
            >
              Add Environment
            </button>
            <button
              onClick={onDeleteAgent}
              disabled={deletingAgent}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deletingAgent ? 'Deleting...' : 'Delete Data Agent'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
