"use client";

import Link from "next/link";
import { motion } from "framer-motion";

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
  {
    price: "Custom",
    smsCredits: "Custom",
    costPerSMS: "Contact Us",
    expiry: "No Expiry",
    popular: false,
  },
];

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="section-padding bg-gray-50 dark:bg-dark-800"
    >
      <div className="container-custom">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Choose the plan that works best for your business. No hidden fees,
            no contracts, pay as you go.
          </p>
        </div>

        {/* Pricing Table Cards */}
        <div className="w-full mx-auto">
          {/* Table Headers */}
          <div className="grid grid-cols-4 text-sm md:text-base font-bold bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-t-xl overflow-hidden mb-4 shadow-lg">
            <div className="p-4 text-center font-semibold">Price (GHc)</div>
            <div className="p-4 text-center font-semibold">SMS Credits</div>
            <div className="p-4 text-center font-semibold">Cost Per SMS</div>
            <div className="p-4 text-center font-semibold">Expiry Status</div>
          </div>

          {/* Table Rows as Cards */}
          <div className="space-y-3">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`grid grid-cols-4 text-sm md:text-base hover:shadow-xl transition-all duration-300 rounded-lg overflow-hidden shadow-md border-2 ${
                  plan.popular
                    ? "bg-gradient-to-r from-primary-600 to-primary-700 border-primary-400 transform scale-105 shadow-xl"
                    : "bg-gradient-to-r from-gray-700 to-gray-800 dark:from-gray-800 dark:to-gray-900 border-gray-600 dark:border-gray-700"
                } text-white`}
              >
                <div className="p-4 flex items-center justify-center">
                  <div className="text-center">
                    {plan.price === "Custom" ? (
                      <span className="font-bold text-white text-lg">
                        Custom
                      </span>
                    ) : (
                      <span className="font-bold text-white text-lg">
                        GHc{" "}
                        {typeof plan.price === "number"
                          ? plan.price.toLocaleString()
                          : plan.price}
                      </span>
                    )}
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
                    {typeof plan.smsCredits === "number"
                      ? plan.smsCredits.toLocaleString()
                      : plan.smsCredits}
                  </span>
                </div>
                <div className="p-4 text-center">
                  <span className="font-bold text-white text-lg">
                    {typeof plan.costPerSMS === "number"
                      ? `GHc ${plan.costPerSMS.toFixed(3)}`
                      : plan.costPerSMS}
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
              </div>
            ))}
          </div>

          {/* Key Benefits */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pay As You Go Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center mb-4">
                <div className="bg-primary-100 dark:bg-primary-700/30 p-3 rounded-lg mr-4">
                  <svg
                    className="w-6 h-6 text-primary-600 dark:text-primary-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-xl text-slate-800 dark:text-slate-100 mb-2">
                  Pay As You Go
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                No monthly fees or hidden charges. Only pay for the SMS credits
                you purchase.
              </p>
            </div>

            {/* No Expiry Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center mb-4">
                <div className="bg-primary-100 dark:bg-primary-700/30 p-3 rounded-lg mr-4">
                  <svg
                    className="w-6 h-6 text-primary-600 dark:text-primary-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-xl text-slate-800 dark:text-slate-100 mb-2">
                  No Expiry
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                Your SMS credits never expire. Use them whenever you need
                without worrying about deadlines.
              </p>
            </div>

            {/* Volume Discounts Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center mb-4">
                <div className="bg-primary-100 dark:bg-primary-700/30 p-3 rounded-lg mr-4">
                  <svg
                    className="w-6 h-6 text-primary-600 dark:text-primary-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-xl text-slate-800 dark:text-slate-100 mb-2">
                  Volume Discounts
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                The more credits you buy, the lower your cost per SMS. Save more
                with larger purchases.
              </p>
            </div>
          </div>

          {/* Custom Plan CTA */}
          <div className="mt-12 bg-primary-600 dark:bg-primary-800 text-white rounded-xl shadow-lg p-8 text-center">
            <h3 className="text-2xl font-bold mb-3">Need a Custom Plan?</h3>
            <p className="text-primary-100 dark:text-primary-200 mb-6 max-w-2xl mx-auto">
              Looking for enterprise-level pricing or special requirements? Our
              team can create a custom plan for your specific needs.
            </p>
            <Link
              href="/contact"
              className="inline-block bg-white text-primary-600 hover:bg-gray-100 dark:bg-dark-800 dark:text-primary-400 dark:hover:bg-dark-700 font-bold py-3 px-8 rounded-md shadow-md transition-all duration-300"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
