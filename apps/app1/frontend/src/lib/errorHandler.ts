/**
 * Global error handler for chunk loading errors and other client-side errors
 */

export const setupGlobalErrorHandlers = () => {
  if (typeof window === 'undefined') return;

  // Handle unhandled promise rejections (including chunk loading errors)
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    // Check if it's a chunk loading error
    const isChunkLoadError = 
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Loading CSS chunk') ||
      error?.message?.includes('Loading JS chunk') ||
      error?.message?.includes('failed to fetch') ||
      error?.message?.includes('Failed to fetch');

    if (isChunkLoadError) {
      console.log('Chunk loading error detected in unhandled rejection, reloading page...');
      event.preventDefault(); // Prevent the error from being logged to console
      window.location.reload();
      return;
    }

    // Log other errors for debugging
    console.error('Unhandled promise rejection:', error);
  });

  // Handle general JavaScript errors
  window.addEventListener('error', (event) => {
    const error = event.error;
    
    // Check if it's a chunk loading error
    const isChunkLoadError = 
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Loading CSS chunk') ||
      error?.message?.includes('Loading JS chunk');

    if (isChunkLoadError) {
      console.log('Chunk loading error detected in error event, reloading page...');
      event.preventDefault(); // Prevent the error from being logged to console
      window.location.reload();
      return;
    }

    // Log other errors for debugging
    console.error('Global error:', error);
  });

  // Handle Next.js router errors specifically
  if (typeof window !== 'undefined' && window.next) {
    const originalError = console.error;
    console.error = (...args) => {
      const message = args[0];
      
      if (typeof message === 'string' && message.includes('Loading chunk')) {
        console.log('Next.js chunk loading error detected, reloading page...');
        window.location.reload();
        return;
      }
      
      // Call original console.error for other messages
      originalError.apply(console, args);
    };
  }
};

/**
 * Utility function to check if an error is a chunk loading error
 */
export const isChunkLoadError = (error: any): boolean => {
  if (!error) return false;
  
  return (
    error.name === 'ChunkLoadError' ||
    (typeof error.message === 'string' && (
      error.message.includes('Loading chunk') ||
      error.message.includes('Loading CSS chunk') ||
      error.message.includes('Loading JS chunk') ||
      error.message.includes('failed to fetch') ||
      error.message.includes('Failed to fetch')
    ))
  );
};

/**
 * Utility function to handle chunk loading errors gracefully
 */
export const handleChunkLoadError = (error: any) => {
  if (isChunkLoadError(error)) {
    console.log('Handling chunk loading error by reloading page...');
    window.location.reload();
    return true;
  }
  return false;
};
