import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/api-config";

// Define type for activities/transactions
interface Transaction {
  id: string;
  type: string;
  amount: number;
  credits?: number; // SMS credits for transactions
  date: string;
  description: string | null;
}

interface RecentActivityCardProps {
  transactions: Transaction[];
}

const RecentActivityCard: React.FC<RecentActivityCardProps> = ({
  transactions = [],
}) => {
  // Currency formatting is now handled by the imported formatCurrency function

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

  // Map transaction type to icon
  const getTransactionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "credit":
        return (
          <div className="bg-green-100 text-green-600 p-2 rounded-full">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              ></path>
            </svg>
          </div>
        );
      case "debit":
        return (
          <div className="bg-blue-100 text-blue-600 p-2 rounded-full">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              ></path>
            </svg>
          </div>
        );
      case "refund":
        return (
          <div className="bg-purple-100 text-purple-600 p-2 rounded-full">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              ></path>
            </svg>
          </div>
        );
      default:
        return (
          <div className="bg-gray-100 text-gray-600 p-2 rounded-full">
            <svg
              className="w-4 h-4"
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
          </div>
        );
    }
  };

  // Get transaction type display name
  const getTransactionTypeDisplay = (type: string) => {
    switch (type.toLowerCase()) {
      case "credit":
        return "Wallet Top Up";
      case "debit":
        return "SMS Charges";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-lg text-gray-800">
            Recent Activity
          </h2>
          <Link
            href="/transactions"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            View All
          </Link>
        </div>
      </div>

      <div className="px-6 py-4 divide-y divide-gray-200">
        {transactions.length === 0 ? (
          <p className="text-gray-500 py-4 text-center">
            No recent transactions
          </p>
        ) : (
          transactions.map((transaction, index) => (
            <motion.div
              key={transaction.id}
              className="py-3 flex items-center justify-between"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center space-x-3">
                {getTransactionIcon(transaction.type)}
                <div>
                  <p className="text-gray-900 font-medium">
                    {getTransactionTypeDisplay(transaction.type)}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {transaction.description || formatDate(transaction.date)}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {formatDate(transaction.date)}
                  </p>
                </div>
              </div>

              <div className="text-right">
                {/* Show credits only for SMS-related transactions, not wallet top-ups */}
                {transaction.credits && transaction.credits > 0 ? (
                  <>
                    <p
                      className={`font-semibold ${
                        transaction.type.toLowerCase() === "debit"
                          ? "text-red-600"
                          : transaction.type.toLowerCase() === "credit"
                          ? "text-green-600"
                          : "text-gray-600"
                      }`}
                    >
                      {transaction.type.toLowerCase() === "debit" ? "-" : "+"}
                      {transaction.credits.toLocaleString()} credits
                    </p>
                    <p className="text-gray-500 text-sm">
                      {formatCurrency(transaction.amount)}
                    </p>
                  </>
                ) : (
                  <>
                    <p
                      className={`font-semibold ${
                        transaction.type.toLowerCase() === "debit"
                          ? "text-red-600"
                          : transaction.type.toLowerCase() === "credit"
                          ? "text-green-600"
                          : "text-gray-600"
                      }`}
                    >
                      {transaction.type.toLowerCase() === "debit" ? "-" : "+"}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {transaction.description?.toLowerCase().includes("topup")
                        ? "Wallet Top-up"
                        : "Transaction"}
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecentActivityCard;
