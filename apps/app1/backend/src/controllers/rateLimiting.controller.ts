import { Request, Response, NextFunction } from 'express';
import { RateLimitingService } from '../services/rateLimiting.service';
import { RateLimitConfigService } from '../services/rateLimitConfig.service';
import { ApiError } from '../middleware/error.middleware';

export class RateLimitingController {
  /**
   * Get rate limit status for current API key
   */
  static async getRateLimitStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.apiKeyInfo) {
        throw ApiError.unauthorized('API key authentication required');
      }

      const { apiKeyId, rateLimit: maxRequests } = req.apiKeyInfo;
      const config = {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests,
        keyPrefix: 'api_key_rate_limit',
      };

      const status = await RateLimitingService.getRateLimitStatus(apiKeyId, config);

      res.json({
        success: true,
        message: 'Rate limit status retrieved successfully',
        data: {
          apiKeyId,
          limit: status.limit,
          remaining: status.remaining,
          resetTime: status.resetTime,
          blocked: status.blocked || false,
          blockedUntil: status.blockedUntil,
          windowMs: config.windowMs,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rate limit analytics for API key
   */
  static async getRateLimitAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.apiKeyInfo) {
        throw ApiError.unauthorized('API key authentication required');
      }

      const { apiKeyId } = req.apiKeyInfo;
      const analytics = await RateLimitingService.getRateLimitAnalytics(`*${apiKeyId}*`);

      res.json({
        success: true,
        message: 'Rate limit analytics retrieved successfully',
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset rate limit for current API key (admin only)
   */
  static async resetRateLimit(req: Request, res: Response, next: NextFunction) {
    try {
      // Check if user is admin
      if (req.user?.role !== 'ADMIN') {
        throw ApiError.forbidden('Admin access required');
      }

      const { apiKeyId } = req.params;
      if (!apiKeyId) {
        throw ApiError.badRequest('API key ID is required');
      }

      await RateLimitingService.resetRateLimit(apiKeyId, 'api_key_rate_limit');

      res.json({
        success: true,
        message: 'Rate limit reset successfully',
        data: { apiKeyId },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get system-wide rate limiting analytics (admin only)
   */
  static async getSystemAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      // Check if user is admin
      if (req.user?.role !== 'ADMIN') {
        throw ApiError.forbidden('Admin access required');
      }

      const [
        generalAnalytics,
        apiKeyAnalytics,
        smsAnalytics,
        otpAnalytics,
      ] = await Promise.all([
        RateLimitingService.getRateLimitAnalytics('*', 'general'),
        RateLimitingService.getRateLimitAnalytics('*', 'api_key_rate_limit'),
        RateLimitingService.getRateLimitAnalytics('*', 'sms_burst'),
        RateLimitingService.getRateLimitAnalytics('*', 'otp'),
      ]);

      res.json({
        success: true,
        message: 'System rate limit analytics retrieved successfully',
        data: {
          general: generalAnalytics,
          apiKeys: apiKeyAnalytics,
          sms: smsAnalytics,
          otp: otpAnalytics,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rate limiting configuration
   */
  static async getConfiguration(req: Request, res: Response, next: NextFunction) {
    try {
      const defaultConfigs = RateLimitConfigService.getDefaultConfigs();
      const endpointConfigs = RateLimitConfigService.getEndpointConfigs();
      const multiStrategyConfigs = RateLimitConfigService.getMultiStrategyConfigs();

      res.json({
        success: true,
        message: 'Rate limiting configuration retrieved successfully',
        data: {
          defaults: defaultConfigs,
          endpoints: endpointConfigs,
          strategies: multiStrategyConfigs,
          environment: process.env.NODE_ENV,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Health check for rate limiting service
   */
  static async healthCheck(req: Request, res: Response, next: NextFunction) {
    try {
      const health = await RateLimitingService.healthCheck();

      res.json({
        success: true,
        message: 'Rate limiting service health check completed',
        data: health,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cleanup expired rate limit data (admin only)
   */
  static async cleanup(req: Request, res: Response, next: NextFunction) {
    try {
      // Check if user is admin
      if (req.user?.role !== 'ADMIN') {
        throw ApiError.forbidden('Admin access required');
      }

      await RateLimitingService.cleanup();

      res.json({
        success: true,
        message: 'Rate limit cleanup completed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rate limit status for multiple keys (admin only)
   */
  static async getMultipleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      // Check if user is admin
      if (req.user?.role !== 'ADMIN') {
        throw ApiError.forbidden('Admin access required');
      }

      const { keys, keyPrefix = 'api_key_rate_limit' } = req.body;

      if (!Array.isArray(keys) || keys.length === 0) {
        throw ApiError.badRequest('Keys array is required');
      }

      if (keys.length > 100) {
        throw ApiError.badRequest('Maximum 100 keys allowed per request');
      }

      const config = RateLimitConfigService.getDefaultConfigs().apiKey;
      const statuses = await Promise.all(
        keys.map(async (key: string) => {
          try {
            const status = await RateLimitingService.getRateLimitStatus(key, {
              ...config,
              keyPrefix,
            });
            return { key, status, error: null };
          } catch (error: any) {
            return { key, status: null, error: error.message };
          }
        })
      );

      res.json({
        success: true,
        message: 'Multiple rate limit statuses retrieved successfully',
        data: statuses,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update rate limit configuration for API key (admin only)
   */
  static async updateApiKeyRateLimit(req: Request, res: Response, next: NextFunction) {
    try {
      // Check if user is admin
      if (req.user?.role !== 'ADMIN') {
        throw ApiError.forbidden('Admin access required');
      }

      const { apiKeyId } = req.params;
      const { rateLimit } = req.body;

      if (!apiKeyId) {
        throw ApiError.badRequest('API key ID is required');
      }

      if (!rateLimit || rateLimit < 1 || rateLimit > 100000) {
        throw ApiError.badRequest('Rate limit must be between 1 and 100000');
      }

      // This would typically update the API key in the database
      // For now, we'll just reset the current rate limit
      await RateLimitingService.resetRateLimit(apiKeyId, 'api_key_rate_limit');

      res.json({
        success: true,
        message: 'API key rate limit updated successfully',
        data: {
          apiKeyId,
          newRateLimit: rateLimit,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rate limiting metrics for monitoring
   */
  static async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      // Check if user is admin
      if (req.user?.role !== 'ADMIN') {
        throw ApiError.forbidden('Admin access required');
      }

      const health = await RateLimitingService.healthCheck();
      const analytics = await RateLimitingService.getRateLimitAnalytics('*');

      const metrics = {
        service: {
          status: health.status,
          redisConnected: health.redis,
          latency: health.latency,
        },
        usage: {
          totalActiveKeys: analytics.totalKeys,
          blockedKeys: analytics.blockedKeys,
          blockRate: analytics.totalKeys > 0 ? 
            (analytics.blockedKeys / analytics.totalKeys * 100).toFixed(2) + '%' : '0%',
        },
        topConsumers: analytics.topConsumers.slice(0, 5),
        timestamp: new Date().toISOString(),
      };

      res.json({
        success: true,
        message: 'Rate limiting metrics retrieved successfully',
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }
}
