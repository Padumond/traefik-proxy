import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { ApiError } from '../middleware/error.middleware';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface ApiUsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalCost: number;
  requestsByEndpoint: Record<string, number>;
  requestsByHour: Record<string, number>;
  errorsByType: Record<string, number>;
  topEndpoints: Array<{ endpoint: string; count: number; percentage: number }>;
}

export interface UsageAnalyticsFilter {
  userId?: string;
  apiKeyId?: string;
  startDate?: Date;
  endDate?: Date;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  limit?: number;
  offset?: number;
}

export interface BillingMetrics {
  totalCost: number;
  costByService: Record<string, number>;
  costByDate: Record<string, number>;
  averageCostPerRequest: number;
  projectedMonthlyCost: number;
}

export class ApiUsageAnalyticsService {
  /**
   * Track API request
   */
  static async trackRequest(data: {
    userId: string;
    apiKeyId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    cost?: number;
    userAgent?: string;
    ipAddress?: string;
    requestSize?: number;
    responseSize?: number;
  }): Promise<void> {
    try {
      const timestamp = new Date();
      const hour = timestamp.getHours();
      const date = timestamp.toISOString().split('T')[0];

      // Store in database for long-term analytics
      await prisma.apiUsageLog.create({
        data: {
          userId: data.userId,
          apiKeyId: data.apiKeyId,
          endpoint: data.endpoint,
          method: data.method,
          statusCode: data.statusCode,
          responseTime: data.responseTime,
          cost: data.cost || 0,
          userAgent: data.userAgent,
          ipAddress: data.ipAddress,
          requestSize: data.requestSize,
          responseSize: data.responseSize,
          timestamp,
        },
      });

      // Store in Redis for real-time analytics
      const redisKey = `analytics:${data.userId}:${date}`;
      const pipeline = redis.pipeline();

      // Increment counters
      pipeline.hincrby(redisKey, 'total_requests', 1);
      pipeline.hincrby(redisKey, `status_${data.statusCode}`, 1);
      pipeline.hincrby(redisKey, `endpoint_${data.endpoint}`, 1);
      pipeline.hincrby(redisKey, `method_${data.method}`, 1);
      pipeline.hincrby(redisKey, `hour_${hour}`, 1);

      // Add response time for average calculation
      pipeline.lpush(`${redisKey}:response_times`, data.responseTime);
      pipeline.ltrim(`${redisKey}:response_times`, 0, 999); // Keep last 1000 response times

      // Add cost
      if (data.cost) {
        pipeline.hincrbyfloat(redisKey, 'total_cost', data.cost);
      }

      // Set expiry for Redis keys (30 days)
      pipeline.expire(redisKey, 30 * 24 * 60 * 60);
      pipeline.expire(`${redisKey}:response_times`, 30 * 24 * 60 * 60);

      await pipeline.exec();
    } catch (error) {
      console.error('Error tracking API request:', error);
      // Don't throw error to avoid affecting API performance
    }
  }

  /**
   * Get usage analytics for a user
   */
  static async getUserAnalytics(
    userId: string,
    filter: UsageAnalyticsFilter = {}
  ): Promise<ApiUsageMetrics> {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate = new Date(),
        endpoint,
        method,
        statusCode,
      } = filter;

