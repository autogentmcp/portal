interface NoEnvironmentStateProps {
  onCreateEnvironment: () => void;
}

export default function NoEnvironmentState({ onCreateEnvironment }: NoEnvironmentStateProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="px-6 py-12 text-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Environments</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Create your first environment to start importing tables and managing database connections.
        </p>
        <button
          onClick={onCreateEnvironment}
          className="px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Create Environment
        </button>
      </div>
    </div>
  );
}
