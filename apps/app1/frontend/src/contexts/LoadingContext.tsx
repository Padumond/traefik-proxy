"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface LoadingState {
  isLoading: boolean;
  message: string;
  type: "default" | "page" | "action" | "upload";
  progress?: number;
}

interface LoadingContextType {
  loading: LoadingState;
  showLoading: (options?: Partial<LoadingState>) => void;
  hideLoading: () => void;
  updateProgress: (progress: number) => void;
  setLoadingMessage: (message: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: false,
    message: "Loading...",
    type: "default",
    progress: undefined,
  });

  const showLoading = useCallback((options: Partial<LoadingState> = {}) => {
    setLoading((prev) => ({
      ...prev,
      isLoading: true,
      message: options.message || "Loading...",
      type: options.type || "default",
      progress: options.progress,
    }));
  }, []);

  const hideLoading = useCallback(() => {
    setLoading((prev) => ({
      ...prev,
      isLoading: false,
      progress: undefined,
    }));
  }, []);

  const updateProgress = useCallback((progress: number) => {
    setLoading((prev) => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress)),
    }));
  }, []);

  const setLoadingMessage = useCallback((message: string) => {
    setLoading((prev) => ({
      ...prev,
      message,
    }));
  }, []);

  const value: LoadingContextType = {
    loading,
    showLoading,
    hideLoading,
    updateProgress,
    setLoadingMessage,
  };

  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}

// Custom hook for async operations with loading
export function useAsyncWithLoading() {
  const { showLoading, hideLoading, updateProgress, setLoadingMessage } =
    useLoading();

  const executeWithLoading = useCallback(
    async <T,>(
      asyncFn: () => Promise<T>,
      options: {
        message?: string;
        type?: "default" | "page" | "action" | "upload";
        onProgress?: (progress: number) => void;
      } = {}
    ): Promise<T> => {
      try {
        showLoading({
          message: options.message || "Loading...",
          type: options.type || "action",
        });

        const result = await asyncFn();
        return result;
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading]
  );

  const executeWithProgress = useCallback(
    async <T,>(
      asyncFn: (updateProgress: (progress: number) => void) => Promise<T>,
      options: {
        message?: string;
        type?: "upload" | "action";
      } = {}
    ): Promise<T> => {
      try {
        showLoading({
          message: options.message || "Processing...",
          type: options.type || "upload",
          progress: 0,
        });

        const result = await asyncFn(updateProgress);
        return result;
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading, updateProgress]
  );

  return {
    executeWithLoading,
    executeWithProgress,
    showLoading,
    hideLoading,
    updateProgress,
    setLoadingMessage,
  };
}

// Hook for page transitions
export function usePageLoading() {
  const { showLoading, hideLoading } = useLoading();

  const startPageTransition = useCallback(
    (message = "Loading page...") => {
      showLoading({
        message,
        type: "page",
      });
    },
    [showLoading]
  );

  const endPageTransition = useCallback(() => {
    hideLoading();
  }, [hideLoading]);

  return {
    startPageTransition,
    endPageTransition,
  };
}
