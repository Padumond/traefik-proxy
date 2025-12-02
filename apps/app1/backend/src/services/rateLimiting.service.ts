import Redis from "ioredis";
import { ApiError } from "../middleware/error.middleware";

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  blockDuration?: number; // Additional block time after limit exceeded
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number; // Seconds until next request allowed
  blocked?: boolean;
  blockedUntil?: Date;
}

export interface RateLimitStrategy {
  name: string;
  config: RateLimitConfig;
  condition?: (req: any) => boolean;
}

export class RateLimitingService {
  private static redis: Redis;
  private static initialized = false;

  /**
   * Initialize Redis connection
   */
  static async initialize() {
    if (this.initialized) return;

    try {
      this.redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

      await this.redis.ping();
      this.initialized = true;
      console.log("Rate limiting service initialized with Redis");
    } catch (error) {
      console.error("Failed to initialize rate limiting service:", error);
      throw new Error("Rate limiting service initialization failed");
    }
  }

  /**
   * Check rate limit for a given key
   */
  static async checkRateLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      windowMs,
      maxRequests,
      keyPrefix = "rate_limit",
      blockDuration = 0,
    } = config;

    const redisKey = `${keyPrefix}:${key}`;
    const blockKey = `${keyPrefix}:block:${key}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Check if key is currently blocked
      const blockInfo = await this.redis.get(blockKey);
      if (blockInfo) {
        const blockedUntil = new Date(parseInt(blockInfo));
        if (blockedUntil > new Date()) {
          return {
            allowed: false,
            limit: maxRequests,
            remaining: 0,
            resetTime: new Date(now + windowMs),
            blocked: true,
            blockedUntil,
            retryAfter: Math.ceil((blockedUntil.getTime() - now) / 1000),
          };
        } else {
          // Block expired, remove it
          await this.redis.del(blockKey);
        }
      }

      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();

      // Remove expired entries
      pipeline.zremrangebyscore(redisKey, 0, windowStart);

      // Count current requests in window
      pipeline.zcard(redisKey);

      // Add current request
      pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);

      // Set expiry for the key
      pipeline.expire(redisKey, Math.ceil(windowMs / 1000));

      const results = await pipeline.exec();

      if (!results) {
        throw new Error("Redis pipeline execution failed");
      }

      const currentCount = (results[1][1] as number) + 1; // +1 for the request we just added
      const remaining = Math.max(0, maxRequests - currentCount);
      const resetTime = new Date(now + windowMs);

      if (currentCount > maxRequests) {
        // Rate limit exceeded
        if (blockDuration > 0) {
          // Apply additional blocking
          const blockedUntil = new Date(now + blockDuration);
          await this.redis.setex(
            blockKey,
            Math.ceil(blockDuration / 1000),
            blockedUntil.getTime().toString()
          );

          return {
            allowed: false,
            limit: maxRequests,
            remaining: 0,
            resetTime,
            blocked: true,
            blockedUntil,
            retryAfter: Math.ceil(blockDuration / 1000),
          };
        }

        return {
          allowed: false,
          limit: maxRequests,
          remaining: 0,
          resetTime,
          retryAfter: Math.ceil((resetTime.getTime() - now) / 1000),
        };
      }

      return {
        allowed: true,
        limit: maxRequests,
        remaining,
        resetTime,
      };
    } catch (error) {
      console.error("Rate limit check failed:", error);
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        resetTime: new Date(now + windowMs),
      };
    }
  }

  /**
   * Check multiple rate limits (composite rate limiting)
   */
  static async checkMultipleRateLimits(
    strategies: Array<{ key: string; config: RateLimitConfig }>
  ): Promise<RateLimitResult[]> {
    const results = await Promise.all(
      strategies.map(({ key, config }) => this.checkRateLimit(key, config))
    );

    return results;
  }

  /**
   * Get rate limit status without incrementing
   */
  static async getRateLimitStatus(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const { windowMs, maxRequests, keyPrefix = "rate_limit" } = config;

    const redisKey = `${keyPrefix}:${key}`;
    const blockKey = `${keyPrefix}:block:${key}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Check if key is currently blocked
      const blockInfo = await this.redis.get(blockKey);
      if (blockInfo) {
        const blockedUntil = new Date(parseInt(blockInfo));
        if (blockedUntil > new Date()) {
          return {
            allowed: false,
            limit: maxRequests,
            remaining: 0,
            resetTime: new Date(now + windowMs),
            blocked: true,
            blockedUntil,
            retryAfter: Math.ceil((blockedUntil.getTime() - now) / 1000),
          };
        }
      }

      // Count current requests in window
      const currentCount = await this.redis.zcount(redisKey, windowStart, now);
      const remaining = Math.max(0, maxRequests - currentCount);
      const resetTime = new Date(now + windowMs);

      return {
        allowed: currentCount < maxRequests,
        limit: maxRequests,
        remaining,
        resetTime,
      };
    } catch (error) {
      console.error("Rate limit status check failed:", error);
      return {
        allowed: true,
        limit: maxRequests,
        remaining: maxRequests,
        resetTime: new Date(now + windowMs),
      };
    }
  }

  /**
   * Reset rate limit for a key
   */
  static async resetRateLimit(
    key: string,
    keyPrefix = "rate_limit"
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const redisKey = `${keyPrefix}:${key}`;
      const blockKey = `${keyPrefix}:block:${key}`;

      await this.redis.pipeline().del(redisKey).del(blockKey).exec();
    } catch (error) {
      console.error("Rate limit reset failed:", error);
      throw new Error("Failed to reset rate limit");
    }
  }

  /**
   * Get rate limit analytics
   */
  static async getRateLimitAnalytics(
    keyPattern: string,
    keyPrefix = "rate_limit"
  ): Promise<{
    totalKeys: number;
    blockedKeys: number;
    topConsumers: Array<{ key: string; requestCount: number }>;
  }> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const pattern = `${keyPrefix}:${keyPattern}`;
      const blockPattern = `${keyPrefix}:block:${keyPattern}`;

      const [keys, blockKeys] = await Promise.all([
        this.redis.keys(pattern),
        this.redis.keys(blockPattern),
      ]);

      // Get request counts for top consumers
      const topConsumers: Array<{ key: string; requestCount: number }> = [];

      for (const key of keys.slice(0, 10)) {
        // Limit to top 10
        const count = await this.redis.zcard(key);
        const cleanKey = key.replace(`${keyPrefix}:`, "");
        topConsumers.push({ key: cleanKey, requestCount: count });
      }

      // Sort by request count
      topConsumers.sort((a, b) => b.requestCount - a.requestCount);

      return {
        totalKeys: keys.length,
        blockedKeys: blockKeys.length,
        topConsumers,
      };
    } catch (error) {
      console.error("Rate limit analytics failed:", error);
      return {
        totalKeys: 0,
        blockedKeys: 0,
        topConsumers: [],
      };
    }
  }

  /**
   * Cleanup expired rate limit data
   */
  static async cleanup(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const pattern = "rate_limit:*";
      const keys = await this.redis.keys(pattern);
      const now = Date.now();

      for (const key of keys) {
        // Remove expired entries from sorted sets
        if (!key.includes(":block:")) {
          await this.redis.zremrangebyscore(key, 0, now - 24 * 60 * 60 * 1000); // Remove entries older than 24 hours

          // Remove empty keys
          const count = await this.redis.zcard(key);
          if (count === 0) {
            await this.redis.del(key);
          }
        }
      }
    } catch (error) {
      console.error("Rate limit cleanup failed:", error);
    }
  }

  /**
   * Health check for rate limiting service
   */
  static async healthCheck(): Promise<{
    status: "healthy" | "unhealthy";
    redis: boolean;
    latency?: number;
  }> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      return {
        status: "healthy",
        redis: true,
        latency,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        redis: false,
      };
    }
  }
}
