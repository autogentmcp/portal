'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import ThemeToggle from '@/components/common/theme-toggle'

interface AdminLayoutProps {
  children: React.ReactNode
  title?: string
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      })

      if (!response.ok) {
        router.push('/admin')
        return
      }

      const userData = await response.json()
      if (userData.role !== 'ADMIN') {
        router.push('/admin')
        return
      }

      setUser(userData)
    } catch (error) {
      router.push('/admin')
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      router.push('/admin')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const getNavItemClass = (path: string) => {
    const isActive = pathname === path || pathname.startsWith(path + '/')
    return isActive
      ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 pb-2 px-1 text-sm font-medium"
      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 pb-2 px-1 text-sm font-medium"
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {title || 'Admin Portal'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Welcome back, {user.name || user.email}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <button
                onClick={logout}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Logout
              </button>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="border-t border-gray-200 dark:border-gray-700">
            <div className="flex space-x-8 py-4">
              <a
                href="/admin/dashboard"
                className={getNavItemClass('/admin/dashboard')}
              >
                Dashboard
              </a>
              <a
                href="/admin/applications"
                className={getNavItemClass('/admin/applications')}
              >
                Applications
              </a>
              <a
                href="/admin/data-agents"
                className={getNavItemClass('/admin/data-agents')}
              >
                Data Agents
              </a>
              <a
                href="/admin/settings"
                className={getNavItemClass('/admin/settings')}
              >
                Settings
              </a>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © 2025 AutoGent Portal. All rights reserved.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                Documentation
              </a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
