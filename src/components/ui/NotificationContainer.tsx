import { useNotifications } from './NotificationContext';
import { Fragment, useEffect } from 'react';

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotifications();

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    notifications.forEach(notification => {
      const timer = setTimeout(() => {
        removeNotification(notification.id);
      }, 5000);
      
      return () => clearTimeout(timer);
    });
  }, [notifications, removeNotification]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return (
          <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 dark:bg-green-800';
      case 'error':
        return 'bg-red-100 dark:bg-red-800';
      case 'warning':
        return 'bg-orange-100 dark:bg-orange-800';
      case 'info':
        return 'bg-blue-100 dark:bg-blue-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-300 dark:border-green-600';
      case 'error':
        return 'border-red-300 dark:border-red-600';
      case 'warning':
        return 'border-orange-300 dark:border-orange-600';
      case 'info':
        return 'border-blue-300 dark:border-blue-600';
      default:
        return 'border-gray-300 dark:border-gray-600';
    }
  };

  const getTextColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-800 dark:text-green-100';
      case 'error':
        return 'text-red-800 dark:text-red-100';
      case 'warning':
        return 'text-orange-800 dark:text-orange-100';
      case 'info':
        return 'text-blue-800 dark:text-blue-100';
      default:
        return 'text-gray-800 dark:text-gray-100';
    }
  };

  const getSecondaryTextColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-700 dark:text-green-200';
      case 'error':
        return 'text-red-700 dark:text-red-200';
      case 'warning':
        return 'text-orange-700 dark:text-orange-200';
      case 'info':
        return 'text-blue-700 dark:text-blue-200';
      default:
        return 'text-gray-700 dark:text-gray-200';
    }
  };

  const getCloseButtonColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-600 hover:text-green-800 dark:text-green-300 dark:hover:text-green-100 hover:bg-green-200 dark:hover:bg-green-700';
      case 'error':
        return 'text-red-600 hover:text-red-800 dark:text-red-300 dark:hover:text-red-100 hover:bg-red-200 dark:hover:bg-red-700';
      case 'warning':
        return 'text-orange-600 hover:text-orange-800 dark:text-orange-300 dark:hover:text-orange-100 hover:bg-orange-200 dark:hover:bg-orange-700';
      case 'info':
        return 'text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-700';
      default:
        return 'text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-3">
      {notifications.map((notification) => {
        // Calculate dynamic width based on message length
        const messageLength = (notification.title?.length || 0) + (notification.message?.length || 0);
        const dynamicWidth = Math.min(Math.max(messageLength * 8 + 120, 280), 500); // Min 280px, Max 500px
        
        return (
          <div
            key={notification.id}
            className={`${getBackgroundColor(notification.type)} border ${getBorderColor(notification.type)} rounded-xl shadow-2xl p-4 transform transition-all duration-300 ease-in-out animate-in slide-in-from-right-2 fade-in`}
            style={{
              width: `${dynamicWidth}px`,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            }}
          >
          <div className="flex">
            <div className="flex-shrink-0">
              {getIcon(notification.type)}
            </div>
            <div className="ml-3 w-0 flex-1">
              <p className={`text-sm font-semibold ${getTextColor(notification.type)}`}>
                {notification.title}
              </p>
              {notification.message && (
                <p className={`mt-1 text-sm ${getSecondaryTextColor(notification.type)}`}>
                  {notification.message}
                </p>
              )}
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={() => removeNotification(notification.id)}
                className={`bg-transparent rounded-md inline-flex p-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${getCloseButtonColor(notification.type)}`}
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          {/* Auto-dismiss progress bar */}
          <div className={`mt-2 w-full rounded-full h-1 ${
            notification.type === 'success' ? 'bg-green-200 dark:bg-green-700' :
            notification.type === 'error' ? 'bg-red-200 dark:bg-red-700' :
            notification.type === 'warning' ? 'bg-orange-200 dark:bg-orange-700' :
            'bg-blue-200 dark:bg-blue-700'
          }`}>
            <div 
              className={`h-1 rounded-full ${
                notification.type === 'success' ? 'bg-green-600' :
                notification.type === 'error' ? 'bg-red-600' :
                notification.type === 'warning' ? 'bg-orange-600' :
                'bg-blue-600'
              }`}
              style={{
                width: '100%',
                animation: 'shrink 5s linear forwards'
              }}
            ></div>
          </div>
          </div>
        );
      })}
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default NotificationContainer;
