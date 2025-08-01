import { useState, useEffect } from 'react';

interface Column {
  name: string;
  type: string;
  nullable?: boolean;
  default?: string;
  description?: string;
  isImported?: boolean; // New property to track if column is already imported
}

interface TableInfo {
  name: string;
  schema?: string;
  description?: string;
  rowCount?: number;
  columns?: Column[];
  isImported?: boolean; // New property to track if table is already imported
}

interface ImportTablesModalProps {
  isOpen: boolean;
  availableTables: TableInfo[];
  selectedTables: string[];
  selectedColumns: Record<string, string[]>; // tableName -> column names
  importingTables: boolean;
  onClose: () => void;
  onImport: () => void;
  onSelectionChange: (tables: string[]) => void;
  onColumnSelectionChange: (tableName: string, columns: string[]) => void;
}

export default function ImportTablesModal({
  isOpen,
  availableTables,
  selectedTables,
  selectedColumns,
  importingTables,
  onClose,
  onImport,
  onSelectionChange,
  onColumnSelectionChange
}: ImportTablesModalProps) {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState<boolean>(false);
  
  // Initialize selection based on import status - pre-select imported tables and columns
  useEffect(() => {
    // Only initialize once when availableTables first loads and we haven't initialized yet
    if (availableTables.length > 0 && !initialized) {
      const importedTableNames: string[] = [];
      const importedColumnsByTable: Record<string, string[]> = {};
      
      availableTables.forEach(table => {
        // Pre-select table if it's imported
        if (table.isImported) {
          importedTableNames.push(table.name);
        }
        
        // Pre-select imported columns
        const importedColumns = table.columns?.filter(col => col.isImported).map(col => col.name) || [];
        importedColumnsByTable[table.name] = importedColumns;
        
        // Set column selection for this table
        onColumnSelectionChange(table.name, importedColumns);
      });
      
      // Set table selection to include imported tables
      if (importedTableNames.length > 0) {
        onSelectionChange(importedTableNames);
        
        // Auto-expand imported tables so users can see what columns are selected
        setExpandedTables(new Set(importedTableNames));
      }
      
      // Mark as initialized to prevent re-running
      setInitialized(true);
    }
  }, [availableTables, initialized]); // Remove the callback functions from dependencies
  
  // Reset initialization when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setInitialized(false);
    }
  }, [isOpen]);
  
  if (!isOpen) return null;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all tables
      onSelectionChange(availableTables.map(table => table.name));
      
      // Expand all tables
      setExpandedTables(new Set(availableTables.map(table => table.name)));
      
      // Select all columns for tables that don't have existing selections
      availableTables.forEach(table => {
        if (table.columns && (!selectedColumns[table.name] || selectedColumns[table.name].length === 0)) {
          onColumnSelectionChange(table.name, table.columns.map(col => col.name));
        }
      });
    } else {
      // Deselect all tables
      onSelectionChange([]);
      
      // Collapse all tables
      setExpandedTables(new Set());
      
      // Clear all column selections
      availableTables.forEach(table => {
        onColumnSelectionChange(table.name, []);
      });
    }
  };

  const handleTableToggle = (tableName: string, checked: boolean) => {
    if (checked) {
      // Select the table
      onSelectionChange([...selectedTables, tableName]);
      
      // Expand the table to show columns
      const newExpanded = new Set(expandedTables);
      newExpanded.add(tableName);
      setExpandedTables(newExpanded);
      
      // Select all columns for this table
      const table = availableTables.find(t => t.name === tableName);
      if (table?.columns) {
        onColumnSelectionChange(tableName, table.columns.map(col => col.name));
      }
    } else {
      // Deselect the table
      onSelectionChange(selectedTables.filter(name => name !== tableName));
      
      // Collapse the table
      const newExpanded = new Set(expandedTables);
      newExpanded.delete(tableName);
      setExpandedTables(newExpanded);
      
      // Clear column selection for this table
      onColumnSelectionChange(tableName, []);
    }
  };

  const toggleTableExpansion = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const handleColumnSelectAll = (tableName: string, checked: boolean) => {
    const table = availableTables.find(t => t.name === tableName);
    if (table?.columns) {
      if (checked) {
        onColumnSelectionChange(tableName, table.columns.map(col => col.name));
      } else {
        onColumnSelectionChange(tableName, []);
      }
    }
  };

  const handleColumnToggle = (tableName: string, columnName: string, checked: boolean) => {
    const currentColumns = selectedColumns[tableName] || [];
    if (checked) {
      onColumnSelectionChange(tableName, [...currentColumns, columnName]);
    } else {
      onColumnSelectionChange(tableName, currentColumns.filter(name => name !== columnName));
    }
  };

  const getSelectedColumnCount = (tableName: string): number => {
    return selectedColumns[tableName]?.length || 0;
  };

  const getTotalColumnCount = (tableName: string): number => {
    const table = availableTables.find(t => t.name === tableName);
    return table?.columns?.length || 0;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Import Tables</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Select tables to import from your database. Previously imported items are pre-selected and marked with badges.
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
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {availableTables.map((table) => (
                    <div key={table.name} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center p-3">
                        <input
                          type="checkbox"
                          id={table.name}
                          checked={selectedTables.includes(table.name)}
                          onChange={(e) => handleTableToggle(table.name, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <label htmlFor={table.name} className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {table.schema && `${table.schema}.`}{table.name}
                                </label>
                                {table.isImported && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    Imported
                                  </span>
                                )}
                              </div>
                              {table.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400">{table.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-1">
                                {table.rowCount && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {table.rowCount.toLocaleString()} rows
                                  </p>
                                )}
                                {table.columns && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {selectedTables.includes(table.name) 
                                      ? `${getSelectedColumnCount(table.name)}/${getTotalColumnCount(table.name)} columns selected`
                                      : `${getTotalColumnCount(table.name)} columns available`
                                    }
                                  </p>
                                )}
                              </div>
                            </div>
                            {table.columns && table.columns.length > 0 && selectedTables.includes(table.name) && (
                              <button
                                onClick={() => toggleTableExpansion(table.name)}
                                className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                type="button"
                              >
                                <svg 
                                  className={`w-4 h-4 transform transition-transform ${expandedTables.has(table.name) ? 'rotate-180' : ''}`}
                                  fill="none" 
                                  viewBox="0 0 24 24" 
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Column Selection */}
                      {expandedTables.has(table.name) && table.columns && table.columns.length > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-700/50">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              Select Columns
                            </h4>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id={`${table.name}-select-all-columns`}
                                checked={getSelectedColumnCount(table.name) === getTotalColumnCount(table.name)}
                                onChange={(e) => handleColumnSelectAll(table.name, e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label htmlFor={`${table.name}-select-all-columns`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                Select All Columns
                              </label>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                            {table.columns.map((column) => (
                              <div key={column.name} className={`flex items-center p-2 rounded border ${
                                column.isImported 
                                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
                                  : 'border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800'
                              }`}>
                                <input
                                  type="checkbox"
                                  id={`${table.name}-${column.name}`}
                                  checked={selectedColumns[table.name]?.includes(column.name) || false}
                                  onChange={(e) => handleColumnToggle(table.name, column.name, e.target.checked)}
                                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <div className="ml-2 flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <label htmlFor={`${table.name}-${column.name}`} className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                                      {column.name}
                                    </label>
                                    {column.isImported && (
                                      <span className="inline-flex items-center w-2 h-2 bg-green-500 rounded-full" title="Already imported">
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {column.type}{column.nullable ? ' (nullable)' : ''}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>{selectedTables.length} of {availableTables.length} tables selected</p>
            {selectedTables.length > 0 && (
              <p className="text-xs mt-1">
                {(() => {
                  const totalColumns = selectedTables.reduce((sum, tableName) => {
                    return sum + (selectedColumns[tableName]?.length || 0);
                  }, 0);
                  const importedTables = selectedTables.filter(tableName => {
                    const table = availableTables.find(t => t.name === tableName);
                    return table?.isImported;
                  }).length;
                  const newTables = selectedTables.length - importedTables;
                  
                  return (
                    <>
                      {totalColumns} columns selected
                      {importedTables > 0 && ` • ${importedTables} already imported`}
                      {newTables > 0 && ` • ${newTables} new table${newTables > 1 ? 's' : ''}`}
                    </>
                  );
                })()}
              </p>
            )}
          </div>
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