      // Build where clause
      const whereClause: any = {
        userId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (endpoint) whereClause.endpoint = endpoint;
      if (method) whereClause.method = method;
      if (statusCode) whereClause.statusCode = statusCode;

      // Get aggregated data from database
      const [
        totalStats,
        endpointStats,
        hourlyStats,
        errorStats,
      ] = await Promise.all([
        // Total statistics
        prisma.apiUsageLog.aggregate({
          where: whereClause,
          _count: { id: true },
          _avg: { responseTime: true },
          _sum: { cost: true },
        }),

        // Requests by endpoint
        prisma.apiUsageLog.groupBy({
          by: ['endpoint'],
          where: whereClause,
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),

        // Requests by hour
        prisma.$queryRaw`
          SELECT EXTRACT(HOUR FROM timestamp) as hour, COUNT(*) as count
          FROM api_usage_logs
          WHERE user_id = ${userId}
            AND timestamp >= ${startDate}
            AND timestamp <= ${endDate}
          GROUP BY EXTRACT(HOUR FROM timestamp)
          ORDER BY hour
        `,

        // Errors by status code
        prisma.apiUsageLog.groupBy({
          by: ['statusCode'],
          where: {
            ...whereClause,
            statusCode: { gte: 400 },
          },
          _count: { id: true },
        }),
      ]);

      // Calculate success/failure rates
      const successfulRequests = await prisma.apiUsageLog.count({
        where: {
          ...whereClause,
          statusCode: { lt: 400 },
        },
      });

      const failedRequests = totalStats._count.id - successfulRequests;

      // Process endpoint statistics
      const requestsByEndpoint: Record<string, number> = {};
      const topEndpoints = endpointStats.map(stat => ({
        endpoint: stat.endpoint,
        count: stat._count.id,
        percentage: (stat._count.id / totalStats._count.id) * 100,
      }));

      endpointStats.forEach(stat => {
        requestsByEndpoint[stat.endpoint] = stat._count.id;
      });

      // Process hourly statistics
      const requestsByHour: Record<string, number> = {};
      (hourlyStats as any[]).forEach((stat: any) => {
        requestsByHour[stat.hour.toString()] = parseInt(stat.count);
      });

      // Process error statistics
      const errorsByType: Record<string, number> = {};
      errorStats.forEach(stat => {
        errorsByType[stat.statusCode.toString()] = stat._count.id;
      });

      return {
        totalRequests: totalStats._count.id,
        successfulRequests,
        failedRequests,
        averageResponseTime: totalStats._avg.responseTime || 0,
        totalCost: totalStats._sum.cost || 0,
        requestsByEndpoint,
        requestsByHour,
        errorsByType,
        topEndpoints,
      };
    } catch (error) {
      console.error('Error getting user analytics:', error);
      throw ApiError.internal('Failed to retrieve analytics');
    }
  }

  /**
   * Get real-time analytics from Redis
   */
  static async getRealTimeAnalytics(userId: string, date?: string): Promise<any> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const redisKey = `analytics:${userId}:${targetDate}`;

      const [hashData, responseTimes] = await Promise.all([
        redis.hgetall(redisKey),
        redis.lrange(`${redisKey}:response_times`, 0, -1),
      ]);

