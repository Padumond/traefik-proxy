"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { motion } from "framer-motion";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface RegionData {
  region: string;
  deliveryRate: number;
  messageCount: number;
}

interface DeliveryByRegionChartProps {
  data?: RegionData[];
}

const DeliveryByRegionChart = ({ data }: DeliveryByRegionChartProps) => {
  // Use provided data or empty array if no data available
  const chartData = data && data.length > 0 ? data : [];

  // Sort data by delivery rate
  const sortedData = [...chartData].sort(
    (a, b) => b.deliveryRate - a.deliveryRate
  );

  // Chart configuration
  const barChartConfig = {
    labels: sortedData.map((item) => item.region),
    datasets: [
      {
        data: sortedData.map((item) => item.deliveryRate),
        backgroundColor: "rgba(79, 70, 229, 0.8)",
        borderColor: "rgba(79, 70, 229, 1)",
        borderWidth: 1,
        borderRadius: 4,
        barThickness: 24,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y" as const,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const item = sortedData[context.dataIndex];
            return [
              `Delivery Rate: ${item.deliveryRate}%`,
              `Messages: ${item.messageCount.toLocaleString()}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: "Delivery Success Rate (%)",
          color: "#6B7280",
          font: {
            size: 12,
          },
        },
        ticks: {
          callback: function (value: any) {
            return value + "%";
          },
        },
      },
      y: {
        title: {
          display: true,
          text: "Ghana Region",
          color: "#6B7280",
          font: {
            size: 12,
          },
        },
      },
    },
  };

  // Calculate average delivery rate across Ghana regions
  const totalMessages = sortedData.reduce(
    (sum, item) => sum + item.messageCount,
    0
  );
  const weightedSum = sortedData.reduce(
    (sum, item) => sum + item.deliveryRate * item.messageCount,
    0
  );
  const averageDeliveryRate = (weightedSum / totalMessages).toFixed(1);

  return (
    <motion.div
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-lg font-medium text-gray-800 mb-4">
        Delivery Success Rate by Ghana Region
      </h3>
      <div className="h-64">
        <Bar data={barChartConfig} options={barChartOptions} />
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Average Success Rate: {averageDeliveryRate}%</span>
          <span>
            Total Messages:{" "}
            {sortedData
              .reduce((sum, item) => sum + item.messageCount, 0)
              .toLocaleString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default DeliveryByRegionChart;
