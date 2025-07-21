'use client'

interface ApplicationTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
  counts: {
    environments: number
    apiKeys: number
    endpoints: number
  }
}

export default function ApplicationTabs({ activeTab, onTabChange, counts }: ApplicationTabsProps) {
  const tabs = [
    { id: 'overview', name: 'Overview', count: null },
    { id: 'environments', name: 'Environments', count: counts.environments },
    { id: 'apiKeys', name: 'API Keys', count: counts.apiKeys },
    { id: 'endpoints', name: 'Endpoints', count: counts.endpoints },
    { id: 'settings', name: 'Settings', count: null },
  ]

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <span>{tab.name}</span>
              {tab.count !== null && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
