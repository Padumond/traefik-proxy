import { Request, Response, NextFunction } from 'express';
import { ApiUsageAnalyticsService } from '../services/apiUsageAnalytics.service';
import { ApiError } from '../middleware/error.middleware';

export class ApiUsageAnalyticsController {
  /**
   * Get user analytics
   */
  static async getUserAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized('Authentication required');
      }

      const {
        startDate,
        endDate,
        endpoint,
        method,
        statusCode,
      } = req.query;

      const filter: any = {};
      if (startDate) filter.startDate = new Date(startDate as string);
      if (endDate) filter.endDate = new Date(endDate as string);
      if (endpoint) filter.endpoint = endpoint as string;
      if (method) filter.method = method as string;
      if (statusCode) filter.statusCode = parseInt(statusCode as string);

      const analytics = await ApiUsageAnalyticsService.getUserAnalytics(userId, filter);

      res.json({
        success: true,
        message: 'User analytics retrieved successfully',
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get real-time analytics
   */
  static async getRealTimeAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized('Authentication required');
      }

      const { date } = req.query;
      const analytics = await ApiUsageAnalyticsService.getRealTimeAnalytics(
        userId,
        date as string
      );

      res.json({
        success: true,
        message: 'Real-time analytics retrieved successfully',
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get billing metrics
   */
  static async getBillingMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized('Authentication required');
      }

      const {
        startDate,
        endDate,
      } = req.query;

      const filter: any = {};
      if (startDate) filter.startDate = new Date(startDate as string);
      if (endDate) filter.endDate = new Date(endDate as string);

      const metrics = await ApiUsageAnalyticsService.getBillingMetrics(userId, filter);

      res.json({
        success: true,
        message: 'Billing metrics retrieved successfully',
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top consumers (admin only)
   */
  static async getTopConsumers(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.role !== 'ADMIN') {
        throw ApiError.forbidden('Admin access required');
      }

      const {
        startDate,
        endDate,
        limit,
      } = req.query;

      const filter: any = {};
      if (startDate) filter.startDate = new Date(startDate as string);
      if (endDate) filter.endDate = new Date(endDate as string);
      if (limit) filter.limit = parseInt(limit as string);

      const consumers = await ApiUsageAnalyticsService.getTopConsumers(filter);

      res.json({
        success: true,
        message: 'Top consumers retrieved successfully',
        data: consumers,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get system analytics (admin only)
   */
  static async getSystemAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.role !== 'ADMIN') {
        throw ApiError.forbidden('Admin access required');
      }

      const {
        startDate,
        endDate,
      } = req.query;

      const filter: any = {};
      if (startDate) filter.startDate = new Date(startDate as string);
      if (endDate) filter.endDate = new Date(endDate as string);

      const analytics = await ApiUsageAnalyticsService.getSystemAnalytics(filter);

      res.json({
        success: true,
        message: 'System analytics retrieved successfully',
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get analytics dashboard data
   */
  static async getDashboardData(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized('Authentication required');
      }

      const { period = '30d' } = req.query;

      // Calculate date range based on period
      let startDate: Date;
      const endDate = new Date();

      switch (period) {
        case '24h':
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }

      const [
        analytics,
        billingMetrics,
        realTimeData,
      ] = await Promise.all([
        ApiUsageAnalyticsService.getUserAnalytics(userId, { startDate, endDate }),
        ApiUsageAnalyticsService.getBillingMetrics(userId, { startDate, endDate }),
        ApiUsageAnalyticsService.getRealTimeAnalytics(userId),
      ]);

      const dashboardData = {
        period,
        dateRange: { startDate, endDate },
        overview: {
          totalRequests: analytics.totalRequests,
          successRate: analytics.totalRequests > 0 
            ? ((analytics.successfulRequests / analytics.totalRequests) * 100).toFixed(2)
            : '0',
          averageResponseTime: analytics.averageResponseTime.toFixed(0),
          totalCost: billingMetrics.totalCost.toFixed(2),
        },
        charts: {
          requestsOverTime: analytics.requestsByHour,
          topEndpoints: analytics.topEndpoints.slice(0, 5),
          errorDistribution: analytics.errorsByType,
          costBreakdown: billingMetrics.costByService,
        },
        realTime: realTimeData,
        billing: {
          projectedMonthlyCost: billingMetrics.projectedMonthlyCost.toFixed(2),
          averageCostPerRequest: billingMetrics.averageCostPerRequest.toFixed(4),
        },
      };

      res.json({
        success: true,
        message: 'Dashboard data retrieved successfully',
        data: dashboardData,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export analytics data
   */
  static async exportAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized('Authentication required');
      }

      const {
        startDate,
        endDate,
        format = 'json',
      } = req.query;

      const filter: any = {};
      if (startDate) filter.startDate = new Date(startDate as string);
      if (endDate) filter.endDate = new Date(endDate as string);

      const analytics = await ApiUsageAnalyticsService.getUserAnalytics(userId, filter);

      if (format === 'csv') {
        // Convert to CSV format
        const csvData = this.convertToCSV(analytics);
        
        res.set({
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-${userId}-${Date.now()}.csv"`,
        });
        
        res.send(csvData);
      } else {
        // Return JSON format
        res.set({
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="analytics-${userId}-${Date.now()}.json"`,
        });
        
        res.json({
          exportDate: new Date().toISOString(),
          userId,
          filter,
          data: analytics,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get analytics summary
   */
  static async getAnalyticsSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized('Authentication required');
      }

      // Get data for different periods
      const now = new Date();
      const [
        todayData,
        weekData,
        monthData,
      ] = await Promise.all([
        ApiUsageAnalyticsService.getUserAnalytics(userId, {
          startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          endDate: now,
        }),
        ApiUsageAnalyticsService.getUserAnalytics(userId, {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDate: now,
        }),
        ApiUsageAnalyticsService.getUserAnalytics(userId, {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: now,
        }),
      ]);

      const summary = {
        today: {
          requests: todayData.totalRequests,
          cost: todayData.totalCost,
          successRate: todayData.totalRequests > 0 
            ? (todayData.successfulRequests / todayData.totalRequests * 100).toFixed(1)
            : '0',
        },
        thisWeek: {
          requests: weekData.totalRequests,
          cost: weekData.totalCost,
          successRate: weekData.totalRequests > 0 
            ? (weekData.successfulRequests / weekData.totalRequests * 100).toFixed(1)
            : '0',
        },
        thisMonth: {
          requests: monthData.totalRequests,
          cost: monthData.totalCost,
          successRate: monthData.totalRequests > 0 
            ? (monthData.successfulRequests / monthData.totalRequests * 100).toFixed(1)
            : '0',
        },
        trends: {
          requestsGrowth: this.calculateGrowth(weekData.totalRequests, todayData.totalRequests * 7),
          costGrowth: this.calculateGrowth(weekData.totalCost, todayData.totalCost * 7),
        },
      };

      res.json({
        success: true,
        message: 'Analytics summary retrieved successfully',
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Convert analytics data to CSV format
   */
  private static convertToCSV(analytics: any): string {
    const headers = [
      'Metric',
      'Value',
    ];

    const rows = [
      ['Total Requests', analytics.totalRequests],
      ['Successful Requests', analytics.successfulRequests],
      ['Failed Requests', analytics.failedRequests],
      ['Average Response Time (ms)', analytics.averageResponseTime],
      ['Total Cost', analytics.totalCost],
    ];

    // Add endpoint data
    Object.entries(analytics.requestsByEndpoint).forEach(([endpoint, count]) => {
      rows.push([`Requests to ${endpoint}`, count]);
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Calculate growth percentage
   */
  private static calculateGrowth(current: number, previous: number): string {
    if (previous === 0) return current > 0 ? '+100' : '0';
    const growth = ((current - previous) / previous) * 100;
    return growth >= 0 ? `+${growth.toFixed(1)}` : growth.toFixed(1);
  }
}
