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

interface MessageVolumeChartProps {
  data?: {
    daily: {
      labels: string[];
      values: number[];
    };
    weekly: {
      labels: string[];
      values: number[];
    };
    monthly: {
      labels: string[];
      values: number[];
    };
  };
  timeframe?: "daily" | "weekly" | "monthly";
}

const MessageVolumeChart = ({
  data,
  timeframe = "daily",
}: MessageVolumeChartProps) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);

  // Use provided data from API for all timeframes
  const chartData = (() => {
    if (
      data &&
      data[selectedTimeframe] &&
      data[selectedTimeframe].labels.length > 0
    ) {
      return data[selectedTimeframe]; // Use real API data for the selected timeframe
    }
    // Return empty data if no API data available
    return {
      labels: [],
      values: [],
    };
  })();

  // Chart configuration
  const chartConfig = {
    labels: chartData.labels,
    datasets: [
      {
        label: "Message Volume",
        data: chartData.values,
        borderColor: "rgba(99, 102, 241, 1)",
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        borderWidth: 2,
        pointBackgroundColor: "rgba(99, 102, 241, 1)",
        pointBorderColor: "#fff",
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        callbacks: {
          label: function (context: any) {
            return `Messages: ${context.raw.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          callback: function (value: any) {
            if (value >= 1000) {
              return (value / 1000).toFixed(1) + "k";
            }
            return value;
          },
        },
      },
    },
    interaction: {
      mode: "nearest" as const,
      axis: "x" as const,
      intersect: false,
    },
  };

  const handleTimeframeChange = (
    newTimeframe: "daily" | "weekly" | "monthly"
  ) => {
    setSelectedTimeframe(newTimeframe);
  };

  // Calculate total messages
  const totalMessages = chartData.values.reduce(
    (sum, current) => sum + current,
    0
  );

  // Calculate percentage change (mock data)
  const percentageChange =
    selectedTimeframe === "daily"
      ? 12.5
      : selectedTimeframe === "weekly"
      ? 8.3
      : 5.7;
  const isPositiveChange = percentageChange > 0;

  return (
    <motion.div
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-800">Message Volume</h3>
          {data &&
            data[selectedTimeframe] &&
            data[selectedTimeframe].labels.length > 0 && (
              <p className="text-xs text-green-600 font-medium">● Live Data</p>
            )}
          {(!data ||
            !data[selectedTimeframe] ||
            data[selectedTimeframe].labels.length === 0) && (
            <p className="text-xs text-gray-500">● No Data Available</p>
          )}
        </div>
        <div className="mt-2 sm:mt-0 flex space-x-2">
          <button
            type="button"
            onClick={() => handleTimeframeChange("daily")}
            className={`px-3 py-1 text-xs rounded-md ${
              selectedTimeframe === "daily"
                ? "bg-primary-100 text-primary-700 font-medium"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => handleTimeframeChange("weekly")}
            className={`px-3 py-1 text-xs rounded-md ${
              selectedTimeframe === "weekly"
                ? "bg-primary-100 text-primary-700 font-medium"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => handleTimeframeChange("monthly")}
            className={`px-3 py-1 text-xs rounded-md ${
              selectedTimeframe === "monthly"
                ? "bg-primary-100 text-primary-700 font-medium"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500">Total Messages</p>
          <p className="text-2xl font-bold text-gray-800">
            {totalMessages.toLocaleString()}
          </p>
        </div>
        <div
          className={`flex items-center mt-2 sm:mt-0 ${
            isPositiveChange ? "text-green-600" : "text-red-600"
          }`}
        >
          {isPositiveChange ? (
            <svg
              className="w-4 h-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                clipRule="evenodd"
              ></path>
            </svg>
          ) : (
            <svg
              className="w-4 h-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M12 13a1 1 0 100 2h5a1 1 0 001-1v-5a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586l-4.293-4.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z"
                clipRule="evenodd"
              ></path>
            </svg>
          )}
          <span className="text-sm font-medium">
            {Math.abs(percentageChange)}% from previous{" "}
            {selectedTimeframe.slice(0, -2)}
          </span>
        </div>
      </div>

      <div className="h-64">
        <Line data={chartConfig} options={options} />
      </div>
    </motion.div>
  );
};

export default MessageVolumeChart;
