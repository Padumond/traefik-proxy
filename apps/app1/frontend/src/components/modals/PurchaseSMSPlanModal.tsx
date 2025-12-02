"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { useAppSelector } from "@/redux/store";

// Dynamically import PaystackButton to avoid SSR issues (uses window)
const PaystackButton = dynamic(
  () => import("react-paystack").then((mod) => mod.PaystackButton),
  { ssr: false }
);

interface PurchaseSMSPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: {
    price: number;
    smsCredits: number;
    costPerSMS: number;
    expiry: string;
    popular?: boolean;
    isCustom?: boolean;
  } | null;
  onWalletPurchase: (plan: any) => void;
  onPaystackSuccess: (reference: any) => void;
  onPaystackClose: () => void;
  currentBalance: number;
  isProcessing: boolean;
}

const PurchaseSMSPlanModal: React.FC<PurchaseSMSPlanModalProps> = ({
  isOpen,
  onClose,
  plan,
  onWalletPurchase,
  onPaystackSuccess,
  onPaystackClose,
  currentBalance,
  isProcessing,
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("");
  const { user } = useAppSelector((state) => state.auth);

  // Paystack configuration
  const paystackPublicKey =
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
    "pk_test_your_paystack_public_key_here";

  if (!plan) return null;

  const handlePaymentMethodSelect = (method: string) => {
    setSelectedPaymentMethod(method);
  };

  const handleProceedWithPayment = () => {
    if (!selectedPaymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    if (selectedPaymentMethod === "wallet") {
      // Check if user has sufficient balance
      const requiredBalance = plan.price;
      if (currentBalance < requiredBalance) {
        toast.error(
          `Insufficient balance. You need ₵${requiredBalance.toFixed(
            2
          )} but have ₵${currentBalance.toFixed(2)}`
        );
        return;
      }
      onWalletPurchase(plan);
    }
    // For Paystack, the PaystackButton component will handle the payment
  };

  const formatCurrency = (amount: number) => {
    return `₵${amount.toFixed(2)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Purchase SMS Plan
            </h3>
            <button
              type="button"
              onClick={onClose}
              title="Close dialog"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Plan Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-2">Selected Plan</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Price:</span>
                <span className="font-medium">
                  {formatCurrency(plan.price)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">SMS Credits:</span>
                <span className="font-medium">
                  {plan.smsCredits.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cost per SMS:</span>
                <span className="font-medium">
                  ₵{plan.costPerSMS.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expiry:</span>
                <span className="font-medium">{plan.expiry}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">
              Select Payment Method
            </h4>
            <div className="space-y-3">
              {/* Main Balance Option */}
              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedPaymentMethod === "wallet"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => handlePaymentMethodSelect("wallet")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Main Balance</p>
                      <p className="text-sm text-gray-600">
                        Available: {formatCurrency(currentBalance)}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      selectedPaymentMethod === "wallet"
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedPaymentMethod === "wallet" && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                </div>
                {currentBalance < plan.price && (
                  <p className="text-xs text-red-600 mt-2">
                    Insufficient balance. Need{" "}
                    {formatCurrency(plan.price - currentBalance)} more.
                  </p>
                )}
              </div>

              {/* Paystack Option */}
              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedPaymentMethod === "paystack"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => handlePaymentMethodSelect("paystack")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Paystack</p>
                      <p className="text-sm text-gray-600">
                        Pay with card, bank transfer, or mobile money
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      selectedPaymentMethod === "paystack"
                        ? "border-green-500 bg-green-500"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedPaymentMethod === "paystack" && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>

            {selectedPaymentMethod === "wallet" ? (
              <button
                type="button"
                onClick={handleProceedWithPayment}
                disabled={isProcessing || currentBalance < plan.price}
                className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  isProcessing || currentBalance < plan.price
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                }`}
              >
                {isProcessing ? "Processing..." : "Pay with Wallet"}
              </button>
            ) : selectedPaymentMethod === "paystack" ? (
              <PaystackButton
                publicKey={paystackPublicKey}
                email={user?.email || "user@example.com"}
                amount={plan.price * 100} // Paystack expects amount in kobo/pesewas
                currency="GHS"
                reference={`mas3ndi_${Date.now()}_${user?.id || "user"}`}
                onSuccess={onPaystackSuccess}
                onClose={onPaystackClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                Pay with Paystack
              </PaystackButton>
            ) : (
              <button
                type="button"
                disabled
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-400 bg-gray-200 rounded-lg cursor-not-allowed"
              >
                Select Payment Method
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseSMSPlanModal;
