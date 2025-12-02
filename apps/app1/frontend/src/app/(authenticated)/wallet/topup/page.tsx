"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { toast } from "sonner";
import { getAuthToken } from "@/lib/api-config";

// Dynamically import PaystackButton to avoid SSR issues (uses window)
const PaystackButton = dynamic(
  () => import("react-paystack").then((mod) => mod.PaystackButton),
  { ssr: false }
);

// Payment method type
interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
  processingFee: string;
}

export default function TopUpPage() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const [amount, setAmount] = useState<string>("");
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1: Select amount, 2: Select payment method, 3: Confirmation

  // Paystack configuration
  const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";
  const isValidKey = paystackPublicKey && paystackPublicKey.startsWith("pk_");

  // Predefined amounts
  const predefinedAmounts = [50, 100, 200, 500, 1000];

  // Available payment methods (Ghana-specific)
  const paymentMethods: PaymentMethod[] = [
    {
      id: "bank_transfer",
      name: "Bank Transfer",
      description: "Transfer funds directly from your bank account",
      icon: "/images/bank-icon.svg",
      processingFee: "No fee",
    },
    {
      id: "mobile_money",
      name: "Mobile Money",
      description:
        "Pay using MTN Mobile Money, Vodafone Cash, or AirtelTigo Money",
      icon: "/images/mobile-money-icon.svg",
      processingFee: "1.5% fee",
    },
    {
      id: "credit_card",
      name: "Credit Card",
      description: "Pay with Visa, Mastercard, or American Express",
      icon: "/images/credit-card-icon.svg",
      processingFee: "2.5% fee",
    },
  ];

  // Handle amount selection
  const handleAmountSelect = (value: number | string) => {
    if (typeof value === "number") {
      setAmount(value.toString());
    } else {
      setAmount(value);
    }
  };

  // Handle payment method selection
  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
  };

  // Proceed to next step
  const handleNextStep = () => {
    if (step === 1) {
      if (!amount || parseFloat(amount) <= 0) {
        setError("Please enter a valid amount");
        return;
      }
      setError("");
      setStep(2);
    } else if (step === 2) {
      if (!selectedMethod) {
        setError("Please select a payment method");
        return;
      }
      setError("");
      setStep(3);
    }
  };

  // Go back to previous step
  const handlePreviousStep = () => {
    setError("");
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Paystack success handler
  const handlePaystackSuccess = async (reference: any) => {
    setIsLoading(true);
    setError("");

    try {
      // Get the authentication token
      const token = getAuthToken();

      if (!token) {
        throw new Error("Authentication required. Please log in again.");
      }

      // Call backend to verify payment and update wallet balance
      const response = await fetch("/api/wallet/topup/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reference: reference.reference,
          amount: parseFloat(amount),
        }),
      });

      if (!response.ok) {
        throw new Error("Payment verification failed");
      }

      const result = await response.json();

      if (result.success) {
        toast.success(`₵${amount} has been added to your wallet!`);
        router.push("/wallet?topup=success");
      } else {
        throw new Error(result.message || "Payment verification failed");
      }
    } catch (err: any) {
      console.error("Payment verification error:", err);
      setError(
        err.message || "Failed to verify payment. Please contact support."
      );
      toast.error("Payment verification failed. Please contact support.");
    } finally {
      setIsLoading(false);
    }
  };

  // Paystack close handler
  const handlePaystackClose = () => {
    console.log("Payment dialog closed");
    toast.error("Payment was cancelled");
    setIsLoading(false);
  };

  // Format currency in Ghana Cedi
  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return "Gh₵ 0.00";
    return (
      "Gh₵ " +
      new Intl.NumberFormat("en-GH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numValue)
    );
  };

  // Get selected payment method
  const getSelectedMethod = () => {
    return paymentMethods.find((method) => method.id === selectedMethod);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center mb-6">
        <button
          type="button"
          onClick={() => router.push("/wallet")}
          className="mr-4 p-2 rounded-full hover:bg-gray-100"
          aria-label="Go back to wallet"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 19l-7-7 7-7"
            ></path>
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Top Up Your Wallet</h1>
      </div>

      {/* Progress steps */}
      <div className="mb-8">
        <div className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 1
                ? "bg-primary-600 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            1
          </div>
          <div
            className={`flex-1 h-1 mx-2 ${
              step >= 2 ? "bg-primary-600" : "bg-gray-200"
            }`}
          ></div>
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 2
                ? "bg-primary-600 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            2
          </div>
          <div
            className={`flex-1 h-1 mx-2 ${
              step >= 3 ? "bg-primary-600" : "bg-gray-200"
            }`}
          ></div>
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 3
                ? "bg-primary-600 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            3
          </div>
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <span
            className={
              step >= 1 ? "text-primary-600 font-medium" : "text-gray-500"
            }
          >
            Amount
          </span>
          <span
            className={
              step >= 2 ? "text-primary-600 font-medium" : "text-gray-500"
            }
          >
            Payment Method
          </span>
          <span
            className={
              step >= 3 ? "text-primary-600 font-medium" : "text-gray-500"
            }
          >
            Confirm
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <motion.div
        key={`step-${step}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-lg shadow-sm border border-gray-100 p-6"
      >
        {/* Step 1: Select Amount */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-medium text-gray-800 mb-4">
              Select Amount
            </h2>

            <div className="mb-6">
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Enter amount to add
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="amount"
                  id="amount"
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => handleAmountSelect(e.target.value)}
                  min="1"
                  step="0.01"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">USD</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick select
              </label>
              <div className="grid grid-cols-3 gap-3">
                {predefinedAmounts.map((presetAmount) => (
                  <button
                    key={presetAmount}
                    type="button"
                    onClick={() => handleAmountSelect(presetAmount)}
                    className={`py-2 px-4 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      amount === presetAmount.toString()
                        ? "bg-primary-50 border-primary-500 text-primary-700 focus:ring-primary-500"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-primary-500"
                    }`}
                  >
                    {formatCurrency(presetAmount.toString())}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Select Payment Method */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-medium text-gray-800 mb-4">
              Select Payment Method
            </h2>
            <p className="text-gray-600 mb-6">
              Choose how you'd like to add {formatCurrency(amount)} to your
              wallet
            </p>

            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  onClick={() => handleMethodSelect(method.id)}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedMethod === method.id
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex-shrink-0 h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                    {/* This would be replaced with actual icons */}
                    <svg
                      className="h-6 w-6 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {method.id === "bank_transfer" && (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        ></path>
                      )}
                      {method.id === "mobile_money" && (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                        ></path>
                      )}
                      {method.id === "credit_card" && (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                        ></path>
                      )}
                    </svg>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      {method.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {method.description}
                    </p>
                  </div>
                  <div className="ml-4">
                    <span className="text-xs text-gray-500">
                      {method.processingFee}
                    </span>
                  </div>
                  <div className="ml-4">
                    <div
                      className={`h-5 w-5 rounded-full border ${
                        selectedMethod === method.id
                          ? "border-primary-500 bg-primary-500"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedMethod === method.id && (
                        <svg
                          className="h-5 w-5 text-white"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-medium text-gray-800 mb-4">
              Confirm Your Top-Up
            </h2>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">{formatCurrency(amount)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-medium">{getSelectedMethod()?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Processing Fee:</span>
                <span className="font-medium">
                  {getSelectedMethod()?.processingFee}
                </span>
              </div>
              <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between">
                <span className="text-gray-800 font-medium">Total:</span>
                <span className="text-primary-600 font-bold">
                  {formatCurrency(amount)}
                </span>
              </div>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    This is a demo. In a real application, you would be
                    redirected to a secure payment gateway.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Navigation buttons */}
      <div className="mt-6 flex justify-between">
        {step > 1 ? (
          <button
            type="button"
            onClick={handlePreviousStep}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Back
          </button>
        ) : (
          <div></div>
        )}

        {step < 3 ? (
          <button
            type="button"
            onClick={handleNextStep}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Continue
          </button>
        ) : (
          <div className="space-y-4">
            {isValidKey && amount && parseFloat(amount) > 0 ? (
              <PaystackButton
                publicKey={paystackPublicKey}
                email={user?.email || "user@example.com"}
                amount={parseFloat(amount) * 100} // Paystack expects amount in pesewas
                currency="GHS"
                reference={`wallet_topup_${parseFloat(amount)}_${Date.now()}`}
                onSuccess={handlePaystackSuccess}
                onClose={handlePaystackClose}
                metadata={{
                  topup_type: "wallet_balance",
                  amount_ghs: parseFloat(amount),
                  user_id: user?.id,
                  user_name: user?.name,
                }}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-75"
                text={
                  isLoading ? "Processing..." : `Pay ₵${amount} with Paystack`
                }
              />
            ) : (
              <div className="text-center py-4">
                <p className="text-red-600 text-sm">
                  {!isValidKey
                    ? "Payment system is not configured. Please contact support."
                    : "Please enter a valid amount to proceed."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
