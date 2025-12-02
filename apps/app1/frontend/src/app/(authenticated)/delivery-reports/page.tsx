"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  useGetRealTimeDashboardQuery,
  useGetDeliveryReportsQuery,
  useGetDeliveryAnalyticsQuery,
  useGetDeliveryInsightsQuery,
} from "@/redux/services/deliveryReportsApi";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
    },
  },
};

function DeliveryReportsPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(
    null
  );
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // API Hooks
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    refetch: refetchDashboard,
  } = useGetRealTimeDashboardQuery(undefined, {
    pollingInterval: 30000, // Auto-refresh every 30 seconds
  });

  const { data: deliveryReports } = useGetDeliveryReportsQuery({
    page: 1,
    limit: 10,
  });

  const { data: analytics } = useGetDeliveryAnalyticsQuery({
    period: "day",
  });

  const { data: insights } = useGetDeliveryInsightsQuery({
    period: "30d",
  });

  // Fetch real-time dashboard data
  const fetchDashboardData = async () => {
    try {
      // TODO: Replace with actual API call
      const mockData = {
        timestamp: new Date().toISOString(),
        summary: {
          totalSent: 15420,
          deliveryRate: 94.2,
          avgDeliveryTime: 45,
          totalCost: 154.2,
          trend: {
            deliveryRate: 2.1,
            totalSent: 15.3,
            avgDeliveryTime: -8.2,
            totalCost: 12.4,
          },
        },
        last24Hours: {
          totalSent: 1240,
          totalDelivered: 1168,
          totalFailed: 52,
          totalPending: 20,
          deliveryRate: 94.2,
          failureRate: 4.2,
          avgDeliveryTime: 45,
          totalCost: 12.4,
        },
        recentDeliveries: [
          {
            id: "1",
            messageId: "msg_001",
            status: "DELIVERED",
            recipients: 1,
            senderId: "COMPANY",
            countryCode: "US",
            cost: 0.01,
            deliveredAt: new Date().toISOString(),
            createdAt: new Date(Date.now() - 300000).toISOString(),
          },
          {
            id: "2",
            messageId: "msg_002",
            status: "PENDING",
            recipients: 5,
            senderId: "ALERT",
            countryCode: "GB",
            cost: 0.05,
            createdAt: new Date(Date.now() - 600000).toISOString(),
          },
        ],
        activeMessages: {
          count: 23,
          messages: [
            {
              id: "1",
              messageId: "msg_003",
              status: "SENT",
              recipients: 10,
              senderId: "PROMO",
              createdAt: new Date(Date.now() - 900000).toISOString(),
              timeElapsed: 900,
            },
          ],
        },
        topCountries: [
          { countryCode: "US", totalSent: 450, deliveryRate: 96.2 },
          { countryCode: "GB", totalSent: 320, deliveryRate: 94.8 },
          { countryCode: "CA", totalSent: 280, deliveryRate: 93.1 },
        ],
        alerts: [
          {
            type: "HIGH_FAILURE_RATE",
            severity: "warning",
            message: "High failure rate detected in GB: 8.2%",
            timestamp: new Date().toISOString(),
          },
        ],
      };
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    }
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    try {
      await refetchDashboard();
      setLastUpdated(new Date());
      toast.success("Dashboard refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh dashboard:", error);
      toast.error("Failed to refresh dashboard");
    }
  };

  // Update last updated time when data changes
  useEffect(() => {
    if (dashboardData) {
      setLastUpdated(new Date());
    }
  }, [dashboardData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "FAILED":
        return "bg-red-100 text-red-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "SENT":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "bg-red-50 border-red-200 text-red-800";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  const formatTimeElapsed = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const formatTrend = (value: number) => {
    const isPositive = value > 0;
    const color = isPositive ? "text-green-600" : "text-red-600";
    const arrow = isPositive ? "↗" : "↘";
    return (
      <span className={`text-sm ${color} flex items-center`}>
        {arrow} {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <motion.div
        className="max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div className="mb-8 text-center" variants={itemVariants}>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Delivery Reports & Analytics
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Real-time delivery tracking, comprehensive analytics, and
            performance insights
          </p>
          <div className="mt-4 flex items-center justify-center space-x-4">
            <div className="flex items-center text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Live Updates
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isDashboardLoading}
              className="text-sm text-primary-600 hover:text-primary-800 flex items-center disabled:opacity-50"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div className="mb-6" variants={itemVariants}>
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: "dashboard", label: "Real-time Dashboard", icon: "📊" },
                { key: "reports", label: "Delivery Reports", icon: "📋" },
                { key: "analytics", label: "Analytics", icon: "📈" },
                { key: "insights", label: "Insights", icon: "💡" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.key
                      ? "border-primary-500 text-primary-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </motion.div>

        {/* Real-time Dashboard Tab */}
        {activeTab === "dashboard" && dashboardData && (
          <motion.div className="space-y-6" variants={itemVariants}>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Total Sent (24h)
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {dashboardData.summary.totalSent.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-blue-600"
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
                    </div>
                    {formatTrend(dashboardData.summary.trend.totalSent)}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Delivery Rate
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {dashboardData.summary.deliveryRate}%
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-green-600"
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
                    {formatTrend(dashboardData.summary.trend.deliveryRate)}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Avg Delivery Time
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {dashboardData.summary.avgDeliveryTime}s
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    {formatTrend(dashboardData.summary.trend.avgDeliveryTime)}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Total Cost (24h)
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      ${dashboardData.summary.totalCost.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-yellow-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                        />
                      </svg>
                    </div>
                    {formatTrend(dashboardData.summary.trend.totalCost)}
                  </div>
                </div>
              </div>
            </div>

            {/* Alerts Section */}
            {dashboardData.alerts && dashboardData.alerts.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  🚨 Active Alerts
                </h3>
                <div className="space-y-3">
                  {dashboardData.alerts.map((alert: any, index: number) => (
                    <div
                      key={index}
                      className={`p-3 rounded-md border ${getAlertColor(
                        alert.severity
                      )}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{alert.message}</p>
                        <span className="text-xs">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity & Active Messages */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Deliveries */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  📨 Recent Deliveries
                </h3>
                <div className="space-y-3">
                  {dashboardData.recentDeliveries.map((delivery: any) => (
                    <div
                      key={delivery.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                    >
                      <div className="flex items-center space-x-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            delivery.status
                          )}`}
                        >
                          {delivery.status}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {delivery.messageId}
                          </p>
                          <p className="text-xs text-gray-500">
                            {delivery.recipients} recipient(s) •{" "}
                            {delivery.senderId} • {delivery.countryCode}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          ${delivery.cost.toFixed(3)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {delivery.deliveredAt
                            ? new Date(
                                delivery.deliveredAt
                              ).toLocaleTimeString()
                            : new Date(delivery.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Messages */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    ⏳ Active Messages
                  </h3>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    {dashboardData.activeMessages.count} active
                  </span>
                </div>
                <div className="space-y-3">
                  {dashboardData.activeMessages.messages.map((message: any) => (
                    <div
                      key={message.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                    >
                      <div className="flex items-center space-x-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            message.status
                          )}`}
                        >
                          {message.status}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {message.messageId}
                          </p>
                          <p className="text-xs text-gray-500">
                            {message.recipients} recipient(s) •{" "}
                            {message.senderId}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatTimeElapsed(message.timeElapsed)}
                        </p>
                        <p className="text-xs text-gray-500">elapsed</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Countries */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                🌍 Top Countries (24h)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dashboardData.topCountries.map(
                  (country: any, index: number) => (
                    <div
                      key={country.countryCode}
                      className="p-4 bg-gray-50 rounded-md"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-semibold text-gray-900">
                          {country.countryCode}
                        </span>
                        <span className="text-sm text-gray-500">
                          #{index + 1}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Sent:</span>
                          <span className="font-medium">
                            {country.totalSent.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Delivery Rate:</span>
                          <span className="font-medium text-green-600">
                            {country.deliveryRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Other tabs content will be added here */}
        {activeTab === "reports" && (
          <motion.div
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            variants={itemVariants}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              📋 Delivery Reports
            </h2>
            <p className="text-gray-600">
              Detailed delivery reports functionality will be implemented here.
            </p>
          </motion.div>
        )}

        {activeTab === "analytics" && (
          <motion.div
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            variants={itemVariants}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              📈 Analytics
            </h2>
            <p className="text-gray-600">
              Comprehensive analytics dashboard will be implemented here.
            </p>
          </motion.div>
        )}

        {activeTab === "insights" && (
          <motion.div
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            variants={itemVariants}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              💡 Insights
            </h2>
            <p className="text-gray-600">
              AI-powered insights and recommendations will be implemented here.
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default DeliveryReportsPage;
