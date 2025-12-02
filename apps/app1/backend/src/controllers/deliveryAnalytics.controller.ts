import { Request, Response, NextFunction } from 'express';
import { DeliveryAnalyticsService } from '../services/deliveryAnalytics.service';
import { ApiError } from '../middleware/error.middleware';

export class DeliveryAnalyticsController {
  /**
   * Get comprehensive delivery analytics
   */
  static async getDeliveryAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        startDate,
        endDate,
        countryCode,
        serviceType,
        period
      } = req.query;

      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (countryCode) filters.countryCode = countryCode as string;
      if (serviceType) filters.serviceType = serviceType as string;
      if (period) filters.period = period as any;

      const analytics = await DeliveryAnalyticsService.getDeliveryAnalytics(userId, filters);

      res.status(200).json({
        success: true,
        message: 'Delivery analytics retrieved successfully',
        data: analytics
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        res.status(error.statusCode || 400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get delivery analytics'
        });
      }
    }
  }

  /**
   * Get performance metrics
   */
  static async getPerformanceMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        startDate,
        endDate,
        countryCode,
        serviceType
      } = req.query;

      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (countryCode) filters.countryCode = countryCode as string;
      if (serviceType) filters.serviceType = serviceType as string;

      const metrics = await DeliveryAnalyticsService.getPerformanceMetrics(userId, filters);

      res.status(200).json({
        success: true,
        message: 'Performance metrics retrieved successfully',
        data: metrics
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        res.status(error.statusCode || 400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get performance metrics'
        });
      }
    }
  }

  /**
   * Generate delivery insights
   */
  static async generateInsights(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        startDate,
        endDate,
        countryCode,
        serviceType
      } = req.query;

      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (countryCode) filters.countryCode = countryCode as string;
      if (serviceType) filters.serviceType = serviceType as string;

      const insights = await DeliveryAnalyticsService.generateInsights(userId, filters);

      res.status(200).json({
        success: true,
        message: 'Delivery insights generated successfully',
        data: insights
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        res.status(error.statusCode || 400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to generate insights'
        });
      }
    }
  }

  /**
   * Get delivery trends
   */
  static async getDeliveryTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        period = 'day',
        days = 30,
        countryCode,
        serviceType
      } = req.query;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days as string));

      const filters: any = {
        startDate,
        endDate,
        period: period as any
      };

      if (countryCode) filters.countryCode = countryCode as string;
      if (serviceType) filters.serviceType = serviceType as string;

      const analytics = await DeliveryAnalyticsService.getDeliveryAnalytics(userId, filters);

      res.status(200).json({
        success: true,
        message: 'Delivery trends retrieved successfully',
        data: {
          period: period as string,
          days: parseInt(days as string),
          trends: analytics.trends
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get delivery trends'
      });
    }
  }

  /**
   * Get country breakdown
   */
  static async getCountryBreakdown(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        startDate,
        endDate,
        limit = 10
      } = req.query;

      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const analytics = await DeliveryAnalyticsService.getDeliveryAnalytics(userId, filters);

      const countryBreakdown = analytics.breakdowns.byCountry.slice(0, parseInt(limit as string));

      res.status(200).json({
        success: true,
        message: 'Country breakdown retrieved successfully',
        data: countryBreakdown
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get country breakdown'
      });
    }
  }

  /**
   * Get service breakdown
   */
  static async getServiceBreakdown(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        startDate,
        endDate,
        countryCode
      } = req.query;

      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (countryCode) filters.countryCode = countryCode as string;

      const analytics = await DeliveryAnalyticsService.getDeliveryAnalytics(userId, filters);

      res.status(200).json({
        success: true,
        message: 'Service breakdown retrieved successfully',
        data: analytics.breakdowns.byService
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get service breakdown'
      });
    }
  }

  /**
   * Get hourly distribution
   */
  static async getHourlyDistribution(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        startDate,
        endDate,
        countryCode
      } = req.query;

      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (countryCode) filters.countryCode = countryCode as string;

      const analytics = await DeliveryAnalyticsService.getDeliveryAnalytics(userId, filters);

      res.status(200).json({
        success: true,
        message: 'Hourly distribution retrieved successfully',
        data: analytics.breakdowns.byHour
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get hourly distribution'
      });
    }
  }

  /**
   * Get failure analysis
   */
  static async getFailureAnalysis(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        startDate,
        endDate,
        countryCode,
        limit = 10
      } = req.query;

      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (countryCode) filters.countryCode = countryCode as string;

      const analytics = await DeliveryAnalyticsService.getDeliveryAnalytics(userId, filters);

      const failureAnalysis = {
        ...analytics.failures,
        reasons: analytics.failures.reasons.slice(0, parseInt(limit as string))
      };

      res.status(200).json({
        success: true,
        message: 'Failure analysis retrieved successfully',
        data: failureAnalysis
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get failure analysis'
      });
    }
  }

  /**
   * Get analytics dashboard data
   */
  static async getAnalyticsDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { period = 'week' } = req.query;

      let startDate: Date;
      const endDate = new Date();

      switch (period) {
        case 'today':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        default:
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
      }

      const [analytics, performance, insights] = await Promise.all([
        DeliveryAnalyticsService.getDeliveryAnalytics(userId, { startDate, endDate }),
        DeliveryAnalyticsService.getPerformanceMetrics(userId, { startDate, endDate }),
        DeliveryAnalyticsService.generateInsights(userId, { startDate, endDate })
      ]);

      const dashboard = {
        period: period as string,
        overview: analytics.overall,
        performance,
        trends: analytics.trends.slice(-7), // Last 7 data points
        topCountries: analytics.breakdowns.byCountry.slice(0, 5),
        serviceBreakdown: analytics.breakdowns.byService,
        insights: insights.insights.slice(0, 3), // Top 3 insights
        alerts: insights.insights.filter(i => i.type === 'warning')
      };

      res.status(200).json({
        success: true,
        message: 'Analytics dashboard data retrieved successfully',
        data: dashboard
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get analytics dashboard data'
      });
    }
  }

  /**
   * Compare periods
   */
  static async comparePeriods(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        currentStart,
        currentEnd,
        previousStart,
        previousEnd
      } = req.query;

      if (!currentStart || !currentEnd || !previousStart || !previousEnd) {
        return res.status(400).json({
          success: false,
          message: 'All period dates are required'
        });
      }

      const [currentPeriod, previousPeriod] = await Promise.all([
        DeliveryAnalyticsService.getDeliveryAnalytics(userId, {
          startDate: new Date(currentStart as string),
          endDate: new Date(currentEnd as string)
        }),
        DeliveryAnalyticsService.getDeliveryAnalytics(userId, {
          startDate: new Date(previousStart as string),
          endDate: new Date(previousEnd as string)
        })
      ]);

      const comparison = {
        current: currentPeriod.overall,
        previous: previousPeriod.overall,
        changes: {
          totalMessages: currentPeriod.overall.totalMessages - previousPeriod.overall.totalMessages,
          deliveryRate: currentPeriod.overall.deliveryRate - previousPeriod.overall.deliveryRate,
          failureRate: currentPeriod.overall.failureRate - previousPeriod.overall.failureRate,
          avgDeliveryTime: (currentPeriod.overall.avgDeliveryTime || 0) - (previousPeriod.overall.avgDeliveryTime || 0),
          totalCost: currentPeriod.overall.totalCost - previousPeriod.overall.totalCost
        }
      };

      res.status(200).json({
        success: true,
        message: 'Period comparison completed successfully',
        data: comparison
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to compare periods'
      });
    }
  }
}
