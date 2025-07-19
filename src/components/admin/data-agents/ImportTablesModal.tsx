interface ImportTablesModalProps {
  isOpen: boolean;
  availableTables: any[];
  selectedTables: string[];
  importingTables: boolean;
  onClose: () => void;
  onImport: () => void;
  onSelectionChange: (tables: string[]) => void;
}

export default function ImportTablesModal({
  isOpen,
  availableTables,
  selectedTables,
  importingTables,
  onClose,
  onImport,
  onSelectionChange
}: ImportTablesModalProps) {
  if (!isOpen) return null;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(availableTables.map(table => table.name));
    } else {
      onSelectionChange([]);
    }
  };

  const handleTableToggle = (tableName: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedTables, tableName]);
    } else {
      onSelectionChange(selectedTables.filter(name => name !== tableName));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Import Tables</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Select tables to import from your database
          </p>
        </div>
        
        <div className="px-6 py-4">
          {availableTables.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="selectAll"
                  checked={selectedTables.length === availableTables.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="selectAll" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  Select All ({availableTables.length} tables)
                </label>
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="grid gap-2 max-h-96 overflow-y-auto">
                  {availableTables.map((table) => (
                    <div key={table.name} className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <input
                        type="checkbox"
                        id={table.name}
                        checked={selectedTables.includes(table.name)}
                        onChange={(e) => handleTableToggle(table.name, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <label htmlFor={table.name} className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {table.schema && `${table.schema}.`}{table.name}
                        </label>
                        {table.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">{table.description}</p>
                        )}
                        {table.rowCount && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {table.rowCount.toLocaleString()} rows
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No tables available for import</p>
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {selectedTables.length} of {availableTables.length} tables selected
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={onImport}
              disabled={selectedTables.length === 0 || importingTables}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importingTables ? 'Importing...' : `Import ${selectedTables.length} Tables`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
