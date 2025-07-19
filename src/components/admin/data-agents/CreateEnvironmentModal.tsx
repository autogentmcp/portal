import { NewEnvironment, EnvironmentType, ENVIRONMENT_TYPES, DataAgent } from './types';

interface CreateEnvironmentModalProps {
  isOpen: boolean;
  newEnvironment: NewEnvironment;
  dataAgent: DataAgent;
  onClose: () => void;
  onCreate: () => void;
  onChange: (environment: NewEnvironment) => void;
}

export default function CreateEnvironmentModal({
  isOpen,
  newEnvironment,
  dataAgent,
  onClose,
  onCreate,
  onChange
}: CreateEnvironmentModalProps) {
  if (!isOpen) return null;

  // Get existing environment types
  const environments = dataAgent.environments || [];
  const existingTypes = new Set(environments.map(env => env.environmentType));
  
  // Get available environment types (not already created)
  const availableTypes = ENVIRONMENT_TYPES.filter(type => !existingTypes.has(type.value));
  
  // Check if all environment types are created
  const allTypesCreated = availableTypes.length === 0;

  const isValid = newEnvironment.environmentType &&
    newEnvironment.connectionConfig.host && 
    newEnvironment.connectionConfig.database && 
    newEnvironment.credentials.username && 
    newEnvironment.credentials.password;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Create Environment</h3>
              {allTypesCreated && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  All environment types have been created
                </p>
              )}
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              <span className="sr-only">Close</span>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="px-6 py-4 space-y-4">
          {allTypesCreated ? (
            <div className="text-center py-8">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/20">
                <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">All Environments Created</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                You have already created environments for all available types (Production, Staging, Development).
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Environment Type *
                </label>
                <select
                  value={newEnvironment.environmentType}
                  onChange={(e) => onChange({ ...newEnvironment, environmentType: e.target.value as EnvironmentType })}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select environment type</option>
                  {availableTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {newEnvironment.environmentType && (
                  <div className="mt-1 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Environment Name:</strong> {newEnvironment.environmentType}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                      {ENVIRONMENT_TYPES.find(t => t.value === newEnvironment.environmentType)?.description}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newEnvironment.description}
                  onChange={(e) => onChange({ ...newEnvironment, description: e.target.value })}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Describe this environment..."
                />
              </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Host *
              </label>
              <input
                type="text"
                value={newEnvironment.connectionConfig.host}
                onChange={(e) => onChange({ 
                  ...newEnvironment, 
                  connectionConfig: { ...newEnvironment.connectionConfig, host: e.target.value }
                })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="localhost"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Port
              </label>
              <input
                type="text"
                value={newEnvironment.connectionConfig.port}
                onChange={(e) => onChange({ 
                  ...newEnvironment, 
                  connectionConfig: { ...newEnvironment.connectionConfig, port: e.target.value }
                })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="5432"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Database *
              </label>
              <input
                type="text"
                value={newEnvironment.connectionConfig.database}
                onChange={(e) => onChange({ 
                  ...newEnvironment, 
                  connectionConfig: { ...newEnvironment.connectionConfig, database: e.target.value }
                })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="mydatabase"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Schema
              </label>
              <input
                type="text"
                value={newEnvironment.connectionConfig.schema}
                onChange={(e) => onChange({ 
                  ...newEnvironment, 
                  connectionConfig: { ...newEnvironment.connectionConfig, schema: e.target.value }
                })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="public"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username *
              </label>
              <input
                type="text"
                value={newEnvironment.credentials.username}
                onChange={(e) => onChange({ 
                  ...newEnvironment, 
                  credentials: { ...newEnvironment.credentials, username: e.target.value }
                })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password *
              </label>
              <input
                type="password"
                value={newEnvironment.credentials.password}
                onChange={(e) => onChange({ 
                  ...newEnvironment, 
                  credentials: { ...newEnvironment.credentials, password: e.target.value }
                })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="password"
              />
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              🔒 These credentials will be securely stored in your configured vault. Only a reference will be stored in the database.
            </p>
          </div>
          </>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Close
          </button>
          {!allTypesCreated && (
            <button
              onClick={onCreate}
              disabled={!isValid}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Environment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
