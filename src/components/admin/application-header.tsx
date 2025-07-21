'use client'

import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

interface ApplicationHeaderProps {
  application: {
    id: string
    name: string
    description?: string
    status: string
    appKey: string
    createdAt: string
    user: {
      name?: string
      email: string
    }
  }
  onEdit: () => void
  onDelete: () => void
}

export default function ApplicationHeader({ application, onEdit, onDelete }: ApplicationHeaderProps) {
  const router = useRouter()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {application.name}
                </h1>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                  {application.status}
                </span>
              </div>
              {application.description && (
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {application.description}
                </p>
              )}
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span>App Key: <code className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{application.appKey}</code></span>
                <span>Created: {new Date(application.createdAt).toLocaleDateString()}</span>
                <span>Owner: {application.user.name || application.user.email}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onEdit}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Edit Application
            </button>
            <button
              onClick={onDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
