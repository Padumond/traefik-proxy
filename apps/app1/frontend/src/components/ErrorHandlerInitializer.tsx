"use client";

import { useEffect } from 'react';
import { setupGlobalErrorHandlers } from '@/lib/errorHandler';

/**
 * Component to initialize global error handlers on the client side
 */
export const ErrorHandlerInitializer = () => {
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      setupGlobalErrorHandlers();
      console.log('Global error handlers initialized');
    }
  }, []);

  // This component doesn't render anything
  return null;
};
