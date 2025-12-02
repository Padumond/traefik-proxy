"use client";

import React from "react";
import { LoadingExamples } from "@/components/examples/LoadingExamples";

export default function LoadingDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
            Mas3ndi Loading System Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            This page demonstrates the comprehensive loading system implemented for the Mas3ndi platform.
            The system includes global loaders, page transitions, API loading states, and various loading components.
          </p>
        </div>
        
        <LoadingExamples />
      </div>
    </div>
  );
}
