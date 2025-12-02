"use client";

import React from "react";
import { useLoadingStates, useComponentLoading } from "@/hooks/useLoadingStates";
import { LoadingSpinner, LoadingDots, LoadingSkeleton, LoadingWave } from "@/components/ui/LoadingSpinner";
import { InlineLoader } from "@/components/ui/GlobalLoader";
import { toast } from "sonner";

// Example component showing how to use the loading system
export function LoadingExamples() {
  const { 
    withContactLoading, 
    withCsvImportLoading, 
    withErrorHandling,
    withBatchLoading,
    showLoading,
    hideLoading 
  } = useLoadingStates();
  
  const { executeAction } = useComponentLoading("ContactsExample");

  // Example: Contact creation with loading
  const handleCreateContact = async () => {
    await withContactLoading(async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success("Contact created successfully!");
    }, "Creating");
  };

  // Example: CSV import with progress
  const handleCsvImport = async () => {
    await withCsvImportLoading(async (updateProgress) => {
      // Simulate CSV processing with progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        updateProgress(i);
      }
      toast.success("CSV imported successfully!");
    });
  };

  // Example: Batch operation with progress
  const handleBatchDelete = async () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ id: i, name: `Contact ${i}` }));
    
    await withBatchLoading(
      items,
      async (item, index) => {
        // Simulate deleting each contact
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log(`Deleted contact ${item.name}`);
      },
      {
        message: "Deleting contacts...",
        batchSize: 5,
      }
    );
    
    toast.success("All contacts deleted!");
  };

  // Example: Error handling with loading
  const handleErrorExample = async () => {
    await withErrorHandling(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        throw new Error("Something went wrong!");
      },
      {
        loadingMessage: "Processing request...",
        errorMessage: "Failed to process request",
        type: "action",
      }
    );
  };

  // Example: Component-specific action
  const handleComponentAction = async () => {
    await executeAction(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return "Success!";
      },
      "Performing action",
      {
        successMessage: "Action completed successfully!",
        errorMessage: "Action failed",
      }
    );
  };

  // Example: Manual loading control
  const handleManualLoading = () => {
    showLoading({
      message: "Custom loading message...",
      type: "page",
    });

    setTimeout(() => {
      hideLoading();
      toast.success("Manual loading completed!");
    }, 3000);
  };

  return (
    <div className="p-6 space-y-8">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
        Loading System Examples
      </h2>

      {/* Action Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          Loading Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={handleCreateContact}
            className="px-4 py-2 bg-[#2E507C] text-white rounded-lg hover:bg-[#1e3a5f] transition-colors"
          >
            Create Contact (with loading)
          </button>
          
          <button
            onClick={handleCsvImport}
            className="px-4 py-2 bg-[#48B4E3] text-white rounded-lg hover:bg-[#3a9bc1] transition-colors"
          >
            CSV Import (with progress)
          </button>
          
          <button
            onClick={handleBatchDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Batch Delete (with progress)
          </button>
          
          <button
            onClick={handleErrorExample}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Error Example
          </button>
          
          <button
            onClick={handleComponentAction}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Component Action
          </button>
          
          <button
            onClick={handleManualLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Manual Loading
          </button>
        </div>
      </div>

      {/* Spinner Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          Loading Spinners
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <LoadingSpinner size="sm" variant="primary" />
            <p className="mt-2 text-sm text-gray-600">Small Primary</p>
          </div>
          
          <div className="text-center">
            <LoadingSpinner size="md" variant="secondary" />
            <p className="mt-2 text-sm text-gray-600">Medium Secondary</p>
          </div>
          
          <div className="text-center">
            <LoadingSpinner size="lg" variant="primary" showText text="Loading..." />
            <p className="mt-2 text-sm text-gray-600">Large with Text</p>
          </div>
          
          <div className="text-center">
            <LoadingSpinner size="xl" variant="secondary" />
            <p className="mt-2 text-sm text-gray-600">Extra Large</p>
          </div>
        </div>
      </div>

      {/* Other Loading Types */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          Other Loading Types
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 border rounded-lg">
            <LoadingDots variant="primary" />
            <p className="mt-2 text-sm text-gray-600">Loading Dots</p>
          </div>
          
          <div className="text-center p-4 border rounded-lg">
            <LoadingWave variant="secondary" />
            <p className="mt-2 text-sm text-gray-600">Loading Wave</p>
          </div>
          
          <div className="text-center p-4 border rounded-lg">
            <InlineLoader message="Inline loading..." size="md" />
            <p className="mt-2 text-sm text-gray-600">Inline Loader</p>
          </div>
        </div>
      </div>

      {/* Skeleton Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          Skeleton Loading
        </h3>
        <div className="space-y-3">
          <LoadingSkeleton variant="text" />
          <LoadingSkeleton variant="text" className="w-3/4" />
          <LoadingSkeleton variant="card" />
          <div className="flex items-center space-x-3">
            <LoadingSkeleton variant="avatar" />
            <div className="flex-1 space-y-2">
              <LoadingSkeleton variant="text" />
              <LoadingSkeleton variant="text" className="w-2/3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
