import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

// Define type for messages
interface Message {
  id: string;
  recipients: number;
  message: string;
  senderId: string;
  date: string;
  status: string;
}

interface RecentMessagesCardProps {
  messages: Message[];
}

const RecentMessagesCard: React.FC<RecentMessagesCardProps> = ({
  messages = [],
}) => {
  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  // Truncate message content
  const truncateMessage = (message: string, maxLength: number = 30): string => {
    return message.length > maxLength
      ? message.substring(0, maxLength) + "..."
      : message;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
            Delivered
          </span>
        );
      case "failed":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
            Failed
          </span>
        );
      case "pending":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      case "processing":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
            Processing
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-lg text-gray-800">
            Recent Messages
          </h2>
          <Link
            href="/messages"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            View All
          </Link>
        </div>
      </div>

      <div className="px-6 py-4 divide-y divide-gray-200">
        {messages.length === 0 ? (
          <p className="text-gray-500 py-4 text-center">No recent messages</p>
        ) : (
          messages.map((message, index) => (
            <motion.div
              key={message.id}
              className="py-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-gray-900 font-medium">
                    <span className="font-semibold text-gray-800">
                      {message.senderId}
                    </span>
                  </p>
                  <p className="text-gray-600 text-sm mt-1">
                    {truncateMessage(message.message)}
                  </p>
                </div>
                <div className="text-right ml-4">
                  {getStatusBadge(message.status)}
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(message.date)}
                  </p>
                </div>
              </div>
              <div className="mt-1 text-sm text-gray-500">
                <span className="inline-flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    ></path>
                  </svg>
                  {message.recipients} recipients
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecentMessagesCard;
