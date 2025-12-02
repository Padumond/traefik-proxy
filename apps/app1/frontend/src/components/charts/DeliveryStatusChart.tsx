"use client";

import { useEffect, useState } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { motion } from "framer-motion";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

interface DeliveryStatusChartProps {
  data?: {
    delivered: number;
    failed: number;
    pending: number;
  };
}

const DeliveryStatusChart = ({ data }: DeliveryStatusChartProps) => {
  // Use provided data or empty data if none available
  const rawData = data || {
    delivered: 0,
    failed: 0,
    pending: 0,
  };

  // Calculate total and percentages
  const total = rawData.delivered + rawData.failed + rawData.pending;
  const chartData =
    total > 0
      ? {
          delivered: Math.round((rawData.delivered / total) * 100),
          failed: Math.round((rawData.failed / total) * 100),
          pending: Math.round((rawData.pending / total) * 100),
        }
      : {
          delivered: 0,
          failed: 0,
          pending: 0,
        };

  // Chart configuration
  const chartConfig = {
    labels: ["Delivered", "Failed", "Pending"],
    datasets: [
      {
        data: [rawData.delivered, rawData.failed, rawData.pending],
        backgroundColor: [
          "rgba(34, 197, 94, 0.7)", // green for delivered
          "rgba(239, 68, 68, 0.7)", // red for failed
          "rgba(234, 179, 8, 0.7)", // yellow for pending
        ],
        borderColor: [
          "rgba(34, 197, 94, 1)",
          "rgba(239, 68, 68, 1)",
          "rgba(234, 179, 8, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const label = context.label || "";
            const value = context.raw || 0;
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + b,
              0
            );
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${percentage}% (${value})`;
          },
        },
      },
    },
    cutout: "70%",
  };

  return (
    <motion.div
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-800">
          Message Delivery Status
        </h3>
        {data && total > 0 && (
          <p className="text-xs text-green-600 font-medium">● Live Data</p>
        )}
        {(!data || total === 0) && (
          <p className="text-xs text-gray-500">● No Data Available</p>
        )}
      </div>
      <div className="h-64 flex items-center justify-center">
        {total > 0 ? (
          <Doughnut data={chartConfig} options={options} />
        ) : (
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm">
              Send your first message to see delivery statistics
            </p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="text-center">
          <p className="text-sm text-gray-500">Delivered</p>
          <p className="text-lg font-semibold text-green-600">
            {total > 0 ? `${chartData.delivered}%` : `${rawData.delivered}`}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Failed</p>
          <p className="text-lg font-semibold text-red-600">
            {total > 0 ? `${chartData.failed}%` : `${rawData.failed}`}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-lg font-semibold text-yellow-600">
            {total > 0 ? `${chartData.pending}%` : `${rawData.pending}`}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default DeliveryStatusChart;
