"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  useGetAdminDashboardStatsQuery,
  useGetSystemReportsQuery,
  useExportReportMutation,
} from "@/redux/services/adminApi";
import { SkeletonLoader } from "@/components/ui/OptimizedLoader";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function AdminReportsPage() {
  const [selectedReportType, setSelectedReportType] = useState("overview");
  const [dateRange, setDateRange] = useState("7d");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch admin dashboard stats with real SMS balance from Arkessel
  const {
    data: dashboardStats,
    isLoading: statsLoading,
    error: statsError,
  } = useGetAdminDashboardStatsQuery();

  // Fetch system reports (fallback to existing data if admin endpoints not available)
  const {
    data: systemReports,
    isLoading: reportsLoading,
    error: reportsError,
  } = useGetSystemReportsQuery({
    type: selectedReportType,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Real data from admin dashboard with SMS credits analytics
  const realStats = dashboardStats?.data || null;

  const mockReportData = {
    overview: {
      systemHealth: "Excellent",
      uptime: "99.9%",
      activeUsers: 142,
      messagesLastHour: 1234,
    },
    users: {
      newRegistrations: 23,
      activeUsers: 142,
      topUsers: ["user1@example.com", "user2@example.com"],
    },
    messages: {
      totalSent: 45678,
      successRate: 94.2,
      failureReasons: ["Invalid number", "Network timeout"],
    },
    financial: {
      revenue: 2456789,
      costs: 1234567,
      profit: 1222222,
    },
    performance: {
      avgResponseTime: "120ms",
      errorRate: "0.8%",
      throughput: "1000 msg/min",
    },
  };

  const [exportReport] = useExportReportMutation();

  // Handle export functionality
  const handleExport = async (format: string) => {
    try {
      const blob = await exportReport({
        type: selectedReportType,
        format,
        filters: {
          startDate,
          endDate,
          dateRange,
        },
      }).unwrap();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `admin-report-${selectedReportType}-${
        new Date().toISOString().split("T")[0]
      }.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  // Report type options
  const reportTypes = [
    { value: "overview", label: "System Overview" },
    { value: "users", label: "User Analytics" },
    { value: "messages", label: "Message Reports" },
    { value: "financial", label: "Financial Reports" },
    { value: "performance", label: "Performance Metrics" },
  ];

  // Date range options
  const dateRangeOptions = [
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "90d", label: "Last 90 Days" },
    { value: "custom", label: "Custom Range" },
  ];

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          System Reports
        </h1>
        <p className="text-gray-600">
          Comprehensive analytics and reporting for platform management
        </p>
      </motion.div>

      {/* Controls */}
      <motion.div
        className="bg-white rounded-lg shadow-sm p-6 mb-6"
        variants={itemVariants}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <select
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {reportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {dateRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Range */}
          {dateRange === "custom" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {/* Export Buttons */}
          <div className="flex items-end space-x-2">
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              Export PDF
            </button>
          </div>
        </div>
      </motion.div>

      {/* Dashboard Stats Overview */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        variants={itemVariants}
      >
        {statsLoading ? (
          Array.from({ length: 4 }, (_, i) => (
            <SkeletonLoader key={i} className="h-32 w-full rounded-lg" />
          ))
        ) : (
          <>
            {/* SMS Credits Available - Primary Admin Metric */}
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                    <span className="text-green-600 text-lg">📱</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    SMS Credits Available
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {(realStats?.smsCredits?.available || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Provider: {realStats?.smsCredits?.provider || "Arkessel"}
                  </p>
                  {realStats?.recommendations?.shouldPurchaseCredits && (
                    <p className="text-xs text-orange-600 mt-1 font-medium">
                      ⚠️ Consider purchasing more credits
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <span className="text-blue-600 text-lg">👥</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Total Clients
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {realStats?.totalUsers || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {realStats?.activeUsers || 0} active this month
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                    <span className="text-green-600 text-lg">📱</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Total Messages
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {(realStats?.totalMessages || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {realStats?.todayMessages || 0} sent today
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                    <span className="text-yellow-600 text-lg">💰</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Total Revenue
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    GH₵{(realStats?.totalRevenue || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    GH₵{(realStats?.monthlyRevenue || 0).toLocaleString()} this
                    month
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                    <span className="text-purple-600 text-lg">📊</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Success Rate
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {(realStats?.successRate || 0).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {realStats?.successfulMessages || 0} successful messages
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* SMS Credits Analytics & Predictions */}
      {realStats?.consumption && (
        <motion.div
          className="bg-white rounded-lg shadow-sm overflow-hidden mb-6"
          variants={itemVariants}
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              SMS Credits Analytics & Predictions
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Business intelligence for credit management and purchase planning
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Consumption Metrics */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-3">
                  Consumption Metrics
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">
                      Daily Average:
                    </span>
                    <span className="text-sm font-medium text-blue-900">
                      {realStats.consumption.dailyAverage.toLocaleString()}{" "}
                      credits
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">
                      Weekly Projection:
                    </span>
                    <span className="text-sm font-medium text-blue-900">
                      {realStats.consumption.weeklyProjection.toLocaleString()}{" "}
                      credits
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">
                      Monthly Projection:
                    </span>
                    <span className="text-sm font-medium text-blue-900">
                      {realStats.consumption.monthlyProjection.toLocaleString()}{" "}
                      credits
                    </span>
                  </div>
                </div>
              </div>

              {/* Depletion Timeline */}
              <div className="bg-orange-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-orange-900 mb-3">
                  Depletion Timeline
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-orange-700">
                      Credits will last:
                    </span>
                    <span className="text-sm font-medium text-orange-900">
                      {realStats.consumption.daysUntilDepletion} days
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-orange-700">
                      Purchase recommended in:
                    </span>
                    <span className="text-sm font-medium text-orange-900">
                      {realStats.consumption.daysUntilRecommendedPurchase} days
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div
                className={`rounded-lg p-4 ${
                  realStats.recommendations?.urgentPurchase
                    ? "bg-red-50"
                    : realStats.recommendations?.shouldPurchaseCredits
                    ? "bg-yellow-50"
                    : "bg-green-50"
                }`}
              >
                <h3
                  className={`text-sm font-medium mb-3 ${
                    realStats.recommendations?.urgentPurchase
                      ? "text-red-900"
                      : realStats.recommendations?.shouldPurchaseCredits
                      ? "text-yellow-900"
                      : "text-green-900"
                  }`}
                >
                  {realStats.recommendations?.urgentPurchase
                    ? "🚨 Urgent Action Required"
                    : realStats.recommendations?.shouldPurchaseCredits
                    ? "⚠️ Purchase Recommended"
                    : "✅ Credits Sufficient"}
                </h3>
                <p
                  className={`text-sm ${
                    realStats.recommendations?.urgentPurchase
                      ? "text-red-700"
                      : realStats.recommendations?.shouldPurchaseCredits
                      ? "text-yellow-700"
                      : "text-green-700"
                  }`}
                >
                  {realStats.recommendations?.message}
                </p>
                {realStats.recommendations?.recommendedPurchaseAmount && (
                  <p className="text-xs text-gray-600 mt-2">
                    Recommended purchase:{" "}
                    {realStats.recommendations.recommendedPurchaseAmount.toLocaleString()}{" "}
                    credits
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Reports Content */}
      <motion.div
        className="bg-white rounded-lg shadow-sm overflow-hidden"
        variants={itemVariants}
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {
              reportTypes.find((type) => type.value === selectedReportType)
                ?.label
            }{" "}
            Report
          </h2>
        </div>

        {reportsLoading ? (
          <div className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }, (_, i) => (
                <SkeletonLoader key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Display structured report data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(
                mockReportData[
                  selectedReportType as keyof typeof mockReportData
                ] || {}
              ).map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2 capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </h4>
                  {Array.isArray(value) ? (
                    <ul className="space-y-1">
                      {value.map((item, index) => (
                        <li key={index} className="text-sm text-gray-600">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  ) : typeof value === "object" ? (
                    <div className="space-y-2">
                      {Object.entries(value).map(([subKey, subValue]) => (
                        <div key={subKey} className="flex justify-between">
                          <span className="text-sm text-gray-600 capitalize">
                            {subKey.replace(/([A-Z])/g, " $1").trim()}:
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {typeof subValue === "number" &&
                            (subKey.includes("revenue") ||
                              subKey.includes("cost") ||
                              subKey.includes("profit"))
                              ? `GH₵${subValue.toLocaleString()}`
                              : subValue}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900 font-medium">
                      {typeof value === "number" &&
                      (key.includes("revenue") ||
                        key.includes("cost") ||
                        key.includes("profit"))
                        ? `GH₵${value.toLocaleString()}`
                        : value}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Note about data source */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-blue-600 text-lg">ℹ️</span>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-900">
                    Demo Data
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    This page is displaying sample report data. In production,
                    this would show real-time data from your SMS platform.
                    {reportsError && " (Backend endpoints not yet implemented)"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
