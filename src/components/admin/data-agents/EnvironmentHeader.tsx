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
      {environment.status === 'UNKNOWN' && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 3.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 3.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Connection status is unknown. Test the connection to verify your database credentials.
              </p>
            </div>
          </div>
        </div>
      )}
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
