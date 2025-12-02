"use client";

import React from "react";
import { motion } from "framer-motion";

export default function Features() {
  // Animation variants
  const sectionVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1,
        duration: 0.3,
      },
    },
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
    hover: {
      y: -12,
      scale: 1.02,
      boxShadow:
        "0px 20px 40px rgba(59, 130, 246, 0.15), 0px 10px 20px rgba(0, 0, 0, 0.3)",
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  const iconVariants = {
    hidden: { scale: 0.5, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        delay: 0.2,
        duration: 0.5,
      },
    },
    hover: {
      rotate: [0, 5, -5, 0],
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <section
      id="features"
      className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-20"
    >
      <div className="container mx-auto px-6 max-w-7xl">
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          animate="visible"
          variants={headerVariants}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Powerful Features
          </h2>
          <p className="text-gray-300 max-w-3xl mx-auto text-lg leading-relaxed">
            Discover the comprehensive suite of tools designed to streamline
            your SMS communication and enhance your business operations
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Bulk SMS Feature */}
          <motion.div
            className="bg-gray-900 p-6 rounded-lg border border-gray-800"
            initial="hidden"
            whileInView="visible"
            whileHover="hover"
            viewport={{ once: true }}
            variants={cardVariants}
          >
            <motion.div
              className="bg-primary-500 text-white p-4 rounded-md flex items-center justify-center w-16 h-16 mb-4 mx-auto"
              variants={iconVariants}
              whileHover="hover"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </motion.div>
            <h3 className="text-xl font-semibold text-white mb-2 text-center">
              Bulk SMS
            </h3>
            <p className="text-gray-400 text-center">
              Send large volumes of SMS messages quickly and reliably
            </p>
          </motion.div>

          {/* OTP Delivery Feature */}
          <motion.div
            className="bg-gray-900 p-6 rounded-lg border border-gray-800"
            initial="hidden"
            whileInView="visible"
            whileHover="hover"
            viewport={{ once: true }}
            variants={cardVariants}
          >
            <motion.div
              className="bg-primary-500 text-white p-4 rounded-md flex items-center justify-center w-16 h-16 mb-4 mx-auto"
              variants={iconVariants}
              whileHover="hover"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </motion.div>
            <h3 className="text-xl font-semibold text-white mb-2 text-center">
              OTP Delivery
            </h3>
            <p className="text-gray-400 text-center">
              Securely deliver one-time passwords for user authentication
            </p>
          </motion.div>

          {/* Contact Management Feature */}
          <motion.div
            className="bg-gray-900 p-6 rounded-lg border border-gray-800"
            initial="hidden"
            whileInView="visible"
            whileHover="hover"
            viewport={{ once: true }}
            variants={cardVariants}
          >
            <motion.div
              className="bg-primary-500 text-white p-4 rounded-md flex items-center justify-center w-16 h-16 mb-4 mx-auto"
              variants={iconVariants}
              whileHover="hover"
            >
              <svg
                className="w-8 h-8"
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
            </motion.div>
            <h3 className="text-xl font-semibold text-white mb-2 text-center">
              Contact Management
            </h3>
            <p className="text-gray-400 text-center">
              Organize and manage your contacts efficiently
            </p>
          </motion.div>

          {/* Reporting & Analytics Feature */}
          <motion.div
            className="bg-gray-900 p-6 rounded-lg border border-gray-800"
            initial="hidden"
            whileInView="visible"
            whileHover="hover"
            viewport={{ once: true }}
            variants={cardVariants}
          >
            <motion.div
              className="bg-primary-500 text-white p-4 rounded-md flex items-center justify-center w-16 h-16 mb-4 mx-auto"
              variants={iconVariants}
              whileHover="hover"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </motion.div>
            <h3 className="text-xl font-semibold text-white mb-2 text-center">
              Reporting & Analytics
            </h3>
            <p className="text-gray-400 text-center">
              Gain insights with detailed reporting and analytics
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
