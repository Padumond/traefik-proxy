"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ParticlesBackground from './ParticlesBackground';
import { motion } from 'framer-motion';

export default function Hero() {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.2,
        duration: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };
  
  const imageCardVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    },
    hover: {
      boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.3)",
      transition: { duration: 0.3 }
    }
  };

  const badgeVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        delay: 0.6,
        duration: 0.5,
        type: "spring",
        stiffness: 200
      }
    },
    float: {
      y: [0, -10, 0],
      transition: {
        y: {
          repeat: Infinity,
          duration: 2,
          ease: "easeInOut"
        }
      }
    }
  };

  const countBadgeVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { 
        delay: 0.8,
        duration: 0.5,
        type: "spring",
        stiffness: 100
      }
    },
    float: {
      x: [0, 5, 0],
      transition: {
        x: {
          repeat: Infinity,
          duration: 3,
          ease: "easeInOut"
        }
      }
    }
  };
  
  return (
    <div className="bg-dark-900 overflow-hidden relative">
      {/* Particles animation background */}
      <ParticlesBackground className="opacity-40" />
      
      <motion.div 
        className="container-custom py-16 md:py-20 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.h1 
              className="text-4xl sm:text-5xl font-bold mb-6 leading-tight text-white"
              variants={itemVariants}
            >
              Powerful Bulk SMS & OTP Services
            </motion.h1>
            <motion.p 
              className="text-lg text-gray-400 mb-8"
              variants={itemVariants}
            >
              Utilize our robust platform for sending bulk SMS messages and secure one-time passwords
            </motion.p>
            <motion.div variants={itemVariants}>
              <motion.div 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
              >
                <Link href="/register" className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-6 rounded-md inline-block">
                  Get Started
                </Link>
              </motion.div>
            </motion.div>
          </div>
          <motion.div className="relative" variants={containerVariants}>
            {/* SMS Image */}
            <div className="relative mx-auto w-full max-w-lg">
              <motion.div 
                className="bg-gray-900 rounded-3xl overflow-hidden border-2 border-gray-800 p-4 relative shadow-lg"
                variants={imageCardVariants}
                whileHover="hover"
              >
                <Image 
                  src="/images/sms.jpeg" 
                  alt="Bulk SMS Messaging" 
                  width={600} 
                  height={400} 
                  className="rounded-xl object-cover w-full h-auto shadow-md"
                  priority
                />
              </motion.div>
              
              {/* Floating badge */}
              <motion.div 
                className="absolute -top-4 -right-4 bg-primary-500 text-white px-4 py-2 rounded-lg shadow-lg transform rotate-3 z-10"
                variants={badgeVariants}
                animate="float"
              >
                <span className="font-bold">Fast & Reliable</span>
              </motion.div>
              
              {/* Message count badge */}
              <motion.div 
                className="absolute bottom-8 -left-4 bg-white text-primary-800 px-4 py-2 rounded-full shadow-lg z-10 flex items-center"
                variants={countBadgeVariants}
                animate="float"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="font-bold">1M+ Messages Daily</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
