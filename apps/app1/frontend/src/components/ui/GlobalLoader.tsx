"use client";

import React from "react";
import { LoadingSpinner, LoadingWave } from "./LoadingSpinner";
import { cn } from "@/lib/utils";

interface GlobalLoaderProps {
  isVisible: boolean;
  message?: string;
  type?: "default" | "page" | "action" | "upload";
  progress?: number;
  className?: string;
}

export function GlobalLoader({
  isVisible,
  message = "Loading...",
  type = "default",
  progress,
  className,
}: GlobalLoaderProps) {
  const getLoaderContent = () => {
    switch (type) {
      case "page":
        return (
          <div className="flex flex-col items-center space-y-6">
            {/* Mas3ndi Logo Animation */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#2E507C] to-[#48B4E3] flex items-center justify-center">
                <span className="text-white font-bold text-xl">M3</span>
              </div>
              <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-[#48B4E3] border-t-transparent animate-spin" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                {message}
              </h3>
              <LoadingWave variant="primary" />
            </div>
          </div>
        );

      case "action":
        return (
          <div className="flex flex-col items-center space-y-4">
            <LoadingSpinner size="lg" variant="primary" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {message}
            </p>
          </div>
        );

      case "upload":
        return (
          <div className="flex flex-col items-center space-y-4 max-w-sm">
            <div className="relative w-20 h-20">
              <svg
                className="w-20 h-20 text-[#2E507C] animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              {progress !== undefined && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-[#2E507C]">
                    {Math.round(progress)}%
                  </span>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-800 dark:text-white mb-2">
                {message}
              </p>
              {progress !== undefined && (
                <div className="w-48 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                  <div
                    className="bg-gradient-to-r from-[#2E507C] to-[#48B4E3] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center space-y-4">
            <LoadingSpinner size="xl" variant="primary" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {message}
            </p>
          </div>
        );
    }
  };

  return (
    <>
      {isVisible && (
        <div
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center",
            "bg-black/20 backdrop-blur-sm",
            "animate-in fade-in duration-200",
            className
          )}
        >
          <div
            className={cn(
              "bg-white/90 dark:bg-gray-900/90 backdrop-blur-md",
              "border border-white/20 shadow-2xl",
              "rounded-2xl p-8 mx-4",
              "min-w-[280px] max-w-md",
              "animate-in zoom-in-95 duration-300",
              // Glassmorphism effect
              "bg-gradient-to-br from-white/80 to-white/40",
              "dark:from-gray-900/80 dark:to-gray-800/40"
            )}
            style={{
              boxShadow: `
                0 8px 32px 0 rgba(46, 80, 124, 0.1),
                inset 0 1px 0 0 rgba(255, 255, 255, 0.2)
              `,
            }}
          >
            {getLoaderContent()}
          </div>
        </div>
      )}
    </>
  );
}

// Inline loader for smaller components
export function InlineLoader({
  message = "Loading...",
  size = "sm",
  className,
}: {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center p-4", className)}>
      <LoadingSpinner size={size} variant="primary" showText text={message} />
    </div>
  );
}
