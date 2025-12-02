"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { buildApiUrl, createApiConfig, handleApiResponse } from "@/lib/api-config";

interface SimpleSenderIdFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  senderId: string;
  category: "personal" | "company";
  companyName: string;
  purpose: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function SimpleSenderIdForm({ onSuccess, onCancel }: SimpleSenderIdFormProps) {
  const [formData, setFormData] = useState<FormData>({
    senderId: "",
    category: "personal",
    companyName: "",
    purpose: "",
  });

  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form validation
  const validateForm = () => {
    const errors: FormErrors = {};

    // Sender ID validation
    if (!formData.senderId.trim()) {
      errors.senderId = "Sender ID is required";
    } else if (!/^[A-Z0-9]+$/.test(formData.senderId)) {
      errors.senderId = "Sender ID must contain only uppercase letters and numbers";
    } else if (formData.senderId.length < 3) {
      errors.senderId = "Sender ID must be at least 3 characters";
    } else if (formData.senderId.length > 11) {
      errors.senderId = "Sender ID must be no more than 11 characters";
    }

    // Company name validation (if category is company)
    if (formData.category === "company" && !formData.companyName.trim()) {
      errors.companyName = "Company name is required for company category";
    }

    // Purpose validation
    if (!formData.purpose.trim()) {
      errors.purpose = "Purpose description is required";
    } else if (formData.purpose.length < 50) {
      errors.purpose = "Purpose description must be at least 50 characters";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setError("Please fix the errors below before submitting");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(buildApiUrl("/sender-ids"), {
        method: "POST",
        ...createApiConfig(),
        body: JSON.stringify({
          senderId: formData.senderId,
          purpose: formData.purpose,
          sampleMessage: `Sample message from ${formData.category === "company" ? formData.companyName : "user"}`,
          companyName: formData.category === "company" ? formData.companyName : undefined,
        }),
      });

      await handleApiResponse(response);

      toast.success("Sender ID requested successfully! It will be reviewed by administrators.");
      
      // Reset form
      setFormData({
        senderId: "",
        category: "personal",
        companyName: "",
        purpose: "",
      });

      onSuccess?.();
    } catch (error: any) {
      setError(error.message || "Failed to submit sender ID request");
      toast.error("Failed to submit sender ID request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Request New Sender ID
        </h3>
        <p className="text-sm text-gray-600">
          Fill out the form below to request a new sender ID. All requests are manually reviewed.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sender ID */}
        <div>
          <label htmlFor="senderId" className="block text-sm font-medium text-gray-700 mb-2">
            Sender ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="senderId"
            value={formData.senderId}
            onChange={(e) => {
              setFormData({
                ...formData,
                senderId: e.target.value.toUpperCase(),
              });
              if (fieldErrors.senderId) {
                setFieldErrors({ ...fieldErrors, senderId: "" });
              }
            }}
            placeholder="e.g. SCHORLARIX"
            maxLength={11}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 uppercase font-mono ${
              fieldErrors.senderId
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300"
            }`}
            required
          />
          <div className="mt-1 flex justify-between">
            {fieldErrors.senderId && (
              <p className="text-sm text-red-600">{fieldErrors.senderId}</p>
            )}
            <span className="text-xs text-gray-500 ml-auto">
              {formData.senderId.length}/11 characters
            </span>
          </div>
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => {
              setFormData({
                ...formData,
                category: e.target.value as "personal" | "company",
                companyName: e.target.value === "personal" ? "" : formData.companyName,
              });
              if (fieldErrors.companyName) {
                setFieldErrors({ ...fieldErrors, companyName: "" });
              }
            }}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          >
            <option value="personal">Personal</option>
            <option value="company">Company</option>
          </select>
        </div>

        {/* Company Name (conditional) */}
        {formData.category === "company" && (
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="companyName"
              value={formData.companyName}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  companyName: e.target.value,
                });
                if (fieldErrors.companyName) {
                  setFieldErrors({ ...fieldErrors, companyName: "" });
                }
              }}
              placeholder="Enter your company name"
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                fieldErrors.companyName
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300"
              }`}
              required
            />
            {fieldErrors.companyName && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.companyName}</p>
            )}
          </div>
        )}

        {/* Purpose */}
        <div>
          <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-2">
            Purpose Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="purpose"
            value={formData.purpose}
            onChange={(e) => {
              setFormData({
                ...formData,
                purpose: e.target.value,
              });
              if (fieldErrors.purpose) {
                setFieldErrors({ ...fieldErrors, purpose: "" });
              }
            }}
            placeholder="Clearly describe the purpose for your sender ID. Include what type of messages you'll send, to whom, and why. Minimum 50 characters required."
            rows={4}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none ${
              fieldErrors.purpose
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300"
            }`}
            required
          />
          <div className="mt-1 flex justify-between">
            {fieldErrors.purpose && (
              <p className="text-sm text-red-600">{fieldErrors.purpose}</p>
            )}
            <span className={`text-xs ml-auto ${
              formData.purpose.length < 50 ? "text-red-500" : "text-gray-500"
            }`}>
              {formData.purpose.length}/50 minimum characters
            </span>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
