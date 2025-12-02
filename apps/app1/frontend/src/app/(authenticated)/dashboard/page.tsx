"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import ChartsSection from "@/components/dashboard/ChartsSection";
import RecentActivityCard from "@/components/dashboard/RecentActivityCard";
import RecentMessagesCard from "@/components/dashboard/RecentMessagesCard";
import StatsCard from "@/components/dashboard/StatsCard";
import AverageSuccessRateCard from "@/components/dashboard/AverageSuccessRateCard";
import { useGetDashboardDataQuery } from "@/redux/services/dashboardApi";
import type { MessageCount } from "@/redux/services/dashboardApi";
import { formatCurrency } from "@/lib/api-config";

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

// Mock data for fallback when API is not available
const mockDashboardData = {
  stats: {
    messagesCount: {
      today: 245,
      week: 1432,
      month: 5674,
      total: 24562,
    },
    walletBalance: {
      balance: 334.1,
      amountSpent: 15.9,
      lastTopup: "2023-06-14T10:24:00Z",
      lastTopupAmount: 200,
    },
    senderIds: {
      active: 3,
      pending: 1,
      rejected: 0,
    },
    smsCredits: {
      available: 5452,
      used: 348,
      total: 5800,
    },
    apiUsage: {
      requests: 3245,
      failures: 24,
    },
  },
  recentMessages: [
    {
      id: "1",
      recipients: 120,
      message: "Your appointment has been confirmed for tomorrow at 10am.",
      senderId: "COMPANY",
      date: "2023-06-15T08:30:00Z",
      status: "delivered",
    },
    {
      id: "2",
      recipients: 45,
      message: "Your order #12345 has been shipped and will arrive tomorrow.",
      senderId: "DELIVERY",
      date: "2023-06-14T14:20:00Z",
      status: "delivered",
    },
    {
      id: "3",
      recipients: 200,
      message: "Flash sale! 30% off all products for the next 24 hours.",
      senderId: "MARKETING",
      date: "2023-06-13T09:15:00Z",
      status: "processing",
    },
  ],
  recentTransactions: [
    {
      id: "t1",
      type: "CREDIT",
      amount: 200,
      credits: 3846,
      date: "2023-06-14T10:24:00Z",
      description: "Package purchase - Popular Plan",
    },
    {
      id: "t2",
      type: "DEBIT",
      amount: 10.4,
      credits: 200,
      date: "2023-06-13T15:42:00Z",
      description: "SMS charges for marketing campaign",
    },
    {
      id: "t3",
      type: "CREDIT",
      amount: 100,
      credits: 1887,
      date: "2023-06-12T14:30:00Z",
      description: "Package purchase - Standard Plan",
    },
    {
      id: "t4",
      type: "DEBIT",
      amount: 5.5,
      credits: 100,
      date: "2023-06-11T09:15:00Z",
      description: "SMS charges for customer notifications",
    },
    {
      id: "t5",
      type: "CREDIT",
      amount: 50,
      credits: 926,
      date: "2023-06-10T16:45:00Z",
      description: "Package purchase - Basic Plan",
    },
  ],
};

