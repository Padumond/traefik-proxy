"use client";

import { motion } from "framer-motion";
import DeliveryStatusChart from "../charts/DeliveryStatusChart";
import MessageVolumeChart from "../charts/MessageVolumeChart";
import MonthlyDeliveryChart from "../charts/MonthlyDeliveryChart";

interface ChartsSectionProps {
  // Optional props for passing real data to charts
  deliveryStatusData?: {
    delivered: number;
    failed: number;
    pending: number;
  };
  messageVolumeData?: {
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
  monthlyData?: Array<{
    month: string;
    deliveryRate: number;
    messageCount: number;
  }>;
}

const ChartsSection = ({
  deliveryStatusData,
  messageVolumeData,
  monthlyData,
}: ChartsSectionProps) => {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  return (
    <motion.div
      className="mt-4 sm:mt-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.h2
        className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4"
        variants={itemVariants}
      >
        Analytics Overview
      </motion.h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Delivery Status Chart */}
        <motion.div variants={itemVariants}>
          <DeliveryStatusChart data={deliveryStatusData} />
        </motion.div>

        {/* Message Volume Chart */}
        <motion.div
          variants={itemVariants}
          className="md:col-span-1 xl:col-span-2"
        >
          <MessageVolumeChart data={messageVolumeData} />
        </motion.div>

        {/* Monthly Delivery Success Rate Chart */}
        <motion.div
          variants={itemVariants}
          className="md:col-span-2 xl:col-span-3"
        >
          <MonthlyDeliveryChart data={monthlyData} />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ChartsSection;
