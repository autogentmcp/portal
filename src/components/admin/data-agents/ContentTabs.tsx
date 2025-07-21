interface ContentTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs?: { id: string; name: string }[];
}

const DEFAULT_TABS = [
  { id: 'overview', name: 'Overview' },
  { id: 'tables', name: 'Tables' },
  { id: 'relationships', name: 'Relationships' }
];

export default function ContentTabs({
  activeTab,
  onTabChange,
  tabs = DEFAULT_TABS
}: ContentTabsProps) {
  return (
    <div className="px-6">
      <nav className="flex space-x-8" aria-label="Content tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </nav>
    </div>
  );
}
