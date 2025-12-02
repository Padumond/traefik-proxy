import React from "react";
import { motion } from "framer-motion";

interface AverageSuccessRateData {
  overall: number;
  last30Days: number;
  last7Days: number;
  trend: number;
}

interface AverageSuccessRateCardProps {
  data?: AverageSuccessRateData;
}

const AverageSuccessRateCard: React.FC<AverageSuccessRateCardProps> = ({
  data,
}) => {
  // Default data if none provided
  const defaultData: AverageSuccessRateData = {
    overall: 0,
    last30Days: 0,
    last7Days: 0,
    trend: 0,
  };

  const successRateData = data || defaultData;

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

  // Determine trend color and icon
  const getTrendColor = (trend: number) => {
    if (trend > 0) return "text-green-600";
    if (trend < 0) return "text-red-600";
    return "text-gray-500";
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    if (trend < 0) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  return (
    <motion.div
      className="bg-white p-6 rounded-lg shadow-sm border border-gray-100"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="flex items-center justify-between mb-4" variants={itemVariants}>
        <h3 className="text-lg font-medium text-gray-800">Average Success Rate</h3>
        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
          Analytics
        </div>
      </motion.div>

      {/* Main Success Rate */}
      <motion.div className="mb-6" variants={itemVariants}>
        <div className="text-center">
          <div className="text-4xl font-bold text-gray-900 mb-2">
            {successRateData.overall.toFixed(1)}%
          </div>
          <p className="text-sm text-gray-500">Overall Success Rate</p>
        </div>
      </motion.div>

      {/* Period Breakdown */}
      <motion.div className="grid grid-cols-2 gap-4 mb-4" variants={itemVariants}>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-xl font-semibold text-gray-800">
            {successRateData.last30Days.toFixed(1)}%
          </div>
          <p className="text-xs text-gray-500">Last 30 Days</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-xl font-semibold text-gray-800">
            {successRateData.last7Days.toFixed(1)}%
          </div>
          <p className="text-xs text-gray-500">Last 7 Days</p>
        </div>
      </motion.div>

      {/* Trend Indicator */}
      <motion.div className="flex items-center justify-center" variants={itemVariants}>
        <div className={`flex items-center space-x-1 ${getTrendColor(successRateData.trend)}`}>
          {getTrendIcon(successRateData.trend)}
          <span className="text-sm font-medium">
            {Math.abs(successRateData.trend).toFixed(1)}%
          </span>
          <span className="text-xs text-gray-500">
            {successRateData.trend > 0 ? "increase" : successRateData.trend < 0 ? "decrease" : "no change"}
          </span>
        </div>
      </motion.div>

      {/* Data Indicator */}
      <motion.div className="mt-4 text-center" variants={itemVariants}>
        {data && (data.overall > 0 || data.last30Days > 0 || data.last7Days > 0) ? (
          <p className="text-xs text-green-600 font-medium">● Live Data</p>
        ) : (
          <p className="text-xs text-gray-500">● No Data Available</p>
        )}
      </motion.div>
    </motion.div>
  );
};

export default AverageSuccessRateCard;
