"use client";

import { useAsyncWithLoading, useLoading } from "@/contexts/LoadingContext";
import { useCallback } from "react";
import { toast } from "sonner";

// Hook for common loading patterns
export function useLoadingStates() {
  const { showLoading, hideLoading, updateProgress, setLoadingMessage } = useLoading();
  const { executeWithLoading, executeWithProgress } = useAsyncWithLoading();

  // Contact operations
  const withContactLoading = useCallback(
    async <T>(operation: () => Promise<T>, action: string): Promise<T> => {
      return executeWithLoading(operation, {
        message: `${action} contact...`,
        type: "action",
      });
    },
    [executeWithLoading]
  );

  // CSV Import with progress
  const withCsvImportLoading = useCallback(
    async <T>(
      operation: (updateProgress: (progress: number) => void) => Promise<T>
    ): Promise<T> => {
      return executeWithProgress(operation, {
        message: "Importing contacts...",
        type: "upload",
      });
    },
    [executeWithProgress]
  );

  // Page transition loading
  const withPageLoading = useCallback(
    async <T>(operation: () => Promise<T>, pageName?: string): Promise<T> => {
      return executeWithLoading(operation, {
        message: pageName ? `Loading ${pageName}...` : "Loading page...",
        type: "page",
      });
    },
    [executeWithLoading]
  );

  // Generic async operation with error handling
  const withErrorHandling = useCallback(
    async <T>(
      operation: () => Promise<T>,
      options: {
        loadingMessage?: string;
        successMessage?: string;
        errorMessage?: string;
        type?: "default" | "page" | "action" | "upload";
      } = {}
    ): Promise<T | null> => {
      try {
        const result = await executeWithLoading(operation, {
          message: options.loadingMessage || "Processing...",
          type: options.type || "action",
        });

        if (options.successMessage) {
          toast.success(options.successMessage);
        }

        return result;
      } catch (error: any) {
        const errorMsg = options.errorMessage || error.message || "An error occurred";
        toast.error(errorMsg);
        console.error("Operation failed:", error);
        return null;
      }
    },
    [executeWithLoading]
  );

  // Batch operations with progress
  const withBatchLoading = useCallback(
    async <T>(
      items: T[],
      operation: (item: T, index: number) => Promise<void>,
      options: {
        message?: string;
        batchSize?: number;
      } = {}
    ): Promise<void> => {
      const { message = "Processing items...", batchSize = 10 } = options;

      await executeWithProgress(
        async (updateProgress) => {
          const total = items.length;
          let completed = 0;

          for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            
            await Promise.all(
              batch.map(async (item, batchIndex) => {
                await operation(item, i + batchIndex);
                completed++;
                updateProgress((completed / total) * 100);
              })
            );

            // Small delay between batches to prevent overwhelming the server
            if (i + batchSize < items.length) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        },
        {
          message,
          type: "upload",
        }
      );
    },
    [executeWithProgress]
  );

  return {
    // Basic loading controls
    showLoading,
    hideLoading,
    updateProgress,
    setLoadingMessage,

    // Specialized loading patterns
    withContactLoading,
    withCsvImportLoading,
    withPageLoading,
    withErrorHandling,
    withBatchLoading,

    // Direct access to async helpers
    executeWithLoading,
    executeWithProgress,
  };
}

// Hook for component-specific loading states
export function useComponentLoading(componentName: string) {
  const { withErrorHandling } = useLoadingStates();

  const executeAction = useCallback(
    async <T>(
      operation: () => Promise<T>,
      actionName: string,
      options: {
        successMessage?: string;
        errorMessage?: string;
      } = {}
    ): Promise<T | null> => {
      return withErrorHandling(operation, {
        loadingMessage: `${componentName}: ${actionName}...`,
        successMessage: options.successMessage,
        errorMessage: options.errorMessage,
        type: "action",
      });
    },
    [componentName, withErrorHandling]
  );

  return { executeAction };
}