      // Calculate average response time
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + parseFloat(time), 0) / responseTimes.length
        : 0;

      // Process hash data
      const analytics = {
        totalRequests: parseInt(hashData.total_requests || '0'),
        totalCost: parseFloat(hashData.total_cost || '0'),
        averageResponseTime: avgResponseTime,
        statusCodes: {} as Record<string, number>,
        endpoints: {} as Record<string, number>,
        methods: {} as Record<string, number>,
        hourlyDistribution: {} as Record<string, number>,
      };

      // Extract status codes, endpoints, methods, and hourly data
      Object.keys(hashData).forEach(key => {
        const value = parseInt(hashData[key]);
        
        if (key.startsWith('status_')) {
          analytics.statusCodes[key.replace('status_', '')] = value;
        } else if (key.startsWith('endpoint_')) {
          analytics.endpoints[key.replace('endpoint_', '')] = value;
        } else if (key.startsWith('method_')) {
          analytics.methods[key.replace('method_', '')] = value;
        } else if (key.startsWith('hour_')) {
          analytics.hourlyDistribution[key.replace('hour_', '')] = value;
        }
      });

      return analytics;
    } catch (error) {
      console.error('Error getting real-time analytics:', error);
      throw ApiError.internal('Failed to retrieve real-time analytics');
    }
  }

  /**
   * Get billing metrics
   */
  static async getBillingMetrics(
    userId: string,
    filter: UsageAnalyticsFilter = {}
  ): Promise<BillingMetrics> {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
      } = filter;

      const whereClause = {
        userId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        cost: { gt: 0 },
      };

      // Get cost by service (endpoint)
      const costByService = await prisma.apiUsageLog.groupBy({
        by: ['endpoint'],
        where: whereClause,
        _sum: { cost: true },
        _count: { id: true },
      });

      // Get cost by date
      const costByDate = await prisma.$queryRaw`
        SELECT DATE(timestamp) as date, SUM(cost) as total_cost
        FROM api_usage_logs
        WHERE user_id = ${userId}
          AND timestamp >= ${startDate}
          AND timestamp <= ${endDate}
          AND cost > 0
        GROUP BY DATE(timestamp)
        ORDER BY date
      `;

      // Calculate total metrics
      const totalStats = await prisma.apiUsageLog.aggregate({
        where: whereClause,
        _sum: { cost: true },
        _count: { id: true },
      });

      const totalCost = totalStats._sum.cost || 0;
      const totalRequests = totalStats._count.id;
      const averageCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;

      // Calculate projected monthly cost (based on current month's usage)
      const currentMonth = new Date();
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthStats = await prisma.apiUsageLog.aggregate({
        where: {
          userId,
          timestamp: { gte: monthStart },
          cost: { gt: 0 },
        },
        _sum: { cost: true },
      });

      const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
      const daysPassed = currentMonth.getDate();
      const projectedMonthlyCost = monthStats._sum.cost
        ? (monthStats._sum.cost / daysPassed) * daysInMonth
        : 0;

      // Process results
      const serviceMetrics: Record<string, number> = {};
      costByService.forEach(service => {
        serviceMetrics[service.endpoint] = service._sum.cost || 0;
      });

      const dateMetrics: Record<string, number> = {};
      (costByDate as any[]).forEach((item: any) => {
        dateMetrics[item.date] = parseFloat(item.total_cost);
      });

      return {
        totalCost,
        costByService: serviceMetrics,
        costByDate: dateMetrics,
        averageCostPerRequest,
        projectedMonthlyCost,
      };
    } catch (error) {
      console.error('Error getting billing metrics:', error);
      throw ApiError.internal('Failed to retrieve billing metrics');
    }
  }

  /**
   * Get top API consumers (admin only)
   */
  static async getTopConsumers(
    filter: UsageAnalyticsFilter = {}
  ): Promise<Array<{
    userId: string;
    userName: string;
    totalRequests: number;
    totalCost: number;
    averageResponseTime: number;
  }>> {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        limit = 10,
      } = filter;

      const topUsers = await prisma.apiUsageLog.groupBy({
        by: ['userId'],
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: { id: true },
        _sum: { cost: true },
        _avg: { responseTime: true },
        orderBy: { _count: { id: 'desc' } },
        take: limit,
      });

      // Get user details
      const userIds = topUsers.map(user => user.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      });

      const userMap = new Map(users.map(user => [user.id, user.name]));

      return topUsers.map(user => ({
        userId: user.userId,
        userName: userMap.get(user.userId) || 'Unknown',
        totalRequests: user._count.id,
        totalCost: user._sum.cost || 0,
        averageResponseTime: user._avg.responseTime || 0,
      }));
    } catch (error) {
      console.error('Error getting top consumers:', error);
      throw ApiError.internal('Failed to retrieve top consumers');
    }
  }

  /**
   * Get system-wide analytics (admin only)
   */
  static async getSystemAnalytics(
    filter: UsageAnalyticsFilter = {}
  ): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalRequests: number;
    totalRevenue: number;
    averageRequestsPerUser: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
    errorRate: number;
  }> {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
      } = filter;

      const [
        totalUsers,
        activeUsers,
        totalStats,
        topEndpoints,
        errorCount,
      ] = await Promise.all([
        // Total users
        prisma.user.count({ where: { role: 'CLIENT' } }),

        // Active users (users who made requests in the period)
        prisma.apiUsageLog.findMany({
          where: {
            timestamp: { gte: startDate, lte: endDate },
          },
          select: { userId: true },
          distinct: ['userId'],
        }).then(users => users.length),

        // Total statistics
        prisma.apiUsageLog.aggregate({
          where: {
            timestamp: { gte: startDate, lte: endDate },
          },
          _count: { id: true },
          _sum: { cost: true },
        }),

        // Top endpoints
        prisma.apiUsageLog.groupBy({
          by: ['endpoint'],
          where: {
            timestamp: { gte: startDate, lte: endDate },
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 5,
        }),

        // Error count
        prisma.apiUsageLog.count({
          where: {
            timestamp: { gte: startDate, lte: endDate },
            statusCode: { gte: 400 },
          },
        }),
      ]);

      const totalRequests = totalStats._count.id;
      const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;
      const averageRequestsPerUser = activeUsers > 0 ? totalRequests / activeUsers : 0;

      return {
        totalUsers,
        activeUsers,
        totalRequests,
        totalRevenue: totalStats._sum.cost || 0,
        averageRequestsPerUser,
        topEndpoints: topEndpoints.map(ep => ({
          endpoint: ep.endpoint,
          count: ep._count.id,
        })),
        errorRate,
      };
    } catch (error) {
      console.error('Error getting system analytics:', error);
      throw ApiError.internal('Failed to retrieve system analytics');
    }
  }

  /**
   * Clean up old analytics data
   */
  static async cleanupOldData(daysToKeep: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      await prisma.apiUsageLog.deleteMany({
        where: {
          timestamp: { lt: cutoffDate },
        },
      });

      console.log(`Cleaned up analytics data older than ${daysToKeep} days`);
    } catch (error) {
      console.error('Error cleaning up analytics data:', error);
    }
  }
}
