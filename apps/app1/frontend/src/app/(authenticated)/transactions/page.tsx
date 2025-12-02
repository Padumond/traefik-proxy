"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  useGetAllTransactionsQuery,
  useGetWalletTopupsQuery,
  useGetMessagePurchasesQuery,
  useGetPaymentReceiptsQuery,
  useExportTransactionsMutation,
} from "@/redux/services/transactionsApi";
import {
  LoadingSpinner,
  LoadingSkeleton,
} from "@/components/ui/LoadingSpinner";
import { formatCurrency } from "@/lib/api-config";

export default function TransactionsPage() {
  // State for active submenu tab
  const [activeSubMenu, setActiveSubMenu] =
    useState<string>("all-transactions");

  // Pagination and filtering state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // API hooks based on active tab
  const {
    data: allTransactionsData,
    isLoading: allTransactionsLoading,
    error: allTransactionsError,
  } = useGetAllTransactionsQuery(
    { page, limit },
    { skip: activeSubMenu !== "all-transactions" }
  );

  const {
    data: walletTopupsData,
    isLoading: walletTopupsLoading,
    error: walletTopupsError,
  } = useGetWalletTopupsQuery(
    { page, limit },
    { skip: activeSubMenu !== "wallet-topup" }
  );

  const {
    data: messagePurchasesData,
    isLoading: messagePurchasesLoading,
    error: messagePurchasesError,
  } = useGetMessagePurchasesQuery(
    { page, limit },
    { skip: activeSubMenu !== "message-purchases" }
  );

  const {
    data: paymentReceiptsData,
    isLoading: paymentReceiptsLoading,
    error: paymentReceiptsError,
  } = useGetPaymentReceiptsQuery(
    { page, limit },
    { skip: activeSubMenu !== "payment-receipts" }
  );

  const [exportTransactions] = useExportTransactionsMutation();

  // Handle export
  const handleExport = async () => {
    try {
      const result = await exportTransactions({
        format: "csv",
        filters: { page, limit },
      }).unwrap();

      // Create download link
      const url = window.URL.createObjectURL(result);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Transactions exported successfully!");
    } catch (error) {
      toast.error("Failed to export transactions");
    }
  };

  // Helper component for rendering transaction tables
  const TransactionTable = ({
    data,
    isLoading,
    error,
    emptyMessage = "No transactions found",
  }: {
    data: any;
    isLoading: boolean;
    error: any;
    emptyMessage?: string;
  }) => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <LoadingSkeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">⚠️ Error loading data</div>
          <p className="text-gray-600">Please try again later</p>
        </div>
      );
    }

    // Safely extract transactions array from different response formats
    let transactions = [];
    if (data?.data?.transactions && Array.isArray(data.data.transactions)) {
      transactions = data.data.transactions;
    } else if (Array.isArray(data?.data)) {
      transactions = data.data;
    } else if (data?.data && typeof data.data === "object") {
      // Handle case where data might be a single object or other structure
      transactions = [];
    }

    if (transactions.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📊</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {emptyMessage}
          </h3>
          <p className="text-gray-600">
            Your transaction history will appear here once you have activity.
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((transaction: any) => (
              <tr key={transaction.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(
                    transaction.createdAt || transaction.date
                  ).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      transaction.type === "CREDIT"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {transaction.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {transaction.description || "Transaction"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(transaction.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      transaction.status === "COMPLETED"
                        ? "bg-green-100 text-green-800"
                        : transaction.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {transaction.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
              <p className="text-sm text-gray-600 mt-1">
                View and manage your account transactions
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {/* Top Up Button */}
              <button
                type="button"
                className="flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  ></path>
                </svg>
                Top Up Wallet
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                >
                  <svg
                    className="-ml-1 mr-2 h-5 w-5 text-gray-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Submenu Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav
            className="-mb-px flex space-x-6 overflow-x-auto"
            aria-label="Transaction features"
          >
            <button
              type="button"
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeSubMenu === "all-transactions"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveSubMenu("all-transactions")}
            >
              All Transactions
            </button>
            <button
              type="button"
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeSubMenu === "wallet-topup"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveSubMenu("wallet-topup")}
            >
              Wallet Top-up
            </button>
            <button
              type="button"
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeSubMenu === "message-purchases"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveSubMenu("message-purchases")}
            >
              Message Purchases
            </button>
            <button
              type="button"
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeSubMenu === "payment-receipts"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveSubMenu("payment-receipts")}
            >
              Payment Receipts
            </button>
          </nav>
        </div>

        {/* Transaction Content */}
        <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          {activeSubMenu === "all-transactions" && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                All Transactions
              </h2>
              <p className="text-gray-600 mb-6">
                View all your account transactions.
              </p>
              <TransactionTable
                data={allTransactionsData}
                isLoading={allTransactionsLoading}
                error={allTransactionsError}
                emptyMessage="No transactions found"
              />
            </div>
          )}

          {activeSubMenu === "wallet-topup" && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Wallet Top-up History
              </h2>
              <p className="text-gray-600 mb-6">
                View all your wallet top-up transactions.
              </p>
              <TransactionTable
                data={walletTopupsData}
                isLoading={walletTopupsLoading}
                error={walletTopupsError}
                emptyMessage="No wallet top-ups found"
              />
            </div>
          )}

          {activeSubMenu === "message-purchases" && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Message Purchases
              </h2>
              <p className="text-gray-600 mb-6">
                View all your message purchase transactions.
              </p>
              <TransactionTable
                data={messagePurchasesData}
                isLoading={messagePurchasesLoading}
                error={messagePurchasesError}
                emptyMessage="No message purchases found"
              />
            </div>
          )}

          {activeSubMenu === "payment-receipts" && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Payment Receipts
              </h2>
              <p className="text-gray-600 mb-6">
                View and download receipts for all your payments.
              </p>
              <TransactionTable
                data={paymentReceiptsData}
                isLoading={paymentReceiptsLoading}
                error={paymentReceiptsError}
                emptyMessage="No payment receipts found"
              />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
