import { useState, useEffect } from 'react';
import { Table, Column } from './types';

interface EditTableModalProps {
  isOpen: boolean;
  table: Table | null;
  onClose: () => void;
  onSave: (tableId: string, updates: any) => void;
  onDeleteColumn?: (tableId: string, columnId: string) => void;
  saving?: boolean;
}

export default function EditTableModal({
  isOpen,
  table,
  onClose,
  onSave,
  onDeleteColumn,
  saving = false
}: EditTableModalProps) {
  const [formData, setFormData] = useState({
    tableName: '',
    description: '',
    analysisResult: null as any,
    columns: [] as Column[]
  });
  const [editingTableAnalysis, setEditingTableAnalysis] = useState(false);
  const [tableAnalysisText, setTableAnalysisText] = useState('');

  useEffect(() => {
    if (table) {
      setFormData({
        tableName: table.tableName || '',
        description: table.description || '',
        analysisResult: table.analysisResult || null,
        columns: table.columns || []
      });
      setTableAnalysisText(table.analysisResult?.summary || '');
    }
  }, [table]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!table) return;
    
    const updates = {
      description: formData.description,
      analysisResult: editingTableAnalysis 
        ? { ...formData.analysisResult, summary: tableAnalysisText }
        : formData.analysisResult,
      columns: formData.columns
    };
    
    onSave(table.id, updates);
  };

  const handleColumnDescriptionChange = (columnId: string, description: string) => {
    setFormData(prev => ({
      ...prev,
      columns: prev.columns.map(col => 
        col.id === columnId ? { ...col, aiDescription: description } : col
      )
    }));
  };

  const handleDeleteColumn = (columnId: string) => {
    if (onDeleteColumn && table) {
      onDeleteColumn(table.id, columnId);
      // Also remove from local state
      setFormData(prev => ({
        ...prev,
        columns: prev.columns.filter(col => col.id !== columnId)
      }));
    }
  };

  const saveTableAnalysis = () => {
    setEditingTableAnalysis(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Edit Table: {table?.tableName}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {table?.schemaName && `${table.schemaName}.`}{table?.tableName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Table Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Table Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Enter a description for this table..."
              />
            </div>

            {/* Table Analysis Overview */}
            {(formData.analysisResult?.summary || editingTableAnalysis) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Table Analysis Overview
                  </label>
                  {!editingTableAnalysis ? (
                    <button
                      onClick={() => setEditingTableAnalysis(true)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={saveTableAnalysis}
                        className="text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingTableAnalysis(false);
                          setTableAnalysisText(formData.analysisResult?.summary || '');
                        }}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                {editingTableAnalysis ? (
                  <textarea
                    rows={6}
                    value={tableAnalysisText}
                    onChange={(e) => setTableAnalysisText(e.target.value)}
                    className="block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="Enter analysis overview for this table..."
                  />
                ) : (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <p className="text-blue-800 dark:text-blue-200 whitespace-pre-wrap text-sm">
                      {formData.analysisResult?.summary || 'No analysis available'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Columns */}
            {formData.columns && formData.columns.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Columns ({formData.columns.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Column Name
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Data Type
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Constraints
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Description & Analysis
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {formData.columns.map((column) => (
                        <tr key={column.id}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {column.columnName}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                            {column.dataType}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <div className="flex flex-wrap gap-1">
                              {column.isPrimaryKey && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                                  PK
                                </span>
                              )}
                              {!column.isNullable && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200">
                                  NOT NULL
                                </span>
                              )}
                              {column.isNullable && !column.isPrimaryKey && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200">
                                  NULLABLE
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <div className="space-y-2">
                              {/* Combined Description and AI Analysis */}
                              <textarea
                                rows={3}
                                value={(() => {
                                  const aiDesc = column.aiDescription;
                                  const comment = column.comment;
                                  
                                  // Try to parse AI description if it's JSON
                                  let aiPurpose = '';
                                  try {
                                    if (aiDesc && aiDesc.startsWith('{')) {
                                      const parsed = JSON.parse(aiDesc);
                                      aiPurpose = parsed.purpose || aiDesc;
                                    } else {
                                      aiPurpose = aiDesc || '';
                                    }
                                  } catch {
                                    aiPurpose = aiDesc || '';
                                  }
                                  
                                  // Combine both descriptions
                                  const combined = [comment, aiPurpose].filter(Boolean).join('\n\n');
                                  return combined;
                                })()}
                                onChange={(e) => handleColumnDescriptionChange(column.id, e.target.value)}
                                className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 text-xs"
                                placeholder="Add description and analysis..."
                              />
                              {/* Show sample values if available */}
                              {column.sampleValues && column.sampleValues.length > 0 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  <span className="font-medium">Samples:</span> {column.sampleValues.slice(0, 3).join(', ')}
                                  {column.sampleValues.length > 3 && ` +${column.sampleValues.length - 3} more`}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <button
                              onClick={() => handleDeleteColumn(column.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs"
                              title="Delete Column"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
