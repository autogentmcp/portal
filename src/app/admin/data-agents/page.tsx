'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/admin-layout'

interface DataAgent {
  id: string
  name: string
  description?: string
  connectionType: string
  status: string
  lastConnectedAt?: string
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
  _count: {
    tables: number
    relations: number
  }
}

export default function DataAgentsPage() {
  const [dataAgents, setDataAgents] = useState<DataAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchDataAgents()
  }, [])

  const fetchDataAgents = async () => {
    try {
      const response = await fetch('/api/admin/data-agents')
      if (!response.ok) {
        throw new Error('Failed to fetch data agents')
      }
      const data = await response.json()
      setDataAgents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data agents')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900'
      case 'INACTIVE':
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800'
      case 'CONNECTING':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900'
      case 'ERROR':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900'
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800'
    }
  }

  const getConnectionTypeDisplay = (type: string) => {
    const types: { [key: string]: string } = {
      'postgres': 'PostgreSQL',
      'postgresql': 'PostgreSQL',
      'mysql': 'MySQL',
      'bigquery': 'Google BigQuery',
      'databricks': 'Databricks',
      'sqlite': 'SQLite'
    }
    return types[type.toLowerCase()] || type
  }

  if (loading) {
    return (
      <AdminLayout title="Data Agents">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Data Agents">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Data Agents</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Connect and manage your data sources
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/data-agents/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Add Data Agent
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {dataAgents.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V7c0-2.21-1.79-4-4-4H8c-2.21 0-4 1.79-4 4z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No data agents</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by creating your first data agent</p>
          <button
            onClick={() => router.push('/admin/data-agents/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Add Data Agent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dataAgents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex flex-col justify-between hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <a
                    href={`/admin/data-agents/${agent.id}`}
                    className="text-lg font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {agent.name}
                  </a>
                  <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(agent.status)}`}>{agent.status}</span>
                </div>
                {agent.description && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{agent.description}</div>
                )}
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                    {getConnectionTypeDisplay(agent.connectionType)}
                  </span>
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                    {agent._count.tables} tables
                  </span>
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                    Last Connected: {agent.lastConnectedAt ? new Date(agent.lastConnectedAt).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => router.push(`/admin/data-agents/${agent.id}`)}
                  className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-semibold"
                >
                  View
                </button>
                <button
                  onClick={() => router.push(`/admin/data-agents/${agent.id}/edit`)}
                  className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/50 text-xs font-semibold"
                >
                  Edit
                </button>
                <button
                  onClick={() => alert('Delete not implemented yet.')}
                  className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/50 text-xs font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </AdminLayout>
  )
}
