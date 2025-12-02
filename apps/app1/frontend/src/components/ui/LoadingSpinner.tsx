"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "primary" | "secondary" | "white" | "dark";
  className?: string;
  showText?: boolean;
  text?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

const variantClasses = {
  primary: "border-[#2E507C] border-t-transparent",
  secondary: "border-[#48B4E3] border-t-transparent",
  white: "border-white border-t-transparent",
  dark: "border-gray-800 border-t-transparent",
};

export function LoadingSpinner({
  size = "md",
  variant = "primary",
  className,
  showText = false,
  text = "Loading...",
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-2",
          sizeClasses[size],
          variantClasses[variant]
        )}
      />
      {showText && (
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {text}
        </span>
      )}
    </div>
  );
}

// Pulsing dots loader for a different style
export function LoadingDots({
  variant = "primary",
  className,
}: {
  variant?: "primary" | "secondary" | "white" | "dark";
  className?: string;
}) {
  const dotColors = {
    primary: "bg-[#2E507C]",
    secondary: "bg-[#48B4E3]",
    white: "bg-white",
    dark: "bg-gray-800",
  };

  return (
    <div className={cn("flex space-x-1", className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            dotColors[variant]
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: "1s",
          }}
        />
      ))}
    </div>
  );
}

// Skeleton loader for content placeholders
export function LoadingSkeleton({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "card" | "text" | "avatar";
}) {
  const baseClasses = "animate-pulse bg-gray-200 dark:bg-gray-700 rounded";
  
  const variantClasses = {
    default: "h-4 w-full",
    card: "h-32 w-full",
    text: "h-3 w-3/4",
    avatar: "h-10 w-10 rounded-full",
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        className
      )}
    />
  );
}

// Wave loader for a more dynamic effect
export function LoadingWave({
  variant = "primary",
  className,
}: {
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const waveColors = {
    primary: "bg-[#2E507C]",
    secondary: "bg-[#48B4E3]",
  };

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={cn(
            "w-1 h-8 rounded-full animate-pulse",
            waveColors[variant]
          )}
          style={{
            animationDelay: `${i * 0.1}s`,
            animationDuration: "1.2s",
            transform: "scaleY(0.4)",
          }}
        />
      ))}
    </div>
  );
}
