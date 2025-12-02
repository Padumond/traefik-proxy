'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showBorder?: boolean;
  showStatus?: boolean;
  status?: 'online' | 'offline' | 'away' | 'busy';
  animated?: boolean;
  fallbackBg?: string;
  onClick?: () => void;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name = 'User',
  size = 'md',
  className = '',
  showBorder = false,
  showStatus = false,
  status = 'offline',
  animated = false,
  fallbackBg = 'bg-primary-500',
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

  // Size configurations
  const sizeConfig = {
    xs: {
      container: 'w-6 h-6',
      text: 'text-xs',
      status: 'w-2 h-2',
      statusPosition: '-bottom-0 -right-0',
    },
    sm: {
      container: 'w-8 h-8',
      text: 'text-sm',
      status: 'w-2.5 h-2.5',
      statusPosition: '-bottom-0.5 -right-0.5',
    },
    md: {
      container: 'w-10 h-10',
      text: 'text-base',
      status: 'w-3 h-3',
      statusPosition: '-bottom-0.5 -right-0.5',
    },
    lg: {
      container: 'w-12 h-12',
      text: 'text-lg',
      status: 'w-3.5 h-3.5',
      statusPosition: '-bottom-1 -right-1',
    },
    xl: {
      container: 'w-16 h-16',
      text: 'text-xl',
      status: 'w-4 h-4',
      statusPosition: '-bottom-1 -right-1',
    },
    '2xl': {
      container: 'w-20 h-20',
      text: 'text-2xl',
      status: 'w-5 h-5',
      statusPosition: '-bottom-1.5 -right-1.5',
    },
  };

  // Status colors
  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
  };

  const config = sizeConfig[size];

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Avatar content
  const AvatarContent = () => (
    <div className={`relative inline-block ${config.container}`}>
      <div
        className={`
          ${config.container} 
          rounded-full 
          overflow-hidden 
          ${showBorder ? 'ring-2 ring-white shadow-lg' : ''} 
          ${onClick ? 'cursor-pointer' : ''} 
          ${className}
        `}
      >
        {src && !imageError ? (
          <Image
            src={src}
            alt={alt || `${name}'s avatar`}
            width={80}
            height={80}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className={`
              w-full h-full 
              ${fallbackBg} 
              flex items-center justify-center 
              text-white font-semibold 
              ${config.text}
            `}
          >
            {getInitials(name)}
          </div>
        )}
      </div>

      {/* Status indicator */}
      {showStatus && (
        <div
          className={`
            absolute 
            ${config.statusPosition} 
            ${config.status} 
            ${statusColors[status]} 
            rounded-full 
            border-2 border-white
          `}
        />
      )}
    </div>
  );

  // Wrap with animation if enabled
  if (animated) {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300 }}
        onClick={onClick}
      >
        <AvatarContent />
      </motion.div>
    );
  }

  return (
    <div onClick={onClick}>
      <AvatarContent />
    </div>
  );
};

export default Avatar;
