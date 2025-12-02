import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

interface StatsCardProps {
  title: string;
  value: string | number;
  description: string | React.ReactNode;
  icon: React.ReactNode;
  actionLink?: string;
  actionText?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  description,
  icon,
  actionLink,
  actionText,
}) => {
  return (
    <motion.div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6"
      whileHover={{ y: -3 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1 mr-3">
          <h3 className="text-gray-500 text-xs sm:text-sm font-medium truncate">
            {title}
          </h3>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mt-1 break-words">
            {value}
          </p>
          <div className="text-xs sm:text-sm text-gray-600 mt-1">
            {description}
          </div>
        </div>
        <div className="text-primary-100 bg-primary-50 rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      </div>

      {actionLink && actionText && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
          <Link
            href={actionLink}
            className="text-primary-600 hover:text-primary-700 font-medium text-xs sm:text-sm flex items-center transition-colors"
          >
            <span>{actionText}</span>
            <svg
              className="ml-1 w-3 h-3 sm:w-4 sm:h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              ></path>
            </svg>
          </Link>
        </div>
      )}
    </motion.div>
  );
};

export default StatsCard;
