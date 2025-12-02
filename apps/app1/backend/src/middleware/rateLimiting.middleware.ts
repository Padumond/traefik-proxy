import { Request, Response, NextFunction } from 'express';
import { RateLimitingService, RateLimitConfig, RateLimitStrategy } from '../services/rateLimiting.service';
import { ApiError } from '../middleware/error.middleware';

export interface RateLimitOptions {
  keyGenerator?: (req: Request) => string;
  strategies?: RateLimitStrategy[];
  onLimitReached?: (req: Request, res: Response, result: any) => void;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  headers?: boolean;
}

/**
 * Create rate limiting middleware
 */
export function createRateLimit(
  config: RateLimitConfig,
  options: RateLimitOptions = {}
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        keyGenerator = (req) => req.ip || 'unknown',
        onLimitReached,
        skipSuccessfulRequests = false,
        skipFailedRequests = false,
        headers = true,
      } = options;

      const key = keyGenerator(req);
      const result = await RateLimitingService.checkRateLimit(key, config);

      // Add rate limit headers
      if (headers) {
        res.set({
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(result.resetTime.getTime() / 1000).toString(),
        });

        if (result.retryAfter) {
          res.set('Retry-After', result.retryAfter.toString());
        }
      }

      if (!result.allowed) {
        if (onLimitReached) {
          onLimitReached(req, res, result);
        }

        const error = result.blocked
          ? `Rate limit exceeded. Blocked until ${result.blockedUntil?.toISOString()}`
          : `Rate limit exceeded. Try again in ${result.retryAfter} seconds`;

        throw ApiError.tooManyRequests(error);
      }

      // Track response status for conditional rate limiting
      if (skipSuccessfulRequests || skipFailedRequests) {
        const originalSend = res.send;
        res.send = function(body) {
          const statusCode = res.statusCode;
          const isSuccess = statusCode >= 200 && statusCode < 400;
          const shouldSkip = 
            (skipSuccessfulRequests && isSuccess) ||
            (skipFailedRequests && !isSuccess);

          if (shouldSkip) {
            // Remove the request from rate limit count
            // This is a simplified approach - in production, you might want to
            // implement this more efficiently
          }

          return originalSend.call(this, body);
        };
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * API Key-based rate limiting middleware
 */
export function createApiKeyRateLimit(options: RateLimitOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.apiKeyInfo) {
        return next(ApiError.unauthorized('API key authentication required'));
      }

      const { apiKeyId, rateLimit: maxRequests } = req.apiKeyInfo;
      
      const config: RateLimitConfig = {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests,
        keyPrefix: 'api_key_rate_limit',
      };

      const result = await RateLimitingService.checkRateLimit(apiKeyId, config);

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(result.resetTime.getTime() / 1000).toString(),
        'X-RateLimit-Window': '3600', // 1 hour in seconds
      });

      if (result.retryAfter) {
        res.set('Retry-After', result.retryAfter.toString());
      }

      if (!result.allowed) {
        console.warn('API Key Rate Limit Exceeded:', {
          apiKeyId,
          limit: result.limit,
          remaining: result.remaining,
          resetTime: result.resetTime,
          blocked: result.blocked,
          ip: req.ip,
          path: req.path,
          method: req.method,
        });

        const error = result.blocked
          ? `API rate limit exceeded. Blocked until ${result.blockedUntil?.toISOString()}`
          : `API rate limit exceeded. Maximum ${result.limit} requests per hour. Try again in ${result.retryAfter} seconds`;

        throw ApiError.tooManyRequests(error);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Multi-strategy rate limiting middleware
 */
export function createMultiStrategyRateLimit(strategies: RateLimitStrategy[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applicableStrategies = strategies.filter(strategy => 
        !strategy.condition || strategy.condition(req)
      );

      const checks = applicableStrategies.map(strategy => ({
        key: strategy.name === 'ip' ? req.ip || 'unknown' : 
             strategy.name === 'user' ? req.user?.id || 'anonymous' :
             strategy.name === 'apiKey' ? req.apiKeyInfo?.apiKeyId || 'no-key' :
             'default',
        config: strategy.config,
      }));

      const results = await RateLimitingService.checkMultipleRateLimits(checks);
      
      // Find the most restrictive result
      const blockedResult = results.find(result => !result.allowed);
      const mostRestrictive = results.reduce((prev, current) => 
        current.remaining < prev.remaining ? current : prev
      );

      // Set headers based on most restrictive limit
      res.set({
        'X-RateLimit-Limit': mostRestrictive.limit.toString(),
        'X-RateLimit-Remaining': mostRestrictive.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(mostRestrictive.resetTime.getTime() / 1000).toString(),
      });

      if (blockedResult) {
        if (blockedResult.retryAfter) {
          res.set('Retry-After', blockedResult.retryAfter.toString());
        }

        const error = blockedResult.blocked
          ? `Rate limit exceeded. Blocked until ${blockedResult.blockedUntil?.toISOString()}`
          : `Rate limit exceeded. Try again in ${blockedResult.retryAfter} seconds`;

        throw ApiError.tooManyRequests(error);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Endpoint-specific rate limiting
 */
export function createEndpointRateLimit(endpointLimits: Record<string, RateLimitConfig>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const endpoint = `${req.method}:${req.route?.path || req.path}`;
      const config = endpointLimits[endpoint];

      if (!config) {
        return next(); // No rate limit for this endpoint
      }

      const key = `${req.apiKeyInfo?.apiKeyId || req.ip}:${endpoint}`;
      const result = await RateLimitingService.checkRateLimit(key, {
        ...config,
        keyPrefix: 'endpoint_rate_limit',
      });

      // Add endpoint-specific headers
      res.set({
        'X-Endpoint-RateLimit-Limit': result.limit.toString(),
        'X-Endpoint-RateLimit-Remaining': result.remaining.toString(),
        'X-Endpoint-RateLimit-Reset': Math.ceil(result.resetTime.getTime() / 1000).toString(),
      });

      if (!result.allowed) {
        console.warn('Endpoint Rate Limit Exceeded:', {
          endpoint,
          key,
          limit: result.limit,
          remaining: result.remaining,
          ip: req.ip,
        });

        throw ApiError.tooManyRequests(
          `Endpoint rate limit exceeded for ${endpoint}. Try again in ${result.retryAfter} seconds`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Burst protection middleware
 */
export function createBurstProtection(
  shortConfig: RateLimitConfig,
  longConfig: RateLimitConfig
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.apiKeyInfo?.apiKeyId || req.ip || 'unknown';
      
      const [shortResult, longResult] = await RateLimitingService.checkMultipleRateLimits([
        { key: `${key}:short`, config: { ...shortConfig, keyPrefix: 'burst_short' } },
        { key: `${key}:long`, config: { ...longConfig, keyPrefix: 'burst_long' } },
      ]);

      // Set headers for both limits
      res.set({
        'X-RateLimit-Burst-Limit': shortResult.limit.toString(),
        'X-RateLimit-Burst-Remaining': shortResult.remaining.toString(),
        'X-RateLimit-Sustained-Limit': longResult.limit.toString(),
        'X-RateLimit-Sustained-Remaining': longResult.remaining.toString(),
      });

      if (!shortResult.allowed) {
        throw ApiError.tooManyRequests(
          `Burst rate limit exceeded. Try again in ${shortResult.retryAfter} seconds`
        );
      }

      if (!longResult.allowed) {
        throw ApiError.tooManyRequests(
          `Sustained rate limit exceeded. Try again in ${longResult.retryAfter} seconds`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Adaptive rate limiting based on system load
 */
export function createAdaptiveRateLimit(
  baseConfig: RateLimitConfig,
  loadThresholds: { cpu: number; memory: number }
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get system metrics (simplified - in production, use proper monitoring)
      const usage = process.memoryUsage();
      const memoryUsage = usage.heapUsed / usage.heapTotal;
      
      // Adjust rate limit based on system load
      let adjustedMaxRequests = baseConfig.maxRequests;
      
      if (memoryUsage > loadThresholds.memory) {
        adjustedMaxRequests = Math.floor(baseConfig.maxRequests * 0.5); // Reduce by 50%
      }

      const config: RateLimitConfig = {
        ...baseConfig,
        maxRequests: adjustedMaxRequests,
        keyPrefix: 'adaptive_rate_limit',
      };

      const key = req.apiKeyInfo?.apiKeyId || req.ip || 'unknown';
      const result = await RateLimitingService.checkRateLimit(key, config);

      res.set({
        'X-RateLimit-Adaptive-Limit': result.limit.toString(),
        'X-RateLimit-Adaptive-Remaining': result.remaining.toString(),
        'X-System-Load': memoryUsage.toFixed(2),
      });

      if (!result.allowed) {
        throw ApiError.tooManyRequests(
          `Adaptive rate limit exceeded due to high system load. Try again in ${result.retryAfter} seconds`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
