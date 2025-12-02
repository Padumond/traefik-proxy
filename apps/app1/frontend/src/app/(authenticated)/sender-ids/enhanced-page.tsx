"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  useGetSenderIdsQuery,
  useDeleteSenderIdMutation,
  SenderID as APISenderID,
} from "@/redux/services/senderIdApi";
import {
  buildApiUrl,
  createApiConfigMultipart,
  handleApiResponse,
} from "@/lib/api-config";

// Enhanced sender ID type with manual approval workflow fields
interface SenderID {
  id: string;
  senderId: string;
  purpose: string;
  sampleMessage: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  rejectionReason?: string;
  companyName?: string;
  contactPerson?: string;
  phoneNumber?: string;
  email?: string;
  submittedAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  // Manual approval workflow fields
  consentFormPath?: string;
  consentFormOriginalName?: string;
  consentFormMimeType?: string;
  consentFormSize?: number;
  approvedBy?: string;
  adminNotes?: string;
  emailNotificationSent?: boolean;
}

export default function EnhancedSenderIDsPage() {
  // Redux hooks
  const {
    data: senderIdsResponse,
    isLoading: loading,
    error: fetchError,
    refetch,
  } = useGetSenderIdsQuery();
  const [deleteSenderIdMutation] = useDeleteSenderIdMutation();

  // State management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSenderId, setSelectedSenderId] = useState<SenderID | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<
    "all" | "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get sender IDs from Redux response - handle nested data structure
  const senderIds: SenderID[] = (() => {
    if (!senderIdsResponse?.data) return [];

    try {
      // Handle different possible data structures
      if (Array.isArray(senderIdsResponse.data)) {
        // If data is directly an array
        return senderIdsResponse.data;
      } else if (
        senderIdsResponse.data.data &&
        Array.isArray(senderIdsResponse.data.data)
      ) {
        // If data is nested (e.g., { data: { data: [...] } })
        return senderIdsResponse.data.data;
      } else if (
        senderIdsResponse.data.senderIds &&
        Array.isArray(senderIdsResponse.data.senderIds)
      ) {
        // If data has senderIds property
        return senderIdsResponse.data.senderIds;
      } else {
        console.warn(
          "Unexpected sender IDs data structure:",
          senderIdsResponse
        );
        return [];
      }
    } catch (error) {
      console.error("Error processing sender IDs data:", error);
      console.log("Sender IDs data structure:", senderIdsResponse);
      return [];
    }
  })();

  // Form state for new sender ID
  const [formData, setFormData] = useState({
    senderId: "",
    purpose: "",
    sampleMessage: "",
    companyName: "",
    contactPerson: "",
    phoneNumber: "",
    email: "",
  });

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");

  // Form validation state
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  // Handle API errors and debug data
  useEffect(() => {
    if (fetchError) {
      console.error("Error fetching sender IDs:", fetchError);
      toast.error("Failed to load sender IDs");
    }

    // Debug logging for development
    if (process.env.NODE_ENV === "development") {
      console.log("Sender IDs Response:", senderIdsResponse);
      console.log("Processed Sender IDs Array:", senderIds);
      console.log("Is Sender IDs Array:", Array.isArray(senderIds));
      console.log("Sender IDs Count:", senderIds.length);
    }
  }, [fetchError, senderIdsResponse, senderIds]);

  const createSenderId = async () => {
    try {
      setIsSubmitting(true);
      setError("");
      setFileError("");

      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append("senderId", formData.senderId);
      formDataToSend.append("purpose", formData.purpose);
      formDataToSend.append("sampleMessage", formData.sampleMessage);

      // Add optional fields if they have values
      if (formData.companyName)
        formDataToSend.append("companyName", formData.companyName);
      if (formData.contactPerson)
        formDataToSend.append("contactPerson", formData.contactPerson);
      if (formData.phoneNumber)
        formDataToSend.append("phoneNumber", formData.phoneNumber);
      if (formData.email) formDataToSend.append("email", formData.email);

      // Add consent form if selected
      if (selectedFile) {
        formDataToSend.append("consentForm", selectedFile);
      }

      const response = await fetch(buildApiUrl("/sender-ids"), {
        method: "POST",
        ...createApiConfigMultipart(),
        body: formDataToSend,
      });

      const data = await handleApiResponse(response);

      toast.success(
        selectedFile
          ? "Sender ID requested successfully! Consent form uploaded and notification sent to administrators."
          : "Sender ID requested successfully! Please upload a consent form to complete the approval process."
      );
      setIsModalOpen(false);
      setFormData({
        senderId: "",
        purpose: "",
        sampleMessage: "",
        companyName: "",
        contactPerson: "",
        phoneNumber: "",
        email: "",
      });
      setSelectedFile(null);
      setFileError("");
      refetch(); // Refresh the list using Redux
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // File upload handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileError("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setFileError(
        "Please select a valid file type (PDF, DOC, DOCX, JPG, PNG, GIF, WEBP)"
      );
      setSelectedFile(null);
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setFileError("File size must be less than 10MB");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFileError("");
    // Reset file input
    const fileInput = document.getElementById(
      "consent-form"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  // Note: Sync functionality removed - using manual approval workflow

  const deleteSenderId = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sender ID?")) {
      return;
    }

    try {
      await deleteSenderIdMutation(id).unwrap();
      toast.success("Sender ID deleted successfully");
    } catch (error) {
      toast.error("Failed to delete sender ID");
    }
  };

  // Data is automatically loaded by Redux query

  // Utility functions
  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) {
      return "N/A";
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }

      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error, "dateString:", dateString);
      return "Invalid Date";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800 border-green-200";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "REJECTED":
        return "bg-red-100 text-red-800 border-red-200";
      case "SUSPENDED":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Note: Sync status color function removed - using manual approval workflow

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case "PENDING":
        return <ClockIcon className="h-4 w-4 text-yellow-600" />;
      case "REJECTED":
        return <XCircleIcon className="h-4 w-4 text-red-600" />;
      case "SUSPENDED":
        return <ExclamationTriangleIcon className="h-4 w-4 text-gray-600" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  // Filter sender IDs
  const filteredSenderIDs = (senderIds.length > 0 ? senderIds : []).filter(
    (senderID) => {
      // Apply status filter
      if (filter !== "all" && senderID.status !== filter) {
        return false;
      }

      // Apply search query
      if (
        searchQuery &&
        !senderID.senderId.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      return true;
    }
  );

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast.success("Sender IDs refreshed");
  };

  // Form validation
  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.senderId.trim()) {
      errors.senderId = "Sender ID is required";
    } else if (!/^[A-Z0-9]+$/.test(formData.senderId)) {
      errors.senderId = "Sender ID must contain only letters and numbers";
    } else if (formData.senderId.length < 3) {
      errors.senderId = "Sender ID must be at least 3 characters";
    }

    if (!formData.purpose.trim()) {
      errors.purpose = "Purpose is required";
    } else if (formData.purpose.length < 10) {
      errors.purpose =
        "Please provide a more detailed purpose (at least 10 characters)";
    }

    if (!formData.sampleMessage.trim()) {
      errors.sampleMessage = "Sample message is required";
    } else if (formData.sampleMessage.length < 10) {
      errors.sampleMessage = "Please provide a more realistic sample message";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle new sender ID submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setError("Please fix the errors below before submitting");
      return;
    }

    setError("");
    await createSenderId();
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Enhanced Sender IDs
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your SMS sender identities with manual approval workflow
            </p>
          </div>
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <ArrowPathIcon
                className={`-ml-1 mr-2 h-4 w-4 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Request New Sender ID
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          {/* Filters */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Filter by status:</span>
                <div className="inline-flex rounded-md shadow-sm">
                  <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className={`px-3 py-1 text-xs font-medium rounded-l-md ${
                      filter === "all"
                        ? "bg-gray-200 text-gray-800"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    } border border-gray-300`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter("APPROVED")}
                    className={`px-3 py-1 text-xs font-medium ${
                      filter === "APPROVED"
                        ? "bg-green-100 text-green-800"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    } border-t border-b border-gray-300`}
                  >
                    Approved
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter("PENDING")}
                    className={`px-3 py-1 text-xs font-medium ${
                      filter === "PENDING"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    } border-t border-b border-gray-300`}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter("REJECTED")}
                    className={`px-3 py-1 text-xs font-medium ${
                      filter === "REJECTED"
                        ? "bg-red-100 text-red-800"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    } border-t border-b border-gray-300`}
                  >
                    Rejected
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter("SUSPENDED")}
                    className={`px-3 py-1 text-xs font-medium rounded-r-md ${
                      filter === "SUSPENDED"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    } border border-gray-300`}
                  >
                    Suspended
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search sender IDs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Sender ID
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Submitted
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Purpose
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Last Updated
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <div className="flex items-center justify-center">
                        <ArrowPathIcon className="h-5 w-5 animate-spin text-gray-400 mr-2" />
                        <span className="text-sm text-gray-500">
                          Loading sender IDs...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filteredSenderIDs.length > 0 ? (
                  filteredSenderIDs.map((senderID) => (
                    <tr key={senderID.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {senderID.senderId}
                            </div>
                            {senderID.companyName && (
                              <div className="text-xs text-gray-500">
                                {senderID.companyName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(senderID.status)}
                          <span
                            className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                              senderID.status
                            )}`}
                          >
                            {senderID.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(
                            senderID.submittedAt || senderID.updatedAt
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {senderID.purpose}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(senderID.updatedAt || senderID.submittedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSenderId(senderID);
                              setIsDetailModalOpen(true);
                            }}
                            className="text-primary-600 hover:text-primary-900"
                            title="View details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {/* Sync retry removed - using manual approval workflow */}
                          <button
                            type="button"
                            onClick={() => deleteSenderId(senderID.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete sender ID"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-sm text-gray-500"
                    >
                      <div className="flex flex-col items-center">
                        <ExclamationTriangleIcon className="h-8 w-8 text-gray-400 mb-2" />
                        <span>No sender IDs found matching your criteria.</span>
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(true)}
                          className="mt-2 text-primary-600 hover:text-primary-900 text-sm"
                        >
                          Create your first sender ID
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex justify-between">
              <div className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">{filteredSenderIDs.length}</span>{" "}
                results
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Create Sender ID Modal */}
      {isModalOpen && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm transition-opacity"
              aria-hidden="true"
              onClick={() => setIsModalOpen(false)}
            />

            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleSubmit}>
                <div className="bg-gradient-to-br from-white to-gray-50 px-6 pt-6 pb-4">
                  {/* Header Section */}
                  <div className="text-center mb-8">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 mb-4">
                      <svg
                        className="h-8 w-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Request New Sender ID
                    </h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      Submit your sender ID request with required documentation
                      for administrator review and approval.
                    </p>
                  </div>

                  {error && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-red-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Form Content */}
                  <div className="space-y-8">
                    {/* Primary Information Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center mb-6">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                            <svg
                              className="h-5 w-5 text-primary-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-lg font-semibold text-gray-900">
                            Sender ID Information
                          </h4>
                          <p className="text-sm text-gray-500">
                            Configure your unique sender identifier
                          </p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <label
                            htmlFor="sender-id"
                            className="block text-sm font-semibold text-gray-700 mb-2"
                          >
                            <span className="flex items-center">
                              <svg
                                className="h-4 w-4 text-gray-400 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                />
                              </svg>
                              Sender ID
                              <span className="text-red-500 ml-1">*</span>
                            </span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              id="sender-id"
                              name="sender-id"
                              value={formData.senderId}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  senderId: e.target.value.toUpperCase(),
                                });
                                // Clear field error when user starts typing
                                if (fieldErrors.senderId) {
                                  setFieldErrors({
                                    ...fieldErrors,
                                    senderId: "",
                                  });
                                }
                              }}
                              placeholder="e.g. COMPANY"
                              maxLength={11}
                              className={`block w-full px-4 py-3 text-sm border rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 uppercase font-mono bg-gray-50 focus:bg-white ${
                                fieldErrors.senderId
                                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                                  : "border-gray-300"
                              }`}
                              required
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <span className="text-xs text-gray-400 font-mono">
                                {formData.senderId.length}/11
                              </span>
                            </div>
                          </div>
                          {fieldErrors.senderId ? (
                            <div className="mt-2 flex items-start space-x-2">
                              <svg
                                className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <p className="text-xs text-red-600">
                                {fieldErrors.senderId}
                              </p>
                            </div>
                          ) : (
                            <div className="mt-2 flex items-start space-x-2">
                              <svg
                                className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <p className="text-xs text-gray-600">
                                Maximum 11 characters. Use only letters (A-Z)
                                and numbers (0-9). This will be your unique SMS
                                sender identifier.
                              </p>
                            </div>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="purpose"
                            className="block text-sm font-semibold text-gray-700 mb-2"
                          >
                            <span className="flex items-center">
                              <svg
                                className="h-4 w-4 text-gray-400 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                              Purpose
                              <span className="text-red-500 ml-1">*</span>
                            </span>
                          </label>
                          <textarea
                            id="purpose"
                            name="purpose"
                            rows={4}
                            value={formData.purpose}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                purpose: e.target.value,
                              })
                            }
                            placeholder="Describe how you intend to use this Sender ID (e.g., order confirmations, appointment reminders, marketing campaigns, etc.)"
                            className="block w-full px-4 py-3 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 bg-gray-50 focus:bg-white resize-none"
                            required
                          />
                          <div className="mt-2 flex items-start space-x-2">
                            <svg
                              className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <p className="text-xs text-gray-600">
                              Provide a detailed explanation of your intended
                              use case. This helps our team understand and
                              approve your request faster.
                            </p>
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="sample-message"
                            className="block text-sm font-semibold text-gray-700 mb-2"
                          >
                            <span className="flex items-center">
                              <svg
                                className="h-4 w-4 text-gray-400 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                              </svg>
                              Sample Message
                              <span className="text-red-500 ml-1">*</span>
                            </span>
                          </label>
                          <div className="relative">
                            <textarea
                              id="sample-message"
                              name="sample-message"
                              rows={3}
                              value={formData.sampleMessage}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  sampleMessage: e.target.value,
                                })
                              }
                              placeholder="Example: Hello John, your order #123 has been confirmed and will be delivered on March 15th. Track your order at: company.com/track"
                              className="block w-full px-4 py-3 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 bg-gray-50 focus:bg-white resize-none"
                              required
                            />
                            <div className="absolute bottom-3 right-3">
                              <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded border">
                                {formData.sampleMessage.length} chars
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 flex items-start space-x-2">
                            <svg
                              className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <p className="text-xs text-gray-600">
                              Provide a realistic example of the messages you'll
                              send. Include typical content, links, and
                              formatting you plan to use.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center mb-6">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-lg bg-secondary-100 flex items-center justify-center">
                            <svg
                              className="h-5 w-5 text-secondary-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-lg font-semibold text-gray-900">
                            Contact Information
                          </h4>
                          <p className="text-sm text-gray-500">
                            Optional details for better communication
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <label
                            htmlFor="company-name"
                            className="block text-sm font-semibold text-gray-700 mb-2"
                          >
                            <span className="flex items-center">
                              <svg
                                className="h-4 w-4 text-gray-400 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                              </svg>
                              Company Name
                            </span>
                          </label>
                          <input
                            type="text"
                            id="company-name"
                            name="company-name"
                            value={formData.companyName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                companyName: e.target.value,
                              })
                            }
                            placeholder="Your Company Ltd"
                            className="block w-full px-4 py-3 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 bg-gray-50 focus:bg-white"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="contact-person"
                            className="block text-sm font-semibold text-gray-700 mb-2"
                          >
                            <span className="flex items-center">
                              <svg
                                className="h-4 w-4 text-gray-400 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                              Contact Person
                            </span>
                          </label>
                          <input
                            type="text"
                            id="contact-person"
                            name="contact-person"
                            value={formData.contactPerson}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                contactPerson: e.target.value,
                              })
                            }
                            placeholder="John Doe"
                            className="block w-full px-4 py-3 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 bg-gray-50 focus:bg-white"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="phone-number"
                            className="block text-sm font-semibold text-gray-700 mb-2"
                          >
                            <span className="flex items-center">
                              <svg
                                className="h-4 w-4 text-gray-400 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                />
                              </svg>
                              Phone Number
                            </span>
                          </label>
                          <input
                            type="tel"
                            id="phone-number"
                            name="phone-number"
                            value={formData.phoneNumber}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                phoneNumber: e.target.value,
                              })
                            }
                            placeholder="+233 20 123 4567"
                            className="block w-full px-4 py-3 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 bg-gray-50 focus:bg-white"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="email"
                            className="block text-sm font-semibold text-gray-700 mb-2"
                          >
                            <span className="flex items-center">
                              <svg
                                className="h-4 w-4 text-gray-400 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                              </svg>
                              Email Address
                            </span>
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                email: e.target.value,
                              })
                            }
                            placeholder="john@company.com"
                            className="block w-full px-4 py-3 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 bg-gray-50 focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Document Upload Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center mb-6">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <svg
                              className="h-5 w-5 text-green-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-lg font-semibold text-gray-900">
                            Documentation
                          </h4>
                          <p className="text-sm text-gray-500">
                            Upload supporting documents for faster approval
                          </p>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="consent-form"
                          className="block text-sm font-semibold text-gray-700 mb-3"
                        >
                          <span className="flex items-center">
                            <svg
                              className="h-4 w-4 text-gray-400 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                              />
                            </svg>
                            Consent Form or Authorization Document
                          </span>
                        </label>

                        <div
                          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                            selectedFile
                              ? "border-green-300 bg-green-50"
                              : "border-gray-300 hover:border-primary-400 hover:bg-gray-50"
                          }`}
                        >
                          {selectedFile ? (
                            <div className="space-y-4">
                              <div className="flex items-center justify-center">
                                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                                  <svg
                                    className="h-8 w-8 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                </div>
                              </div>
                              <div>
                                <p className="text-lg font-semibold text-gray-900">
                                  {selectedFile.name}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                  {(selectedFile.size / 1024 / 1024).toFixed(2)}{" "}
                                  MB • {selectedFile.type}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={removeSelectedFile}
                                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                              >
                                <svg
                                  className="h-4 w-4 mr-2"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                                Remove File
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex items-center justify-center">
                                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                                  <svg
                                    className="h-8 w-8 text-gray-400"
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
                                </div>
                              </div>
                              <div>
                                <label
                                  htmlFor="consent-form"
                                  className="cursor-pointer"
                                >
                                  <span className="text-lg font-semibold text-primary-600 hover:text-primary-500">
                                    Choose a file
                                  </span>
                                  <span className="text-gray-600">
                                    {" "}
                                    or drag and drop
                                  </span>
                                  <input
                                    id="consent-form"
                                    name="consent-form"
                                    type="file"
                                    className="sr-only"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                                    onChange={handleFileSelect}
                                  />
                                </label>
                                <p className="text-sm text-gray-500 mt-2">
                                  PDF, DOC, DOCX, JPG, PNG, GIF, WEBP up to 10MB
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {fileError && (
                          <div className="mt-3 bg-red-50 border-l-4 border-red-400 p-3 rounded-r-lg">
                            <div className="flex">
                              <div className="flex-shrink-0">
                                <svg
                                  className="h-5 w-5 text-red-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </div>
                              <div className="ml-3">
                                <p className="text-sm text-red-700">
                                  {fileError}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <svg
                              className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <div>
                              <h5 className="text-sm font-semibold text-blue-900 mb-1">
                                Document Requirements
                              </h5>
                              <ul className="text-xs text-blue-800 space-y-1">
                                <li>
                                  • Upload your consent form or authorization
                                  document
                                </li>
                                <li>
                                  • Ensure the document clearly shows approval
                                  for SMS usage
                                </li>
                                <li>
                                  • Include company letterhead or official
                                  stamps if available
                                </li>
                                <li>
                                  • This helps speed up the approval process
                                  significantly
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Footer */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-6 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row-reverse gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-75 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isSubmitting ? (
                        <>
                          <ArrowPathIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                          <span>Processing Request...</span>
                        </>
                      ) : (
                        <>
                          <svg
                            className="h-5 w-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                            />
                          </svg>
                          <span>Submit Request</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <svg
                        className="h-5 w-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      <span>Cancel</span>
                    </button>
                  </div>

                  {/* Progress Indicator */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <div className="h-2 w-2 rounded-full bg-primary-500"></div>
                        <span>Submit Request</span>
                      </div>
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      <div className="flex items-center space-x-1">
                        <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                        <span>Admin Review</span>
                      </div>
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      <div className="flex items-center space-x-1">
                        <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                        <span>Approval</span>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}

      {/* Sender ID Detail Modal */}
      {isDetailModalOpen && selectedSenderId && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={() => setIsDetailModalOpen(false)}
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Sender ID Details
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Basic Information */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2">
                          Basic Information
                        </h4>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Sender ID
                          </label>
                          <p className="mt-1 text-sm text-gray-900 font-medium">
                            {selectedSenderId.senderId}
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Status
                          </label>
                          <div className="mt-1 flex items-center">
                            {getStatusIcon(selectedSenderId.status)}
                            <span
                              className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                                selectedSenderId.status
                              )}`}
                            >
                              {selectedSenderId.status}
                            </span>
                          </div>
                        </div>

                        {/* Consent Form Information */}
                        {selectedSenderId.consentFormOriginalName && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Consent Form
                            </label>
                            <div className="mt-1">
                              <p className="text-sm text-gray-900">
                                {selectedSenderId.consentFormOriginalName}
                              </p>
                              {selectedSenderId.consentFormSize && (
                                <p className="text-xs text-gray-500">
                                  {(
                                    selectedSenderId.consentFormSize /
                                    1024 /
                                    1024
                                  ).toFixed(2)}{" "}
                                  MB
                                </p>
                              )}
                              {selectedSenderId.emailNotificationSent && (
                                <p className="text-xs text-green-600 mt-1">
                                  ✓ Notification sent to administrators
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Purpose
                          </label>
                          <p className="mt-1 text-sm text-gray-900">
                            {selectedSenderId.purpose}
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Sample Message
                          </label>
                          <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                            {selectedSenderId.sampleMessage}
                          </p>
                        </div>
                      </div>

                      {/* Contact Information */}
                      {(selectedSenderId.companyName ||
                        selectedSenderId.contactPerson ||
                        selectedSenderId.phoneNumber ||
                        selectedSenderId.email) && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2">
                            Contact Information
                          </h4>

                          {selectedSenderId.companyName && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Company Name
                              </label>
                              <p className="mt-1 text-sm text-gray-900">
                                {selectedSenderId.companyName}
                              </p>
                            </div>
                          )}

                          {selectedSenderId.contactPerson && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Contact Person
                              </label>
                              <p className="mt-1 text-sm text-gray-900">
                                {selectedSenderId.contactPerson}
                              </p>
                            </div>
                          )}

                          {selectedSenderId.phoneNumber && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Phone Number
                              </label>
                              <p className="mt-1 text-sm text-gray-900">
                                {selectedSenderId.phoneNumber}
                              </p>
                            </div>
                          )}

                          {selectedSenderId.email && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Email Address
                              </label>
                              <p className="mt-1 text-sm text-gray-900">
                                {selectedSenderId.email}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Date Information */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2">
                          Date Information
                        </h4>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Submitted
                          </label>
                          <p className="mt-1 text-sm text-gray-900">
                            {formatDate(selectedSenderId?.submittedAt)}
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Last Updated
                          </label>
                          <p className="mt-1 text-sm text-gray-900">
                            {formatDate(selectedSenderId?.updatedAt)}
                          </p>
                        </div>

                        {selectedSenderId.approvedAt && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Approved
                            </label>
                            <p className="mt-1 text-sm text-gray-900">
                              {formatDate(selectedSenderId?.approvedAt)}
                            </p>
                          </div>
                        )}

                        {selectedSenderId.rejectedAt && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Rejected
                            </label>
                            <p className="mt-1 text-sm text-gray-900">
                              {formatDate(selectedSenderId?.rejectedAt)}
                            </p>
                          </div>
                        )}

                        {selectedSenderId.lastSyncAt && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Last Sync
                            </label>
                            <p className="mt-1 text-sm text-gray-900">
                              {formatDate(selectedSenderId?.lastSyncAt)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Error Information */}
                    {(selectedSenderId.rejectionReason ||
                      selectedSenderId.lastSyncError) && (
                      <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
                        <h4 className="text-sm font-medium text-red-800 mb-2">
                          Issues
                        </h4>
                        {selectedSenderId.rejectionReason && (
                          <div className="mb-2">
                            <label className="block text-xs font-medium text-red-700 uppercase tracking-wide">
                              Rejection Reason
                            </label>
                            <p className="mt-1 text-sm text-red-800">
                              {selectedSenderId.rejectionReason}
                            </p>
                          </div>
                        )}
                        {selectedSenderId.lastSyncError && (
                          <div>
                            <label className="block text-xs font-medium text-red-700 uppercase tracking-wide">
                              Last Sync Error
                            </label>
                            <p className="mt-1 text-sm text-red-800">
                              {selectedSenderId.lastSyncError}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Arkessel Information */}
                    {selectedSenderId.arkeselSenderIdId && (
                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">
                          Arkessel Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-blue-700 uppercase tracking-wide">
                              Arkessel ID
                            </label>
                            <p className="mt-1 text-sm text-blue-800 font-mono">
                              {selectedSenderId.arkeselSenderIdId}
                            </p>
                          </div>
                          {selectedSenderId.arkeselStatus && (
                            <div>
                              <label className="block text-xs font-medium text-blue-700 uppercase tracking-wide">
                                Arkessel Status
                              </label>
                              <p className="mt-1 text-sm text-blue-800">
                                {selectedSenderId.arkeselStatus}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {/* Sync retry button removed - using manual approval workflow */}
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
