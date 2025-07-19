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
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{table.tableName}</h1>
                <p className="text-gray-600 mb-4">{table.description}</p>
                
                <div className="flex gap-3 mb-4">
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(table.analysisStatus)}`}>
                    {table.analysisStatus}
                  </span>
                  <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800">
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
              </div>
            </div>
          </div>
        </div>

        {/* LLM Summary */}
        {table.analysisResult?.summary && (
          <div className="mb-8">
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3 text-blue-900">AI Analysis Summary</h3>
              <p className="text-blue-800">{table.analysisResult.summary}</p>
            </div>
          </div>
        )}

        {/* Fields Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Table Fields</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Properties</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Analysis</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sample Values</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {table.columns.map((field: Column) => (
                  <tr key={field.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">{field.columnName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{field.dataType}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1">
                        {field.isPrimaryKey && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">PK</span>
                        )}
                        {field.isForeignKey && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded bg-purple-100 text-purple-800">FK</span>
                        )}
                        {field.isNullable && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">NULL</span>
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
                            className="flex-1 text-sm border rounded px-2 py-1"
                            placeholder="Add description..."
                          />
                          <button
                            onClick={() => updateFieldDescription(field.id, fieldDescriptions[field.id])}
                            className="text-green-600 hover:text-green-800 text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingField(null)}
                            className="text-gray-600 hover:text-gray-800 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-900">
                          {field.comment || field.aiDescription || (
                            <span className="text-gray-400 italic">No description</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs">
                        {field.aiDescription ? (
                          <div className="bg-green-50 p-2 rounded text-green-800">
                            {field.aiDescription}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Not analyzed</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {field.sampleValues && field.sampleValues.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {field.sampleValues.slice(0, 3).map((value, idx) => (
                              <span key={idx} className="inline-flex px-2 py-1 text-xs bg-gray-100 rounded">
                                {value}
                              </span>
                            ))}
                            {field.sampleValues.length > 3 && (
                              <span className="text-xs text-gray-400">+{field.sampleValues.length - 3} more</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No samples</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingField !== field.id && (
                        <button
                          onClick={() => setEditingField(field.id)}
                          className="text-blue-600 hover:text-blue-900"
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
    </AdminLayout>
  );
}
