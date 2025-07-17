'use client'

import React from 'react';

interface HealthStatusBadgeProps {
  status: string;
  className?: string;
}

const HealthStatusBadge: React.FC<HealthStatusBadgeProps> = ({ status, className = '' }) => {
  const getBadgeStyles = (status: string) => {
    switch(status.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'DEGRADED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'INACTIVE':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'SUCCESS':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'FAILURE':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'ERROR':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeStyles(status)} ${className}`}>
      {status.toUpperCase()}
    </span>
  );
};

export default HealthStatusBadge;
