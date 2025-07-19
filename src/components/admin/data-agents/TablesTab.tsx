import { Environment } from './types';

interface TablesTabProps {
  environment: Environment;
  onImportTables: () => void;
  loadingTables: boolean;
  onAnalyzeTable?: (tableId: string) => void;
  onViewEditTable?: (tableId: string) => void;
  analyzingTableId?: string | null;
}

export default function TablesTab({
  environment,
  onImportTables,
  loadingTables,
  onAnalyzeTable,
  onViewEditTable,
  analyzingTableId
}: TablesTabProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Tables</h3>
        <button
          onClick={onImportTables}
          disabled={loadingTables}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loadingTables ? 'Loading...' : 'Import More Tables'}
        </button>
      </div>
      
      {environment.dataAgentTables && environment.dataAgentTables.length > 0 ? (
        <div className="grid gap-4">
          {environment.dataAgentTables.map((table) => (
            <div key={table.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {table.schemaName && `${table.schemaName}.`}{table.tableName}
                  </h4>
                  {table.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{table.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {table.rowCount && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {table.rowCount.toLocaleString()} rows
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      table.analysisStatus === 'COMPLETED' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                        : table.analysisStatus === 'ANALYZING'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
                    }`}>
                      {table.analysisStatus}
                    </span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {onViewEditTable && (
                    <button
                      onClick={() => onViewEditTable(table.id)}
                      className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-800"
                    >
                      View/Edit
                    </button>
                  )}
                  {onAnalyzeTable && (
                    <button
                      onClick={() => onAnalyzeTable(table.id)}
                      disabled={analyzingTableId === table.id}
                      className="px-3 py-1 text-xs font-medium text-purple-700 bg-purple-100 border border-purple-300 rounded-md hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-600 dark:hover:bg-purple-800"
                    >
                      {analyzingTableId === table.id 
                        ? 'Analyzing...' 
                        : table.analysisStatus === 'COMPLETED' 
                        ? 'Re-analyze' 
                        : 'Analyze'
                      }
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No tables imported yet.</p>
          <button
            onClick={onImportTables}
            disabled={loadingTables}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loadingTables ? 'Loading...' : 'Import Tables'}
          </button>
        </div>
      )}
    </div>
  );
}
