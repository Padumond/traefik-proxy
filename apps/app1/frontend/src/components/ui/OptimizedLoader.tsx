import React, { memo } from 'react';

// Optimized skeleton loader with minimal re-renders
export const SkeletonLoader = memo(({ 
  className = '', 
  count = 1,
  height = 'h-4',
  width = 'w-full'
}: {
  className?: string;
  count?: number;
  height?: string;
  width?: string;
}) => (
  <div className={`animate-pulse ${className}`}>
    {Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        className={`bg-gray-200 rounded ${height} ${width} ${i > 0 ? 'mt-2' : ''}`}
      />
    ))}
  </div>
));

SkeletonLoader.displayName = 'SkeletonLoader';

// Optimized table skeleton
export const TableSkeleton = memo(({ 
  rows = 5, 
  columns = 4 
}: { 
  rows?: number; 
  columns?: number; 
}) => (
  <div className="animate-pulse">
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columns }, (_, i) => (
              <th key={i} className="px-6 py-3">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }, (_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
));

TableSkeleton.displayName = 'TableSkeleton';

// Optimized card skeleton
export const CardSkeleton = memo(({ count = 1 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="animate-pulse">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    ))}
  </div>
));

CardSkeleton.displayName = 'CardSkeleton';

// Optimized dashboard skeleton
export const DashboardSkeleton = memo(() => (
  <div className="space-y-6 animate-pulse">
    {/* Header */}
    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
    
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        </div>
      ))}
    </div>
    
    {/* Chart */}
    <div className="bg-white rounded-lg shadow p-6">
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
    </div>
  </div>
));

DashboardSkeleton.displayName = 'DashboardSkeleton';

// Optimized spinner with minimal animation
export const OptimizedSpinner = memo(({ 
  size = 'w-6 h-6',
  className = ''
}: {
  size?: string;
  className?: string;
}) => (
  <div className={`${size} ${className}`}>
    <div className="animate-spin rounded-full border-2 border-gray-300 border-t-primary-600 h-full w-full"></div>
  </div>
));

OptimizedSpinner.displayName = 'OptimizedSpinner';

// Page loading overlay
export const PageLoader = memo(() => (
  <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
    <div className="text-center">
      <OptimizedSpinner size="w-12 h-12" className="mx-auto mb-4" />
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
));

PageLoader.displayName = 'PageLoader';
