import { RateLimitConfig, RateLimitStrategy } from './rateLimiting.service';

export interface EndpointRateLimitConfig {
  endpoint: string;
  method: string;
  config: RateLimitConfig;
  description?: string;
}

export class RateLimitConfigService {
  /**
   * Default rate limit configurations for different user types
   */
  static getDefaultConfigs() {
    return {
      // General API rate limits
      general: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
        keyPrefix: 'general',
      } as RateLimitConfig,

      // API key-based rate limits (per hour)
      apiKey: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 1000, // Default, overridden by API key config
        keyPrefix: 'api_key',
      } as RateLimitConfig,

      // Authentication endpoints (stricter)
      auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5,
        keyPrefix: 'auth',
        blockDuration: 30 * 60 * 1000, // 30 minutes block
      } as RateLimitConfig,

      // SMS sending (per minute for burst protection)
      smsBurst: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10,
        keyPrefix: 'sms_burst',
      } as RateLimitConfig,

      // SMS sending (per hour for sustained)
      smsSustained: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 1000,
        keyPrefix: 'sms_sustained',
      } as RateLimitConfig,

      // OTP generation (stricter)
      otp: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 3,
        keyPrefix: 'otp',
        blockDuration: 5 * 60 * 1000, // 5 minutes block
      } as RateLimitConfig,

      // Balance checks
      balance: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 30,
        keyPrefix: 'balance',
      } as RateLimitConfig,

      // Analytics endpoints
      analytics: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 20,
        keyPrefix: 'analytics',
      } as RateLimitConfig,
    };
  }

  /**
   * Endpoint-specific rate limit configurations
   */
  static getEndpointConfigs(): EndpointRateLimitConfig[] {
    const configs = this.getDefaultConfigs();

    return [
      // SMS Endpoints
      {
        endpoint: 'POST:/v1/sms/send',
        method: 'POST',
        config: configs.smsBurst,
        description: 'Single SMS sending',
      },
      {
        endpoint: 'POST:/v1/sms/bulk',
        method: 'POST',
        config: {
          windowMs: 60 * 1000, // 1 minute
          maxRequests: 5, // Stricter for bulk
          keyPrefix: 'sms_bulk',
        },
        description: 'Bulk SMS sending',
      },
      {
        endpoint: 'GET:/v1/sms/status/:messageId',
        method: 'GET',
        config: {
          windowMs: 60 * 1000, // 1 minute
          maxRequests: 60,
          keyPrefix: 'sms_status',
        },
        description: 'SMS status checking',
      },
      {
        endpoint: 'GET:/v1/sms/history',
        method: 'GET',
        config: configs.analytics,
        description: 'SMS history retrieval',
      },

      // OTP Endpoints
      {
        endpoint: 'POST:/v1/otp/generate',
        method: 'POST',
        config: configs.otp,
        description: 'OTP generation',
      },
      {
        endpoint: 'POST:/v1/otp/verify',
        method: 'POST',
        config: {
          windowMs: 60 * 1000, // 1 minute
          maxRequests: 10, // More attempts for verification
          keyPrefix: 'otp_verify',
        },
        description: 'OTP verification',
      },

      // Wallet Endpoints
      {
        endpoint: 'GET:/v1/wallet/balance',
        method: 'GET',
        config: configs.balance,
        description: 'Balance checking',
      },
      {
        endpoint: 'GET:/v1/wallet/transactions',
        method: 'GET',
        config: configs.analytics,
        description: 'Transaction history',
      },

      // Analytics Endpoints
      {
        endpoint: 'GET:/v1/analytics/sms',
        method: 'GET',
        config: configs.analytics,
        description: 'SMS analytics',
      },
      {
        endpoint: 'GET:/v1/analytics/usage',
        method: 'GET',
        config: configs.analytics,
        description: 'Usage analytics',
      },
    ];
  }

  /**
   * Multi-strategy rate limiting configurations
   */
  static getMultiStrategyConfigs(): RateLimitStrategy[] {
    const configs = this.getDefaultConfigs();

    return [
      // IP-based rate limiting (general protection)
      {
        name: 'ip',
        config: configs.general,
        condition: (req) => !req.apiKeyInfo, // Only for non-API key requests
      },

      // API key-based rate limiting
      {
        name: 'apiKey',
        config: configs.apiKey,
        condition: (req) => !!req.apiKeyInfo,
      },

      // User-based rate limiting (for authenticated users)
      {
        name: 'user',
        config: {
          windowMs: 60 * 60 * 1000, // 1 hour
          maxRequests: 5000,
          keyPrefix: 'user',
        },
        condition: (req) => !!req.user,
      },

      // Endpoint-specific burst protection
      {
        name: 'burst',
        config: {
          windowMs: 10 * 1000, // 10 seconds
          maxRequests: 20,
          keyPrefix: 'burst',
        },
        condition: (req) => req.path.includes('/sms/') || req.path.includes('/otp/'),
      },
    ];
  }

  /**
   * Get rate limit configuration based on request context
   */
  static getConfigForRequest(req: any): RateLimitConfig {
    const configs = this.getDefaultConfigs();

    // API key requests get their configured limits
    if (req.apiKeyInfo) {
      return {
        ...configs.apiKey,
        maxRequests: req.apiKeyInfo.rateLimit,
      };
    }

    // Authentication endpoints get stricter limits
    if (req.path.includes('/auth/') || req.path.includes('/login') || req.path.includes('/register')) {
      return configs.auth;
    }

    // SMS endpoints get burst protection
    if (req.path.includes('/sms/')) {
      return configs.smsBurst;
    }

    // OTP endpoints get strict limits
    if (req.path.includes('/otp/')) {
      return configs.otp;
    }

    // Default general limits
    return configs.general;
  }

  /**
   * Get burst protection configuration
   */
  static getBurstProtectionConfig() {
    return {
      short: {
        windowMs: 10 * 1000, // 10 seconds
        maxRequests: 20,
        keyPrefix: 'burst_short',
      } as RateLimitConfig,
      long: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 1000,
        keyPrefix: 'burst_long',
      } as RateLimitConfig,
    };
  }

  /**
   * Get adaptive rate limiting configuration
   */
  static getAdaptiveConfig(): {
    base: RateLimitConfig;
    thresholds: { cpu: number; memory: number };
  } {
    return {
      base: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100,
        keyPrefix: 'adaptive',
      },
      thresholds: {
        cpu: 0.8, // 80% CPU usage
        memory: 0.8, // 80% memory usage
      },
    };
  }

  /**
   * Get rate limit configuration for specific user tier
   */
  static getConfigForUserTier(tier: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE'): RateLimitConfig {
    const baseConfig = this.getDefaultConfigs().apiKey;

    const tierLimits = {
      FREE: 100,
      BASIC: 1000,
      PREMIUM: 5000,
      ENTERPRISE: 20000,
    };

    return {
      ...baseConfig,
      maxRequests: tierLimits[tier],
    };
  }

  /**
   * Get environment-specific configurations
   */
  static getEnvironmentConfig(): {
    development: Partial<RateLimitConfig>;
    production: Partial<RateLimitConfig>;
    test: Partial<RateLimitConfig>;
  } {
    return {
      development: {
        maxRequests: 10000, // More lenient for development
        windowMs: 60 * 1000, // 1 minute
      },
      production: {
        maxRequests: 1000,
        windowMs: 60 * 60 * 1000, // 1 hour
        blockDuration: 15 * 60 * 1000, // 15 minutes block
      },
      test: {
        maxRequests: 100000, // Very lenient for testing
        windowMs: 1000, // 1 second
      },
    };
  }

  /**
   * Merge environment-specific overrides
   */
  static applyEnvironmentOverrides(config: RateLimitConfig): RateLimitConfig {
    const env = process.env.NODE_ENV || 'development';
    const envConfigs = this.getEnvironmentConfig();
    const envOverrides = envConfigs[env as keyof typeof envConfigs] || {};

    return {
      ...config,
      ...envOverrides,
    };
  }
}
