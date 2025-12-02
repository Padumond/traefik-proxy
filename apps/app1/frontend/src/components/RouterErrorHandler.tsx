"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { handleChunkLoadError } from '@/lib/errorHandler';

/**
 * Component to handle router-specific errors, especially chunk loading errors
 */
export const RouterErrorHandler = () => {
  const router = useRouter();

  useEffect(() => {
    // Override the router.push method to handle chunk loading errors
    const originalPush = router.push;
    const originalReplace = router.replace;

    // Wrap router.push with error handling
    router.push = async (href: string, options?: any) => {
      try {
        return await originalPush.call(router, href, options);
      } catch (error) {
        if (handleChunkLoadError(error)) {
          return; // Page will reload, no need to continue
        }
        throw error; // Re-throw if it's not a chunk loading error
      }
    };

    // Wrap router.replace with error handling
    router.replace = async (href: string, options?: any) => {
      try {
        return await originalReplace.call(router, href, options);
      } catch (error) {
        if (handleChunkLoadError(error)) {
          return; // Page will reload, no need to continue
        }
        throw error; // Re-throw if it's not a chunk loading error
      }
    };

    // Cleanup function to restore original methods
    return () => {
      router.push = originalPush;
      router.replace = originalReplace;
    };
  }, [router]);

  // This component doesn't render anything
  return null;
};
