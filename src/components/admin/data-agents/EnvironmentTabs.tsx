import { Environment, ENVIRONMENT_TYPES } from './types';

interface EnvironmentTabsProps {
  environments: Environment[];
  activeEnvironmentId: string | null;
  onEnvironmentChange: (environmentId: string) => void;
}

export default function EnvironmentTabs({
  environments,
  activeEnvironmentId,
  onEnvironmentChange
}: EnvironmentTabsProps) {
  if (!environments || environments.length === 0) {
    return null;
  }

  const getEnvironmentLabel = (environment: Environment) => {
    // First try to get the label from ENVIRONMENT_TYPES using environment.name (which contains the type)
    const envTypeConfig = ENVIRONMENT_TYPES.find(t => t.value === environment.name);
    if (envTypeConfig) {
      return envTypeConfig.label;
    }
    // Fallback to environment name
    return environment.name || 'Environment';
  };

  const getEnvironmentIcon = (envType: string) => {
    switch (envType) {
      case 'production':
        return '🚀';
      case 'staging':
        return '🧪';
      case 'development':
        return '⚡';
      default:
        return '📁';
    }
  };

  return (
    <div className="px-6">
      <nav className="flex space-x-8" aria-label="Tabs">
        {environments.map((environment) => (
          <button
            key={environment.id}
            onClick={() => onEnvironmentChange(environment.id)}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeEnvironmentId === environment.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{getEnvironmentIcon(environment.name)}</span>
              <span>{getEnvironmentLabel(environment)}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                environment.status === 'ACTIVE' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                  : environment.status === 'UNKNOWN'
                  ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
              }`}>
                {environment.status === 'UNKNOWN' ? 'UNTESTED' : environment.status}
              </span>
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
}
