"use client";

import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { GlobalLoader } from "./GlobalLoader";
import { useLoading } from "@/contexts/LoadingContext";
import {
  selectIsLoading,
  selectLoadingMessage,
} from "@/redux/middleware/loadingMiddleware";
import { RootState } from "@/redux/store";

// Debug logging for loading state
const loaderDebugLog = (message: string, data?: any) => {
  const shouldLog =
    typeof window !== "undefined" &&
    (process.env.NODE_ENV === "development" ||
      localStorage.getItem("mas3ndi_debug") === "true");
  if (shouldLog) {
    console.log(
      `[MAS3NDI LOADER] ${new Date().toISOString()} - ${message}`,
      data || ""
    );
  }
};

export function GlobalLoaderWrapper() {
  // Get loading state from context (for manual loading)
  const { loading: contextLoading } = useLoading();

  // Get loading state from Redux (for automatic API loading)
  const reduxIsLoading = useSelector((state: RootState) =>
    selectIsLoading(state)
  );
  const reduxLoadingMessage = useSelector((state: RootState) =>
    selectLoadingMessage(state)
  );

  // Determine which loading state to show
  const isVisible = contextLoading.isLoading || reduxIsLoading;
  const message = contextLoading.isLoading
    ? contextLoading.message
    : reduxLoadingMessage;
  const type = contextLoading.isLoading ? contextLoading.type : "action";
  const progress = contextLoading.progress;

  // Track loading state changes
  const prevIsVisible = useRef(isVisible);
  const loadingStartTime = useRef<number | null>(null);

  useEffect(() => {
    if (isVisible !== prevIsVisible.current) {
      if (isVisible) {
        loadingStartTime.current = Date.now();
        loaderDebugLog("Loading started", {
          source: contextLoading.isLoading ? "context" : "redux",
          message,
          type,
          contextLoading: contextLoading.isLoading,
          reduxLoading: reduxIsLoading,
        });
      } else {
        const duration = loadingStartTime.current
          ? `${Date.now() - loadingStartTime.current}ms`
          : "unknown";
        loaderDebugLog("Loading ended", {
          duration,
          previousMessage: message,
        });
        loadingStartTime.current = null;
      }
      prevIsVisible.current = isVisible;
    }
  }, [isVisible, contextLoading.isLoading, reduxIsLoading, message, type]);

  // Warn if loading takes too long
  useEffect(() => {
    if (!isVisible) return;

    const warningTimeout = setTimeout(() => {
      loaderDebugLog("WARNING: Loading has been active for 5+ seconds", {
        source: contextLoading.isLoading ? "context" : "redux",
        message,
        contextLoading: contextLoading.isLoading,
        reduxLoading: reduxIsLoading,
      });
    }, 5000);

    return () => clearTimeout(warningTimeout);
  }, [isVisible, contextLoading.isLoading, reduxIsLoading, message]);

  return (
    <GlobalLoader
      isVisible={isVisible}
      message={message}
      type={type}
      progress={progress}
    />
  );
}
