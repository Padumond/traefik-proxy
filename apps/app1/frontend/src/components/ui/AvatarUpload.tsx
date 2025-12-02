"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import Avatar from "./Avatar";
import { toast } from "sonner";
import {
  useUploadAvatarMutation,
  useDeleteAvatarMutation,
} from "@/redux/services/userApi";

interface AvatarUploadProps {
  currentAvatar?: string | null;
  userName?: string;
  onUploadSuccess?: (avatarUrl: string) => void;
  onDeleteSuccess?: () => void;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatar,
  userName = "User",
  onUploadSuccess,
  onDeleteSuccess,
  size = "xl",
  className = "",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redux mutations
  const [uploadAvatar, { isLoading: isUploading }] = useUploadAvatarMutation();
  const [deleteAvatar, { isLoading: isDeleting }] = useDeleteAvatarMutation();

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Don't await here, let handleUpload handle its own errors
      handleUpload(file).catch((error) => {
        console.error("File selection error:", error);
        toast.error("Failed to process file selection");
      });
    }
  };

  // Handle file upload
  const handleUpload = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const result = await uploadAvatar(formData).unwrap();

      console.log("Upload result:", result); // Debug log

      toast.success("Avatar uploaded successfully!");

      // The result structure is: { success: true, message: "...", data: { user: {...}, avatarUrl: "..." } }
      if (result?.data?.avatarUrl) {
        onUploadSuccess?.(result.data.avatarUrl);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error?.data?.message || "Failed to upload avatar");
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle avatar deletion
  const handleDelete = async () => {
    if (!currentAvatar) return;

    try {
      await deleteAvatar().unwrap();

      toast.success("Avatar deleted successfully!");
      onDeleteSuccess?.();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error?.data?.message || "Failed to delete avatar");
    }
  };

  // Trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Upload avatar image"
      />

      {/* Avatar with upload overlay */}
      <div className="relative group">
        <Avatar
          src={currentAvatar}
          name={userName}
          size={size}
          showBorder={true}
          animated={true}
          className="transition-all duration-300"
        />

        {/* Upload overlay */}
        <motion.div
          className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
          onClick={triggerFileInput}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isUploading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          ) : (
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          )}
        </motion.div>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex justify-center space-x-2">
        <motion.button
          type="button"
          onClick={triggerFileInput}
          disabled={isUploading || isDeleting}
          className="px-3 py-1 text-xs font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isUploading ? "Uploading..." : "Upload"}
        </motion.button>

        {currentAvatar && (
          <motion.button
            type="button"
            onClick={handleDelete}
            disabled={isUploading || isDeleting}
            className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isDeleting ? "Deleting..." : "Remove"}
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default AvatarUpload;
