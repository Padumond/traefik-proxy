import { RateLimitingService } from '../../services/rateLimiting.service';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis');
const MockedRedis = Redis as jest.MockedClass<typeof Redis>;

describe('RateLimitingService', () => {
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    jest.resetAllMocks();
    
    // Create mock Redis instance
    mockRedis = {
      ping: jest.fn().mockResolvedValue('PONG'),
      pipeline: jest.fn().mockReturnValue({
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0], // zremrangebyscore result
          [null, 5], // zcard result (current count)
          [null, 1], // zadd result
          [null, 1], // expire result
        ]),
      }),
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      zcount: jest.fn().mockResolvedValue(5),
      keys: jest.fn().mockResolvedValue(['key1', 'key2']),
      zcard: jest.fn().mockResolvedValue(10),
      zremrangebyscore: jest.fn().mockResolvedValue(2),
    } as any;

    MockedRedis.mockImplementation(() => mockRedis);
    
    // Reset the service initialization
    (RateLimitingService as any).initialized = false;
    (RateLimitingService as any).redis = mockRedis;
  });

  describe('Initialization', () => {
    it('should initialize Redis connection successfully', async () => {
      await RateLimitingService.initialize();
      
      expect(mockRedis.ping).toHaveBeenCalled();
      expect((RateLimitingService as any).initialized).toBe(true);
    });

    it('should handle Redis connection failure', async () => {
      mockRedis.ping.mockRejectedValueOnce(new Error('Connection failed'));
      
      await expect(RateLimitingService.initialize()).rejects.toThrow(
        'Rate limiting service initialization failed'
      );
    });
  });

  describe('Rate Limit Checking', () => {
    beforeEach(async () => {
      await RateLimitingService.initialize();
    });

    it('should allow request within rate limit', async () => {
      const config = {
        windowMs: 60000, // 1 minute
        maxRequests: 10,
        keyPrefix: 'test',
      };

      const result = await RateLimitingService.checkRateLimit('test-key', config);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(4); // 10 - 6 (5 existing + 1 new)
      expect(result.resetTime).toBeInstanceOf(Date);
    });

    it('should deny request when rate limit exceeded', async () => {
      // Mock higher current count
      mockRedis.pipeline().exec = jest.fn().mockResolvedValue([
        [null, 0], // zremrangebyscore result
        [null, 10], // zcard result (current count at limit)
        [null, 1], // zadd result
        [null, 1], // expire result
      ]);

      const config = {
        windowMs: 60000,
        maxRequests: 10,
        keyPrefix: 'test',
      };

      const result = await RateLimitingService.checkRateLimit('test-key', config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should handle blocked keys', async () => {
      const futureTime = Date.now() + 300000; // 5 minutes from now
      mockRedis.get.mockResolvedValueOnce(futureTime.toString());

      const config = {
        windowMs: 60000,
        maxRequests: 10,
        keyPrefix: 'test',
        blockDuration: 300000,
      };

      const result = await RateLimitingService.checkRateLimit('test-key', config);

      expect(result.allowed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.blockedUntil).toBeInstanceOf(Date);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should apply block duration when limit exceeded', async () => {
      // Mock count exceeding limit
      mockRedis.pipeline().exec = jest.fn().mockResolvedValue([
        [null, 0],
        [null, 15], // Exceeds limit of 10
        [null, 1],
        [null, 1],
      ]);

      const config = {
        windowMs: 60000,
        maxRequests: 10,
        keyPrefix: 'test',
        blockDuration: 300000, // 5 minutes
      };

      const result = await RateLimitingService.checkRateLimit('test-key', config);

      expect(result.allowed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should fail open when Redis is unavailable', async () => {
      mockRedis.pipeline().exec = jest.fn().mockRejectedValue(new Error('Redis error'));

      const config = {
        windowMs: 60000,
        maxRequests: 10,
        keyPrefix: 'test',
      };

      const result = await RateLimitingService.checkRateLimit('test-key', config);

      expect(result.allowed).toBe(true); // Fail open
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
    });
  });

  describe('Multiple Rate Limits', () => {
    beforeEach(async () => {
      await RateLimitingService.initialize();
    });

    it('should check multiple rate limits', async () => {
      const strategies = [
        {
          key: 'key1',
          config: { windowMs: 60000, maxRequests: 10, keyPrefix: 'test1' },
        },
        {
          key: 'key2',
          config: { windowMs: 60000, maxRequests: 20, keyPrefix: 'test2' },
        },
      ];

      const results = await RateLimitingService.checkMultipleRateLimits(strategies);

      expect(results).toHaveLength(2);
      expect(results[0].limit).toBe(10);
      expect(results[1].limit).toBe(20);
    });
  });

  describe('Rate Limit Status', () => {
    beforeEach(async () => {
      await RateLimitingService.initialize();
    });

    it('should get rate limit status without incrementing', async () => {
      mockRedis.zcount.mockResolvedValueOnce(3);

      const config = {
        windowMs: 60000,
        maxRequests: 10,
        keyPrefix: 'test',
      };

      const result = await RateLimitingService.getRateLimitStatus('test-key', config);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(7); // 10 - 3
      expect(mockRedis.zcount).toHaveBeenCalled();
      expect(mockRedis.pipeline).not.toHaveBeenCalled(); // Should not increment
    });
  });

  describe('Rate Limit Reset', () => {
    beforeEach(async () => {
      await RateLimitingService.initialize();
    });

    it('should reset rate limit for a key', async () => {
      const mockPipeline = {
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 1], [null, 1]]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      await RateLimitingService.resetRateLimit('test-key', 'test');

      expect(mockPipeline.del).toHaveBeenCalledTimes(2); // Main key and block key
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('Analytics', () => {
    beforeEach(async () => {
      await RateLimitingService.initialize();
    });

    it('should get rate limit analytics', async () => {
      mockRedis.keys
        .mockResolvedValueOnce(['test:key1', 'test:key2'])
        .mockResolvedValueOnce(['test:block:key1']);
      
      mockRedis.zcard
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3);

      const analytics = await RateLimitingService.getRateLimitAnalytics('*', 'test');

      expect(analytics.totalKeys).toBe(2);
      expect(analytics.blockedKeys).toBe(1);
      expect(analytics.topConsumers).toHaveLength(2);
      expect(analytics.topConsumers[0].requestCount).toBe(5);
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await RateLimitingService.initialize();
    });

    it('should cleanup expired rate limit data', async () => {
      mockRedis.keys.mockResolvedValueOnce(['test:key1', 'test:block:key2']);
      mockRedis.zcard.mockResolvedValueOnce(0); // Empty key

      await RateLimitingService.cleanup();

      expect(mockRedis.zremrangebyscore).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled(); // Should delete empty key
    });
  });

  describe('Health Check', () => {
    beforeEach(async () => {
      await RateLimitingService.initialize();
    });

    it('should return healthy status when Redis is available', async () => {
      const startTime = Date.now();
      mockRedis.ping.mockResolvedValueOnce('PONG');

      const health = await RateLimitingService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.redis).toBe(true);
      expect(health.latency).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy status when Redis is unavailable', async () => {
      mockRedis.ping.mockRejectedValueOnce(new Error('Connection failed'));

      const health = await RateLimitingService.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.redis).toBe(false);
      expect(health.latency).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await RateLimitingService.initialize();
    });

    it('should handle expired blocks correctly', async () => {
      const pastTime = Date.now() - 300000; // 5 minutes ago
      mockRedis.get.mockResolvedValueOnce(pastTime.toString());

      const config = {
        windowMs: 60000,
        maxRequests: 10,
        keyPrefix: 'test',
      };

      const result = await RateLimitingService.checkRateLimit('test-key', config);

      expect(result.allowed).toBe(true);
      expect(result.blocked).toBeFalsy();
      expect(mockRedis.del).toHaveBeenCalled(); // Should remove expired block
    });

    it('should handle Redis pipeline execution failure', async () => {
      mockRedis.pipeline().exec = jest.fn().mockResolvedValue(null);

      const config = {
        windowMs: 60000,
        maxRequests: 10,
        keyPrefix: 'test',
      };

      await expect(
        RateLimitingService.checkRateLimit('test-key', config)
      ).rejects.toThrow('Redis pipeline execution failed');
    });

    it('should handle zero max requests', async () => {
      const config = {
        windowMs: 60000,
        maxRequests: 0,
        keyPrefix: 'test',
      };

      const result = await RateLimitingService.checkRateLimit('test-key', config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });
});
