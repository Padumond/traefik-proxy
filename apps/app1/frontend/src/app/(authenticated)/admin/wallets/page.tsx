"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  useGetUsersQuery,
  useCreditWalletMutation,
  useDebitWalletMutation,
  useGetWalletTransactionsQuery,
} from "@/redux/services/adminApi";
// import { toast } from 'sonner';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

interface WalletActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  action: "credit" | "debit";
  onSubmit: (amount: number, description: string) => void;
}

const WalletActionModal: React.FC<WalletActionModalProps> = ({
  isOpen,
  onClose,
  user,
  action,
  onSubmit,
}) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (numAmount > 0) {
      onSubmit(numAmount, description);
      setAmount("");
      setDescription("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">
          {action === "credit" ? "Credit" : "Debit"} Wallet - {user?.name}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (₵)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={3}
              placeholder="Reason for this transaction..."
            />
          </div>
          <div className="flex space-x-3">
            <button
              type="submit"
              className={`flex-1 py-2 px-4 rounded-md text-white font-medium ${
                action === "credit"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {action === "credit" ? "Credit" : "Debit"} Wallet
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function AdminWalletsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("clients");
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    user: any;
    action: "credit" | "debit";
  }>({
    isOpen: false,
    user: null,
    action: "credit",
  });

  const itemsPerPage = 10;

  // Fetch users data
  const {
    data: usersResponse,
    isLoading: usersLoading,
    error: usersError,
  } = useGetUsersQuery({
    page: currentPage,
    limit: itemsPerPage,
    search: searchTerm,
    role: "CLIENT",
  });

  // Fetch transactions data
  const {
    data: transactionsResponse,
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useGetWalletTransactionsQuery({
    page: currentPage,
    limit: itemsPerPage,
  });

  const [creditWallet] = useCreditWalletMutation();
  const [debitWallet] = useDebitWalletMutation();

  // Safely extract users array from API response
  const users = Array.isArray(usersResponse?.data) ? usersResponse.data : [];
  const transactions = Array.isArray(transactionsResponse?.data)
    ? transactionsResponse.data
    : [];
  const totalPages = Math.ceil((usersResponse?.total || 0) / itemsPerPage);

  // Debug logging for development
  if (process.env.NODE_ENV === "development") {
    console.log("Users Response:", usersResponse);
    console.log("Users Array:", users);
    console.log("Is Users Array:", Array.isArray(users));
  }

  const handleWalletAction = async (amount: number, description: string) => {
    try {
      const { user, action } = modalState;
      const payload = {
        userId: user.id,
        amount,
        description:
          description || `${action === "credit" ? "Credit" : "Debit"} by admin`,
      };

      if (action === "credit") {
        await creditWallet(payload).unwrap();
        console.log(
          `₵${amount.toLocaleString()} credited to ${user.name}'s wallet`
        );
        // toast.success(`₵${amount.toLocaleString()} credited to ${user.name}'s wallet`);
      } else {
        await debitWallet(payload).unwrap();
        console.log(
          `₵${amount.toLocaleString()} debited from ${user.name}'s wallet`
        );
        // toast.success(`₵${amount.toLocaleString()} debited from ${user.name}'s wallet`);
      }
    } catch (error) {
      console.error("Failed to update wallet");
      console.error("Error updating wallet:", error);
      // toast.error("Failed to update wallet");
    }
  };

  const openModal = (user: any, action: "credit" | "debit") => {
    setModalState({ isOpen: true, user, action });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, user: null, action: "credit" });
  };

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-gray-900">Wallet Management</h1>
        <p className="text-gray-600 mt-2">
          Manage client wallets and view transaction history
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("clients")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "clients"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Client Wallets
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "transactions"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              All Transactions
            </button>
          </nav>
        </div>
      </motion.div>

      {activeTab === "clients" && (
        <motion.div
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          variants={itemVariants}
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Client Wallets
              </h2>
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : usersError ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Error loading users
              </h3>
              <p className="text-gray-600 mb-4">
                There was an error loading the user data. Please try again.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Retry
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No clients found
              </h3>
              <p className="text-gray-600">
                No clients match your current search criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wallet Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user: any) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-primary-600 font-medium text-sm">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg font-semibold text-gray-900">
                          ₵{user.walletBalance?.toLocaleString() || "0"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openModal(user, "credit")}
                            className="text-green-600 hover:text-green-900 px-3 py-1 border border-green-300 rounded-md hover:bg-green-50"
                          >
                            Credit
                          </button>
                          <button
                            onClick={() => openModal(user, "debit")}
                            className="text-red-600 hover:text-red-900 px-3 py-1 border border-red-300 rounded-md hover:bg-red-50"
                          >
                            Debit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === "transactions" && (
        <motion.div
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          variants={itemVariants}
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              All Transactions
            </h2>
          </div>

          {transactionsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction: any) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.user?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {transaction.user?.email}
                        </div>
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className={`text-sm font-medium ${
                            transaction.type === "CREDIT"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.type === "CREDIT" ? "+" : "-"}₦
                          {transaction.amount?.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {transaction.description || "No description"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(transaction.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* Wallet Action Modal */}
      <WalletActionModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        user={modalState.user}
        action={modalState.action}
        onSubmit={handleWalletAction}
      />
    </motion.div>
  );
}
