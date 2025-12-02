"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  useGetUserBalanceQuery,
  useGetPurchaseHistoryQuery,
} from "@/redux/services/smsPackagesApi";
import { useAppSelector } from "@/redux/store";
import PurchaseSMSPlanModal from "@/components/modals/PurchaseSMSPlanModal";

// Dynamically import PaystackButton to avoid SSR issues (uses window)
const PaystackButton = dynamic(
  () => import("react-paystack").then((mod) => mod.PaystackButton),
  { ssr: false }
);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
    },
  },
};

// Pricing plans data
const pricingPlans = [
  {
    price: 20,
    smsCredits: 364,
    costPerSMS: 0.055,
    expiry: "No Expiry",
    popular: false,
  },
  {
    price: 50,
    smsCredits: 926,
    costPerSMS: 0.054,
    expiry: "No Expiry",
    popular: false,
  },
  {
    price: 100,
    smsCredits: 1887,
    costPerSMS: 0.053,
    expiry: "No Expiry",
    popular: false,
  },
  {
    price: 200,
    smsCredits: 3846,
    costPerSMS: 0.052,
    expiry: "No Expiry",
    popular: true,
  },
  {
    price: 500,
    smsCredits: 9804,
    costPerSMS: 0.051,
    expiry: "No Expiry",
    popular: false,
  },
  {
    price: 1000,
    smsCredits: 20000,
    costPerSMS: 0.05,
    expiry: "No Expiry",
    popular: false,
  },
  {
    price: 1500,
    smsCredits: 30612,
    costPerSMS: 0.049,
    expiry: "No Expiry",
    popular: false,
  },
  {
    price: 2000,
    smsCredits: 41667,
    costPerSMS: 0.048,
    expiry: "No Expiry",
    popular: false,
  },
];

