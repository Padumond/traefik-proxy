'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface LogoProps {
  variant?: 'light' | 'dark' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  href?: string;
  className?: string;
  animated?: boolean;
}

const Logo: React.FC<LogoProps> = ({
  variant = 'light',
  size = 'md',
  showText = true,
  href,
  className = '',
  animated = false,
}) => {
  // Size configurations
  const sizeConfig = {
    sm: {
      icon: 'w-6 h-6 sm:w-8 sm:h-8',
      text: 'text-lg sm:text-xl',
      container: 'p-1.5 sm:p-2',
    },
    md: {
      icon: 'w-8 h-8 sm:w-10 sm:h-10',
      text: 'text-xl sm:text-2xl',
      container: 'p-2 sm:p-3',
    },
    lg: {
      icon: 'w-10 h-10 sm:w-12 sm:h-12',
      text: 'text-2xl sm:text-3xl',
      container: 'p-3 sm:p-4',
    },
    xl: {
      icon: 'w-12 h-12 sm:w-16 sm:h-16',
      text: 'text-3xl sm:text-4xl',
      container: 'p-4 sm:p-5',
    },
  };

  // Color configurations
  const colorConfig = {
    light: {
      iconBg: 'bg-white',
      iconColor: 'text-primary-600',
      textColor: 'text-primary-700',
      shadow: 'shadow-sm hover:shadow-md',
    },
    dark: {
      iconBg: 'bg-primary-600',
      iconColor: 'text-white',
      textColor: 'text-gray-900',
      shadow: 'shadow-sm hover:shadow-md',
    },
    white: {
      iconBg: 'bg-white/10 backdrop-blur-sm',
      iconColor: 'text-white',
      textColor: 'text-white',
      shadow: 'shadow-lg',
    },
  };

  const config = sizeConfig[size];
  const colors = colorConfig[variant];

  // Logo icon component
  const LogoIcon = () => (
    <div className={`${colors.iconBg} ${config.container} rounded-lg ${colors.shadow} transition-all duration-300`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`${config.icon} ${colors.iconColor} transform rotate-[30deg]`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
        />
      </svg>
    </div>
  );

  // Logo content
  const LogoContent = () => (
    <div className={`flex items-center space-x-2 sm:space-x-3 ${className}`}>
      {animated ? (
        <motion.div
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <LogoIcon />
        </motion.div>
      ) : (
        <LogoIcon />
      )}
      {showText && (
        <span className={`${config.text} font-bold ${colors.textColor} tracking-tight`}>
          Mas3ndi
        </span>
      )}
    </div>
  );

  // If href is provided, wrap in Link
  if (href) {
    return (
      <Link href={href} className="inline-block">
        {animated ? (
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <LogoContent />
          </motion.div>
        ) : (
          <LogoContent />
        )}
      </Link>
    );
  }

  return <LogoContent />;
};

export default Logo;
