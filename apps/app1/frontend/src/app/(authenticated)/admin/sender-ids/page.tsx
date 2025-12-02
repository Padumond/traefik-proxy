"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  useGetAllSenderIdsQuery,
  useUpdateSenderIdStatusMutation,
} from "@/redux/services/adminApi";
// import { toast } from 'sonner';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function AdminSenderIdsPage() {
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch sender IDs data
  const {
    data: senderIdsData,
    isLoading,
    error,
  } = useGetAllSenderIdsQuery({
    page: currentPage,
    limit: itemsPerPage,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const [updateSenderIdStatus] = useUpdateSenderIdStatusMutation();

  // Safely extract sender IDs array from API response
  const senderIds = Array.isArray(senderIdsData?.data?.data)
    ? senderIdsData.data.data
    : [];
  const totalPages = Math.ceil(senderIdsData?.data?.pagination?.pages || 0);

  // Debug logging for development
  if (process.env.NODE_ENV === "development") {
    console.log("Sender IDs Response:", senderIdsData);
    console.log("Sender IDs Array:", senderIds);
    console.log("Is Sender IDs Array:", Array.isArray(senderIds));
  }

  const handleStatusUpdate = async (
    id: string,
    status: "APPROVED" | "REJECTED",
    notes?: string
  ) => {
    try {
      await updateSenderIdStatus({ id, data: { status, notes } }).unwrap();
      console.log(`Sender ID ${status.toLowerCase()} successfully`);
      // toast.success(`Sender ID ${status.toLowerCase()} successfully`);
    } catch (error) {
      console.error("Failed to update sender ID status");
      console.error("Error updating sender ID:", error);
      // toast.error("Failed to update sender ID status");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      PENDING: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          statusClasses[status as keyof typeof statusClasses] ||
          "bg-gray-100 text-gray-800"
        }`}
      >
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">
          Error loading sender IDs. Please try again.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-gray-900">
          Sender ID Management
        </h1>
        <p className="text-gray-600 mt-2">
          Review and approve sender ID requests from clients
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        variants={itemVariants}
      >
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="text-sm text-gray-600">
            Total: {senderIdsData?.data?.pagination?.total || 0} sender IDs
          </div>
        </div>
      </motion.div>

      {/* Sender IDs Table */}
      <motion.div
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
        variants={itemVariants}
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Sender ID Requests
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sender ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {senderIds.map((senderIdRequest: any) => (
                <tr key={senderIdRequest.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {senderIdRequest.senderId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-600 font-medium text-xs">
                            {senderIdRequest.user?.name
                              ?.charAt(0)
                              .toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {senderIdRequest.user?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {senderIdRequest.user?.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(senderIdRequest.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(
                        senderIdRequest.submittedAt
                      ).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(
                        senderIdRequest.submittedAt
                      ).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {senderIdRequest.status === "PENDING" ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() =>
                            handleStatusUpdate(senderIdRequest.id, "APPROVED")
                          }
                          className="text-green-600 hover:text-green-900 px-3 py-1 border border-green-300 rounded-md hover:bg-green-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            handleStatusUpdate(senderIdRequest.id, "REJECTED")
                          }
                          className="text-red-600 hover:text-red-900 px-3 py-1 border border-red-300 rounded-md hover:bg-red-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-500">
                        {senderIdRequest.status === "APPROVED"
                          ? "Approved"
                          : "Rejected"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(
                currentPage * itemsPerPage,
                senderIdsData?.data?.pagination?.total || 0
              )}{" "}
              of {senderIdsData?.data?.pagination?.total || 0} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
