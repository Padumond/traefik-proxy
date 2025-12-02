"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { motion } from "framer-motion";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MonthlyData {
  month: string;
  deliveryRate: number;
  messageCount: number;
}

interface MonthlyDeliveryChartProps {
  data?: MonthlyData[];
}

const MonthlyDeliveryChart = ({ data }: MonthlyDeliveryChartProps) => {
  // Use provided data from API, or empty array if no data
  const chartData = data && data.length > 0 ? data : [];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  // Calculate average delivery rate
  const totalMessages = chartData.reduce(
    (sum, item) => sum + item.messageCount,
    0
  );
  const weightedSum = chartData.reduce(
    (sum, item) => sum + item.deliveryRate * item.messageCount,
    0
  );
  const averageDeliveryRate =
    totalMessages > 0 ? (weightedSum / totalMessages).toFixed(1) : "0.0";

  // Calculate month-to-month trend
  const currentMonth = chartData[chartData.length - 1];
  const previousMonth = chartData[chartData.length - 2];
  const trend =
    previousMonth && previousMonth.deliveryRate > 0
      ? (
          ((currentMonth.deliveryRate - previousMonth.deliveryRate) /
            previousMonth.deliveryRate) *
          100
        ).toFixed(1)
      : "0.0";

  const trendIsPositive = parseFloat(trend) >= 0;

  const lineChartData = {
    labels: chartData.map((item) => item.month),
    datasets: [
      {
        label: "Delivery Success Rate (%)",
        data: chartData.map((item) => item.deliveryRate),
        borderColor: "rgba(79, 70, 229, 1)",
        backgroundColor: "rgba(79, 70, 229, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "rgba(79, 70, 229, 1)",
        pointBorderColor: "#fff",
        pointBorderWidth: 1,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const monthData = chartData[context.dataIndex];
            return [
              `Success Rate: ${context.raw.toFixed(1)}%`,
              `Message Count: ${monthData.messageCount.toLocaleString()}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: false,
        min: Math.max(
          Math.floor(
            Math.min(...chartData.map((item) => item.deliveryRate)) - 5
          ),
          0
        ),
        max: 100,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          callback: function (value: any) {
            return value + "%";
          },
        },
      },
    },
  };

  return (
    <motion.div
      className="bg-white p-5 rounded-lg shadow-sm border border-gray-100"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="flex items-center justify-between mb-1"
        variants={itemVariants}
      >
        <h2 className="text-lg font-semibold">
          Month-on-Month Delivery Success Rate
        </h2>
        {data && data.length > 0 && (
          <p className="text-xs text-green-600 font-medium">● Live Data</p>
        )}
        {(!data || data.length === 0) && (
          <p className="text-xs text-gray-500">● No Data Available</p>
        )}
      </motion.div>
      <motion.p className="text-sm text-gray-500 mb-4" variants={itemVariants}>
        Tracking delivery performance over time
      </motion.p>

      <motion.div className="h-64" variants={itemVariants}>
        {chartData.length > 0 ? (
          <Line data={lineChartData} options={lineChartOptions} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p className="text-sm">No delivery data available</p>
              <p className="text-xs text-gray-400 mt-1">
                Send some messages to see trends
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {chartData.length > 0 && (
        <motion.div className="mt-6" variants={itemVariants}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-base font-medium text-gray-700">
              Performance Summary
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 shadow-sm">
            <p className="text-sm text-indigo-700 font-medium mb-1">
              Average Success Rate
            </p>
            <p className="text-2xl font-bold text-indigo-900">
              {averageDeliveryRate}%
            </p>
            <p className="text-xs text-indigo-600 mt-1">
              Based on {totalMessages.toLocaleString()} messages
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-700 font-medium mb-1">
              Monthly Trend
            </p>
            <p
              className={`text-2xl font-bold flex items-center ${
                trendIsPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {trendIsPositive ? "+" : ""}
              {trend}%
              <span className="ml-2">
                {trendIsPositive ? (
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
                      d="M5 15l7-7 7 7"
                    ></path>
                  </svg>
                ) : (
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
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                )}
              </span>
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Compared to previous month
            </p>
          </div>
        </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default MonthlyDeliveryChart;