function PackagesPage() {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"packages" | "history">(
    "packages"
  );
  const [customAmount, setCustomAmount] = useState<string>("");
  const [customAmountError, setCustomAmountError] = useState<string>("");
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  // Get user and token from Redux store
  const { user, token: authToken } = useAppSelector((state) => state.auth);

  // API Hooks
  const { data: balanceData } = useGetUserBalanceQuery();
  const { data: purchaseHistoryData, isLoading: isLoadingHistory } =
    useGetPurchaseHistoryQuery({ page: 1, limit: 10 });

  const currentBalance = balanceData?.data?.balance || 0;
  const currentSmsCredits = balanceData?.data?.smsCredits || 0;
  const purchaseHistory = purchaseHistoryData?.data || [];

  // Paystack configuration
  const paystackPublicKey =
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
    "pk_test_your_paystack_public_key_here";

  // Validate key format
  const isValidKey =
    paystackPublicKey.startsWith("pk_test_") ||
    paystackPublicKey.startsWith("pk_live_");

  if (!isValidKey) {
    console.error(
      "Invalid Paystack key format. Key should start with 'pk_test_' or 'pk_live_'"
    );
  }

  // Custom package constants and calculations
  const CUSTOM_SMS_RATE = 0.059; // GH₵0.059 per SMS
  const MIN_CUSTOM_AMOUNT = 1; // Temporarily set to GH₵1 for testing
  const MAX_CUSTOM_AMOUNT = 10000;

  const calculateCustomCredits = (amount: number) => {
    return Math.floor(amount / CUSTOM_SMS_RATE);
  };

  const validateCustomAmount = (amount: string) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return "Please enter a valid amount";
    }
    if (numAmount < MIN_CUSTOM_AMOUNT) {
      return `Minimum amount is GH₵${MIN_CUSTOM_AMOUNT} (Testing)`;
    }
    if (numAmount > MAX_CUSTOM_AMOUNT) {
      return `Maximum amount is GH₵${MAX_CUSTOM_AMOUNT.toLocaleString()}`;
    }
    return "";
  };

  const handleCustomAmountChange = (value: string) => {
    // Allow only numbers and decimal point
    const regex = /^\d*\.?\d{0,2}$/;
    if (regex.test(value) || value === "") {
      setCustomAmount(value);
      setCustomAmountError(validateCustomAmount(value));
    }
  };

  // Paystack handlers
  const handlePaystackSuccess = async (reference: any, plan: any) => {
    console.log("Payment successful:", reference);

    try {
      // Get token from Redux store first, then fallback to localStorage
      let token = authToken;

      if (!token) {
        try {
          const authState = localStorage.getItem("mas3ndi_auth_state");
          if (authState) {
            const parsedState = JSON.parse(authState);
            token = parsedState.token;
          }
        } catch (error) {
          console.error("Failed to get token from localStorage:", error);
        }
      }

      if (!token) {
        toast.error("Authentication required. Please log in again.");
        return;
      }

      // Call backend API to update user balance and record purchase
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/sms-packages/paystack/success`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reference: reference.reference,
            amount: plan.price * 100, // Amount in kobo/pesewas
            metadata: {
              user_id: user?.id,
              sms_credits: plan.smsCredits,
              package_type: plan.isCustom ? "custom" : "standard",
              package_name: plan.isCustom
                ? `Custom SMS Package - GH₵${plan.price}`
                : `SMS Package - GH₵${plan.price}`,
            },
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast.success(
          `Payment successful! ${plan.smsCredits.toLocaleString()} SMS credits have been added to your account.`
        );

        // Clear custom amount if it was a custom package
        if (plan.isCustom) {
          setCustomAmount("");
          setCustomAmountError("");
        }

        // Refresh balance data by refetching
        window.location.reload(); // Simple way to refresh the balance
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update balance");
      }
    } catch (error) {
      console.error("Error updating balance:", error);
      toast.error(
        "Payment successful but failed to update balance. Please contact support."
      );
    }

    setIsProcessing(false);
    setSelectedPackage(null);
  };

  const handlePaystackClose = () => {
    console.log("Payment dialog closed");
    toast.error("Payment was cancelled");
    setIsProcessing(false);
    setSelectedPackage(null);
  };

  // Wallet-based purchase handler
  const handleWalletPurchase = async (plan: any) => {
    if (!user?.id) {
      toast.error("Authentication required. Please log in again.");
      return;
    }

    // Calculate credits based on plan
    const credits = plan.isCustom
      ? calculateCustomCredits(parseFloat(customAmount))
      : plan.smsCredits;

    // Calculate cost (1 credit = 0.05 GHS)
    const CREDIT_RATE = 0.05;
    const totalCost = credits * CREDIT_RATE;

    // Check if user has sufficient wallet balance
    if (currentBalance < totalCost) {
      toast.error(
        `Insufficient wallet balance. Required: ₵${totalCost.toFixed(
          2
        )}, Available: ₵${currentBalance.toFixed(
          2
        )}. Please top up your wallet first.`
      );
      return;
    }

    setIsProcessing(true);
    setSelectedPackage(plan.isCustom ? "custom" : plan.price.toString());

    try {
      // Get token from Redux store first, then fallback to localStorage
      let token = authToken;

      if (!token) {
        try {
          const authState = localStorage.getItem("mas3ndi_auth_state");
          if (authState) {
            const parsedState = JSON.parse(authState);
            token = parsedState.token;
          }
        } catch (error) {
          console.error("Failed to get token from localStorage:", error);
        }
      }

      if (!token) {
        toast.error("Authentication required. Please log in again.");
        return;
      }

      // Call backend API to purchase credits with wallet balance
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/sms-packages/credits/purchase-with-wallet`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            credits: credits,
            packageName: plan.isCustom
              ? `Custom SMS Package - ₵${customAmount}`
              : `SMS Package - ₵${plan.price}`,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();

        toast.success(
          `Successfully purchased ${credits.toLocaleString()} SMS credits for ₵${totalCost.toFixed(
            2
          )}!`
        );

        // Clear custom amount if it was a custom purchase
        if (plan.isCustom) {
          setCustomAmount("");
          setCustomAmountError("");
        }

        // Refresh balance data
        window.location.reload();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to purchase credits");
      }
    } catch (error: any) {
      console.error("Error purchasing credits with wallet:", error);
      toast.error(
        error.message || "Failed to purchase credits. Please try again."
      );
    }

    setIsProcessing(false);
    setSelectedPackage(null);
  };

  const formatCurrency = (
    amount: number | null | undefined,
    currency: string = "GHS"
  ) => {
    // Handle null, undefined, or invalid amounts
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return "GH₵0.00";
    }

    const numAmount = Number(amount);

    try {
      return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: currency === "GHS" ? "GHS" : "USD",
        minimumFractionDigits: 2,
      }).format(numAmount);
    } catch (error) {
      // Fallback if currency formatting fails
      return `GH₵${numAmount.toFixed(2)}`;
    }
  };

  // Modal handlers
  const handleOpenPurchaseModal = (plan: any) => {
    setSelectedPlan(plan);
    setShowPurchaseModal(true);
  };

  const handleClosePurchaseModal = () => {
    setShowPurchaseModal(false);
    setSelectedPlan(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <motion.div
        className="max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div className="text-center mb-12" variants={itemVariants}>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            📦 SMS Packages
          </h1>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto mb-6">
            Choose the plan that works best for your business. No hidden fees,
            no contracts, pay as you go.
          </p>

          {/* Debug Info - Remove in production */}
          {!isValidKey && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 max-w-md mx-auto">
              <strong>Configuration Error:</strong> Invalid Paystack key format.
              <br />
              <small>Key: {paystackPublicKey.substring(0, 20)}...</small>
            </div>
          )}

          {/* Current Balance */}
          <div className="inline-flex items-center bg-white rounded-full px-6 py-3 shadow-md border border-gray-200 mb-8">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Current Balance:</span>
              <span className="font-bold text-lg text-primary-600">
                {currentBalance.toLocaleString()} SMS Credits
              </span>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div className="mb-8" variants={itemVariants}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 max-w-md mx-auto">
            <div className="flex space-x-2">
              {[
                { key: "packages", label: "📦 Packages", icon: "📦" },
                { key: "history", label: "📋 Purchase History", icon: "📋" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
                    activeTab === tab.key
                      ? "bg-primary-500 text-white shadow-md"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <span className="flex items-center justify-center space-x-2">
                    <span>{tab.icon}</span>
                    <span className="hidden sm:inline">
                      {tab.label.replace(/^.+ /, "")}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Packages Tab */}
        {activeTab === "packages" && (
          <motion.div className="w-full mx-auto" variants={itemVariants}>
            {/* Table Headers */}
            <div className="grid grid-cols-5 text-sm md:text-base font-bold bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-t-xl overflow-hidden mb-4 shadow-lg">
              <div className="p-4 text-center font-semibold">Price (GHc)</div>
              <div className="p-4 text-center font-semibold">SMS Credits</div>
              <div className="p-4 text-center font-semibold">Cost Per SMS</div>
              <div className="p-4 text-center font-semibold">Expiry Status</div>
              <div className="p-4 text-center font-semibold">Action</div>
            </div>

            {/* Table Rows as Cards */}
            <div className="space-y-3">
              {pricingPlans.map((plan, index) => (
                <div
                  key={index}
                  className={`grid grid-cols-5 text-sm md:text-base hover:shadow-xl transition-all duration-300 rounded-lg overflow-hidden shadow-md border-2 ${
                    plan.popular
                      ? "bg-gradient-to-r from-primary-600 to-primary-700 border-primary-400 transform scale-105 shadow-xl"
                      : "bg-gradient-to-r from-gray-700 to-gray-800 border-gray-600"
                  } text-white`}
                >
                  <div className="p-4 flex items-center justify-center">
                    <div className="text-center">
                      <span className="font-bold text-white text-lg">
                        GHc {plan.price.toLocaleString()}
                      </span>
                      {plan.popular && (
                        <div className="mt-1">
                          <span className="bg-yellow-500 text-gray-900 text-xs px-2 py-1 rounded-full font-semibold shadow-md">
                            Popular
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4 text-center">
                    <span className="font-semibold text-white text-lg">
                      {plan.smsCredits.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-4 text-center">
                    <span className="font-bold text-white text-lg">
                      GHc {plan.costPerSMS.toFixed(3)}
                    </span>
                  </div>
                  <div className="p-4 text-center">
                    <div className="flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-green-400 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="font-semibold text-white text-lg">
                        {plan.expiry}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleOpenPurchaseModal(plan)}
                      className={`w-full px-4 py-2 rounded-lg font-semibold transition-all duration-200 text-sm ${
                        plan.popular
                          ? "bg-yellow-500 hover:bg-yellow-600 text-gray-900"
                          : "bg-white hover:bg-gray-100 text-gray-900"
                      }`}
                    >
                      💳 Pay
                    </button>
                  </div>
                </div>
              ))}

              {/* Custom Package Row */}
              <div className="grid grid-cols-5 text-sm md:text-base hover:shadow-xl transition-all duration-300 rounded-lg overflow-hidden shadow-md border-2 bg-gradient-to-r from-orange-500 to-orange-600 border-orange-400 text-white">
                {/* Price Column - Input Field */}
                <div className="p-4 flex items-center justify-center">
                  <div className="text-center w-full">
                    <div className="mb-2">
                      <span className="text-xs font-semibold text-orange-100">
                        Custom Amount
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-900 font-medium text-sm">
                        GH₵
                      </span>
                      <input
                        type="text"
                        value={customAmount}
                        onChange={(e) =>
                          handleCustomAmountChange(e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full pl-8 pr-2 py-2 text-gray-900 bg-white rounded-md text-center font-bold text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    </div>
                    {customAmountError && (
                      <div className="mt-1 text-xs text-red-200">
                        {customAmountError}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-orange-100">
                      Min: GH₵{MIN_CUSTOM_AMOUNT} | Max: GH₵
                      {MAX_CUSTOM_AMOUNT.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* SMS Credits Column - Auto-calculated */}
                <div className="p-4 text-center flex items-center justify-center">
                  <div>
                    <span className="font-semibold text-white text-lg">
                      {customAmount &&
                      !customAmountError &&
                      parseFloat(customAmount) >= MIN_CUSTOM_AMOUNT
                        ? calculateCustomCredits(
                            parseFloat(customAmount)
                          ).toLocaleString()
                        : "0"}
                    </span>
                    <div className="text-xs text-orange-100 mt-1">
                      Auto-calculated
                    </div>
                  </div>
                </div>

                {/* Cost Per SMS Column - Fixed Rate */}
                <div className="p-4 text-center flex items-center justify-center">
                  <div>
                    <span className="font-bold text-white text-lg">
                      GH₵{CUSTOM_SMS_RATE.toFixed(3)}
                    </span>
                    <div className="text-xs text-orange-100 mt-1">
                      Fixed Rate
                    </div>
                  </div>
                </div>

                {/* Expiry Status Column */}
                <div className="p-4 text-center flex items-center justify-center">
                  <div className="flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-green-400 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-semibold text-white text-lg">
                      No Expiry
                    </span>
                  </div>
                </div>

                {/* Action Column - Purchase Button */}
                <div className="p-4 flex flex-col items-center justify-center">
                  {customAmount &&
                  !customAmountError &&
                  parseFloat(customAmount) >= MIN_CUSTOM_AMOUNT ? (
                    <button
                      type="button"
                      onClick={() => {
                        const customPlan = {
                          price: parseFloat(customAmount),
                          smsCredits: calculateCustomCredits(
                            parseFloat(customAmount)
                          ),
                          costPerSMS: CUSTOM_SMS_RATE,
                          expiry: "No Expiry",
                          popular: false,
                          isCustom: true,
                        };
                        handleOpenPurchaseModal(customPlan);
                      }}
                      className="w-full px-4 py-2 rounded-lg font-semibold transition-all duration-200 bg-white hover:bg-gray-100 text-gray-900 text-sm"
                    >
                      💳 Pay
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={true}
                      className="w-full px-3 py-2 rounded-lg font-semibold transition-all duration-200 bg-gray-300 text-gray-500 cursor-not-allowed text-sm"
                    >
                      Enter Amount
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Purchase History Tab */}
        {activeTab === "history" && (
          <motion.div className="max-w-4xl mx-auto" variants={itemVariants}>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  📋 Purchase History
                </h2>
                <div className="text-sm text-gray-500">
                  {purchaseHistory.length} total purchases
                </div>
              </div>

              {isLoadingHistory ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading purchase history...</p>
                </div>
              ) : purchaseHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📦</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No purchases yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Your package purchase history will appear here once you make
                    your first purchase.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("packages")}
                    className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Browse Packages
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {purchaseHistory.map((purchase: any, index: number) => {
                    // Temporary debug log for first purchase
                    if (index === 0) {
                      console.log("Purchase data sample:", {
                        amountPaid: purchase.amountPaid,
                        paymentMethod: purchase.paymentMethod,
                        createdAt: purchase.createdAt,
                        currency: purchase.currency,
                        creditsReceived: purchase.creditsReceived,
                      });
                    }
                    return (
                      <div
                        key={purchase.id}
                        className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {purchase.package?.name || "Package Purchase"}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {purchase.package?.description || "SMS Package"}
                            </p>
                          </div>
                          <div className="text-right">
                            <div
                              className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                                purchase.status === "COMPLETED"
                                  ? "bg-green-100 text-green-800"
                                  : purchase.status === "PENDING"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {purchase.status}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">
                              Credits Received:
                            </span>
                            <div className="font-semibold text-primary-600">
                              {purchase.creditsReceived?.toLocaleString() ||
                                "N/A"}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Amount Paid:</span>
                            <div className="font-semibold">
                              {formatCurrency(
                                purchase.amountPaid,
                                purchase.currency || "GHS"
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">
                              Payment Method:
                            </span>
                            <div className="font-semibold capitalize">
                              {purchase.paymentMethod || "Paystack"}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Date:</span>
                            <div className="font-semibold">
                              {(() => {
                                try {
                                  if (!purchase.createdAt) return "N/A";
                                  const date = new Date(purchase.createdAt);
                                  if (isNaN(date.getTime())) return "N/A";
                                  return date.toLocaleDateString("en-GB", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  });
                                } catch (error) {
                                  return "N/A";
                                }
                              })()}
                            </div>
                          </div>
                        </div>

                        {purchase.paymentReference && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <span className="text-xs text-gray-500">
                              Reference:{" "}
                            </span>
                            <span className="text-xs font-mono text-gray-700">
                              {purchase.paymentReference}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Benefits Section - Only show on packages tab */}
        {activeTab === "packages" && (
          <motion.div className="mt-16" variants={itemVariants}>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
                ✨ Why Choose Our SMS Packages?
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Instant Activation
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Credits are added to your account immediately after
                    successful payment
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🔒</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Secure Payments
                  </h3>
                  <p className="text-gray-600 text-sm">
                    All transactions are secured with Paystack's
                    industry-standard encryption
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📞</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    24/7 Support
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Get help whenever you need it with our dedicated support
                    team
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Purchase SMS Plan Modal */}
      <PurchaseSMSPlanModal
        isOpen={showPurchaseModal}
        onClose={handleClosePurchaseModal}
        plan={selectedPlan}
        onWalletPurchase={handleWalletPurchase}
        onPaystackSuccess={handlePaystackSuccess}
        onPaystackClose={handlePaystackClose}
        currentBalance={currentBalance}
        isProcessing={isProcessing}
      />
    </div>
  );
}

export default PackagesPage;
