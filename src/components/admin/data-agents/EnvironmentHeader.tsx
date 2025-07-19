import { Environment } from './types';

interface EnvironmentHeaderProps {
  environment: Environment;
  onTestConnection: () => void;
  onImportTables: () => void;
  onDeleteEnvironment: () => void;
  onEditCredentials: () => void;
  testingConnection: boolean;
  loadingTables: boolean;
  deletingEnvironment: boolean;
}

export default function EnvironmentHeader({
  environment,
  onTestConnection,
  onImportTables,
  onDeleteEnvironment,
  onEditCredentials,
  testingConnection,
  loadingTables,
  deletingEnvironment
}: EnvironmentHeaderProps) {
  return (
    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{environment.name}</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{environment.description}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onEditCredentials}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Edit Credentials
          </button>
          <button
            onClick={onTestConnection}
            disabled={testingConnection}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {testingConnection ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            onClick={onImportTables}
            disabled={loadingTables}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {loadingTables ? 'Loading...' : 'Import Tables'}
          </button>
          <button
            onClick={onDeleteEnvironment}
            disabled={deletingEnvironment}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            {deletingEnvironment ? 'Deleting...' : 'Delete Environment'}
          </button>
        </div>
      </div>
    </div>
  );
}