export default function Dashboard() {
  const [selectedMetric, setSelectedMetric] = useState("today");

  // Fetch dashboard data using RTK Query hook with proper authentication
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
    isError: isDashboardError,
    refetch: refetchDashboard,
  } = useGetDashboardDataQuery();

  // Set loading state
  const isLoading = isDashboardLoading;

  // If there's an error or no data yet, use mock data
  const stats = dashboardData?.stats || mockDashboardData.stats;
  const transactions =
    dashboardData?.recentTransactions || mockDashboardData.recentTransactions;
  const messages =
    dashboardData?.recentMessages || mockDashboardData.recentMessages;

  // Extract analytics data for charts
  const analytics = dashboardData?.stats?.analytics;

  // Handle error
  const handleRetry = () => {
    refetchDashboard();
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white h-32 rounded-lg shadow-sm border border-gray-200"
            ></div>
          ))}
        </div>
        <div className="bg-white h-64 rounded-lg shadow-sm border border-gray-200 mb-6"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white h-96 rounded-lg shadow-sm border border-gray-200"></div>
          <div className="bg-white h-96 rounded-lg shadow-sm border border-gray-200"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (isDashboardError) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200 text-center">
        <svg
          className="w-16 h-16 mx-auto text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <h3 className="mt-4 text-lg font-semibold text-gray-800">
          Error Loading Dashboard Data
        </h3>
        <p className="mt-2 text-gray-600">
          {dashboardError?.toString() ||
            "An error occurred while loading your dashboard. Please try again."}
        </p>
        <button
          onClick={handleRetry}
          className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
        >
          Retry
        </button>
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
      {/* Welcome message and quick actions */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
        variants={itemVariants}
      >
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 truncate">
            Welcome back, John!
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Here's what's happening with your account today.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-shrink-0">
          <Link
            href="/messages/new"
            className="bg-primary-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base font-medium"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              ></path>
            </svg>
            <span>New Message</span>
          </Link>
          <Link
            href="/wallet/topup"
            className="bg-white text-primary-600 border border-primary-600 px-3 sm:px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base font-medium"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              ></path>
            </svg>
            <span>Top Up</span>
          </Link>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-6"
        variants={itemVariants}
      >
        {/* Wallet Balance (GHS) */}
        <StatsCard
          title="Wallet Balance"
          value={formatCurrency(stats?.walletBalance?.balance || 0)}
          description="Available GHS for purchases"
          icon={
            <svg
              className="w-10 h-10 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              ></path>
            </svg>
          }
          actionLink="/wallet/topup"
          actionText="Top Up"
        />

        {/* Messages Sent */}
        <StatsCard
          title="Messages Sent"
          value={(
            stats?.messagesCount?.[selectedMetric as keyof MessageCount] || 0
          ).toLocaleString()}
          description={
            <div className="flex space-x-2 text-xs mt-1">
              <button
                type="button"
                className={`${
                  selectedMetric === "today"
                    ? "text-primary-600 font-medium"
                    : "text-gray-500"
                }`}
                onClick={() => setSelectedMetric("today")}
              >
                Today
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                className={`${
                  selectedMetric === "week"
                    ? "text-primary-600 font-medium"
                    : "text-gray-500"
                }`}
                onClick={() => setSelectedMetric("week")}
              >
                Week
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                className={`${
                  selectedMetric === "month"
                    ? "text-primary-600 font-medium"
                    : "text-gray-500"
                }`}
                onClick={() => setSelectedMetric("month")}
              >
                Month
              </button>
            </div>
          }
          icon={
            <svg
              className="w-10 h-10 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              ></path>
            </svg>
          }
          actionLink="/messages"
          actionText="View All"
        />

        {/* Sender IDs */}
        <StatsCard
          title="Sender IDs"
          value={stats?.senderIds.active.toString() || "0"}
          description={
            <div className="flex space-x-2 text-xs mt-1">
              <span className="text-green-600 font-medium">
                {stats?.senderIds.active} Active
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-amber-600">
                {stats?.senderIds.pending} Pending
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-red-600">
                {stats?.senderIds.rejected} Rejected
              </span>
            </div>
          }
          icon={
            <svg
              className="w-10 h-10 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              ></path>
            </svg>
          }
          actionLink="/sender-ids"
          actionText="Manage"
        />

        {/* SMS Credits */}
        <StatsCard
          title="SMS Credits"
          value={(stats?.smsCredits?.available || 0).toLocaleString()}
          description={
            <div className="flex space-x-2 text-xs mt-1">
              <span className="text-green-600 font-medium">
                {(stats?.smsCredits?.available || 0).toLocaleString()} available
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-blue-600">
                {(stats?.smsCredits?.used || 0).toLocaleString()} used
              </span>
            </div>
          }
          icon={
            <svg
              className="w-10 h-10 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              ></path>
            </svg>
          }
          actionLink="/packages"
          actionText="Buy More"
        />

        {/* API Usage */}
        <StatsCard
          title="API Usage"
          value={(stats?.apiUsage?.requests || 0).toLocaleString()}
          description={
            <div className="flex space-x-2 text-xs mt-1">
              <span className="text-green-600 font-medium">
                {(
                  (stats?.apiUsage.requests || 0) -
                  (stats?.apiUsage.failures || 0)
                ).toLocaleString()}{" "}
                Successful
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-red-600">
                {(stats?.apiUsage?.failures || 0).toLocaleString()} Failed
              </span>
            </div>
          }
          icon={
            <svg
              className="w-10 h-10 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              ></path>
            </svg>
          }
          actionLink="/api-keys"
          actionText="View Keys"
        />
      </motion.div>

      {/* Charts */}
      <ChartsSection
        deliveryStatusData={analytics?.deliveryStatus}
        messageVolumeData={analytics?.messageVolume}
        monthlyData={analytics?.monthlyDelivery}
      />

      {/* Average Success Rate Section */}
      <motion.div className="mb-6" variants={itemVariants}>
        <AverageSuccessRateCard data={analytics?.averageSuccessRate} />
      </motion.div>

      {/* Recent Activity & Messages Section */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        variants={itemVariants}
      >
        {/* Recent Activity */}
        <RecentActivityCard transactions={transactions} />

        {/* Recent Messages */}
        <RecentMessagesCard messages={messages} />
      </motion.div>
    </motion.div>
  );
}
