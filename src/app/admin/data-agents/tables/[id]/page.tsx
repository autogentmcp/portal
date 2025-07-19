"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import AdminLayout from "@/components/admin/admin-layout";

interface TableDetail {
  id: string;
  tableName: string;
  description?: string;
  analysisStatus: 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  analysisResult?: {
    summary: string;
    analyzedAt: string;
    usage?: any;
  };
  dataAgent: {
    id: string;
    name: string;
  };
  columns: Column[];
}

interface Column {
  id: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  comment?: string;
  aiDescription?: string;
  sampleValues?: string[];
}

export default function TableDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [table, setTable] = useState<TableDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldDescriptions, setFieldDescriptions] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchTableDetail();
  }, [params.id]);

  const fetchTableDetail = async () => {
    try {
      const response = await fetch(`/api/admin/data-agents/tables/${params.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch table details");
      }
      const data = await response.json();
      setTable(data);
      
      // Initialize field descriptions
      const descriptions: Record<string, string> = {};
      data.columns.forEach((field: Column) => {
        descriptions[field.id] = field.comment || field.aiDescription || '';
      });
      setFieldDescriptions(descriptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch table details");
    } finally {
      setLoading(false);
    }
  };

  const startAnalysis = async () => {
    try {
      await fetch(`/api/admin/data-agents/tables/${params.id}/analyze`, {
        method: 'POST'
      });
      fetchTableDetail(); // Refresh to show analysis status
    } catch (err) {
      console.error('Failed to start analysis:', err);
    }
  };

  const updateFieldDescription = async (fieldId: string, description: string) => {
    try {
      await fetch(`/api/admin/data-agents/tables/columns/${fieldId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      setEditingField(null);
      fetchTableDetail();
    } catch (err) {
      console.error('Failed to update field description:', err);
    }
  };

  const deleteTable = async () => {
    if (!table) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/data-agents/tables/${params.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Navigate back to the data agent page
        router.push(`/admin/data-agents/${table.dataAgent.id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete table');
      }
    } catch (err) {
      console.error('Failed to delete table:', err);
      setError('Failed to delete table');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'ANALYZING': 'bg-blue-100 text-blue-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'FAILED': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <AdminLayout title="Table Details">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !table) {
    return (
      <AdminLayout title="Table Details">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error || "Table not found."}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`Table: ${table.tableName}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/admin/data-agents/${table.dataAgent.id}`)}
            className="text-blue-600 hover:text-blue-900 mb-4 flex items-center"
          >
            ← Back to {table.dataAgent.name}
          </button>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{table.tableName}</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{table.description}</p>
                
                <div className="flex gap-3 mb-4">
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(table.analysisStatus)}`}>
                    {table.analysisStatus}
                  </span>
                  <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                    {table.columns.length} Fields
                  </span>
                </div>
                
                {table.analysisResult?.analyzedAt && (
                  <p className="text-sm text-gray-500">
                    Last analyzed: {new Date(table.analysisResult.analyzedAt).toLocaleString()}
                  </p>
                )}
              </div>
              
              <div className="flex gap-3">
                {table.analysisStatus === 'PENDING' && (
                  <button
                    onClick={startAnalysis}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Start Analysis
                  </button>
                )}
                {table.analysisStatus === 'FAILED' && (
                  <button
                    onClick={startAnalysis}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                  >
                    Retry Analysis
                  </button>
                )}
                {table.analysisStatus === 'ANALYZING' && (
                  <div className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-md">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Analyzing...
                  </div>
                )}
                
                {/* Delete Button */}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting...' : 'Delete Table'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* LLM Summary */}
        {table.analysisResult?.summary && (
          <div className="mb-8">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold mb-3 text-blue-900 dark:text-blue-100">AI Analysis Summary</h3>
              <p className="text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{table.analysisResult.summary}</p>
            </div>
          </div>
        )}

        {/* Fields Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Table Fields</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Field Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Properties</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">AI Analysis</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sample Values</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {table.columns.map((field: Column) => (
                  <tr key={field.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{field.columnName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{field.dataType}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1">
                        {field.isPrimaryKey && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">PK</span>
                        )}
                        {field.isForeignKey && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200">FK</span>
                        )}
                        {field.isNullable && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">NULL</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingField === field.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={fieldDescriptions[field.id] || ''}
                            onChange={(e) => setFieldDescriptions({
                              ...fieldDescriptions,
                              [field.id]: e.target.value
                            })}
                            className="flex-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1"
                            placeholder="Add description..."
                          />
                          <button
                            onClick={() => updateFieldDescription(field.id, fieldDescriptions[field.id])}
                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingField(null)}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {field.comment || field.aiDescription || (
                            <span className="text-gray-400 dark:text-gray-500 italic">No description</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                        {field.aiDescription ? (
                          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded text-green-800 dark:text-green-200">
                            {field.aiDescription}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 italic">Not analyzed</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {field.sampleValues && field.sampleValues.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {field.sampleValues.slice(0, 3).map((value, idx) => (
                              <span key={idx} className="inline-flex px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded">
                                {value}
                              </span>
                            ))}
                            {field.sampleValues.length > 3 && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">+{field.sampleValues.length - 3} more</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 italic">No samples</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingField !== field.id && (
                        <button
                          onClick={() => setEditingField(field.id)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-full p-4 text-center">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDeleteConfirm(false)}></div>
            
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">Delete Table</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to delete the table <strong>{table?.tableName}</strong>? This action will:
                      </p>
                      <ul className="mt-2 text-sm text-gray-500 dark:text-gray-400 list-disc list-inside">
                        <li>Remove the table and all its columns</li>
                        <li>Delete all relationships involving this table</li>
                        <li>Clear relationship analysis (requiring re-analysis)</li>
                        <li>This action cannot be undone</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={deleteTable}
                  disabled={deleting}
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-600 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
