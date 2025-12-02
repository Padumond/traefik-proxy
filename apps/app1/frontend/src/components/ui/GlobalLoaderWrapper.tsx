"use client";

import React from "react";
import { useSelector } from "react-redux";
import { GlobalLoader } from "./GlobalLoader";
import { useLoading } from "@/contexts/LoadingContext";
import { 
  selectIsLoading, 
  selectLoadingMessage 
} from "@/redux/middleware/loadingMiddleware";
import { RootState } from "@/redux/store";

export function GlobalLoaderWrapper() {
  // Get loading state from context (for manual loading)
  const { loading: contextLoading } = useLoading();
  
  // Get loading state from Redux (for automatic API loading)
  const reduxIsLoading = useSelector((state: RootState) => selectIsLoading(state));
  const reduxLoadingMessage = useSelector((state: RootState) => selectLoadingMessage(state));

  // Determine which loading state to show
  const isVisible = contextLoading.isLoading || reduxIsLoading;
  const message = contextLoading.isLoading 
    ? contextLoading.message 
    : reduxLoadingMessage;
  const type = contextLoading.isLoading 
    ? contextLoading.type 
    : "action";
  const progress = contextLoading.progress;

  return (
    <GlobalLoader
      isVisible={isVisible}
      message={message}
      type={type}
      progress={progress}
    />
  );
}
