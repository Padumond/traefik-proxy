import { Request, Response, NextFunction } from "express";
import { ResellerDashboardService } from "../services/resellerDashboard.service";
import { ApiError } from "../middleware/error.middleware";

export class ResellerDashboardController {
  /**
   * Get dashboard overview
   */
  static async getDashboardOverview(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { period, startDate, endDate } = req.query;

      const filters: any = {};
      if (period) filters.period = period as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const overview = await ResellerDashboardService.getDashboardOverview(
        userId,
        filters
      );

      res.status(200).json({
        success: true,
        message: "Dashboard overview retrieved successfully",
        data: overview,
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        res.status(error.statusCode || 400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to get dashboard overview",
        });
      }
    }
  }

  /**
   * Get SMS analytics
   */
  static async getSmsAnalytics(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { startDate, endDate, days = 30 } = req.query;

      let start: Date, end: Date;

      if (startDate && endDate) {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
      } else {
        end = new Date();
        start = new Date();
        start.setDate(start.getDate() - parseInt(days as string));
      }

      const analytics = await ResellerDashboardService.getSmsAnalytics(
        userId,
        start,
        end
      );

      res.status(200).json({
        success: true,
        message: "SMS analytics retrieved successfully",
        data: analytics,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get SMS analytics",
      });
    }
  }

  /**
   * Get client analytics
   */
  static async getClientAnalytics(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { startDate, endDate, days = 30 } = req.query;

      let start: Date, end: Date;

      if (startDate && endDate) {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
      } else {
        end = new Date();
        start = new Date();
        start.setDate(start.getDate() - parseInt(days as string));
      }

      const analytics = await ResellerDashboardService.getClientAnalytics(
        userId,
        start,
        end
      );

      res.status(200).json({
        success: true,
        message: "Client analytics retrieved successfully",
        data: analytics,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get client analytics",
      });
    }
  }

  /**
   * Get profit trends
   */
  static async getProfitTrends(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { period = "daily", days = 30 } = req.query;

      if (!["daily", "weekly", "monthly"].includes(period as string)) {
        return res.status(400).json({
          success: false,
          message: "Period must be daily, weekly, or monthly",
        });
      }

      const trends = await ResellerDashboardService.getProfitTrends(
        userId,
        period as any,
        parseInt(days as string)
      );

      res.status(200).json({
        success: true,
        message: "Profit trends retrieved successfully",
        data: trends,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get profit trends",
      });
    }
  }

  /**
   * Get top performing services
   */
  static async getTopPerformingServices(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { limit = 5 } = req.query;

      const services = await ResellerDashboardService.getTopPerformingServices(
        userId,
        parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        message: "Top performing services retrieved successfully",
        data: services,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get top performing services",
      });
    }
  }

  /**
   * Get business insights
   */
  static async getBusinessInsights(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;

      const insights = await ResellerDashboardService.getBusinessInsights(
        userId
      );

      res.status(200).json({
        success: true,
        message: "Business insights retrieved successfully",
        data: insights,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get business insights",
      });
    }
  }

  /**
   * Get recent transactions
   */
  static async getRecentTransactions(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { limit = 10 } = req.query;

      const transactions = await ResellerDashboardService.getRecentTransactions(
        userId,
        parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        message: "Recent transactions retrieved successfully",
        data: transactions,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get recent transactions",
      });
    }
  }

  /**
   * Get comprehensive business report
   */
  static async getBusinessReport(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { period = "month", format = "json" } = req.query;

      const filters: any = { period };

      const [overview, trends, topServices, insights] = await Promise.all([
        ResellerDashboardService.getDashboardOverview(userId, filters),
        ResellerDashboardService.getProfitTrends(userId, "daily", 30),
        ResellerDashboardService.getTopPerformingServices(userId, 10),
        ResellerDashboardService.getBusinessInsights(userId),
      ]);

      const report = {
        generatedAt: new Date(),
        period: period,
        overview,
        trends,
        topServices,
        insights,
        summary: {
          totalProfit: overview.profit.totalProfit,
          totalRevenue: overview.billing.totalRevenue,
          totalTransactions: overview.profit.totalTransactions,
          profitMargin:
            overview.billing.totalRevenue > 0
              ? (overview.profit.totalProfit / overview.billing.totalRevenue) *
                100
              : 0,
        },
      };

      if (format === "csv") {
        // TODO: Implement CSV export
        return res.status(501).json({
          success: false,
          message: "CSV export not yet implemented",
        });
      }

      res.status(200).json({
        success: true,
        message: "Business report generated successfully",
        data: report,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to generate business report",
      });
    }
  }

  /**
   * Get key performance indicators (KPIs)
   */
  static async getKPIs(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { period = "month" } = req.query;

      const overview = await ResellerDashboardService.getDashboardOverview(
        userId,
        { period: period as any }
      );

      // Calculate KPIs
      const kpis = {
        revenue: {
          current: overview.billing.totalRevenue,
          target: 10000, // This could be configurable
          achievement: (overview.billing.totalRevenue / 10000) * 100,
        },
        profit: {
          current: overview.profit.totalProfit,
          margin:
            overview.billing.totalRevenue > 0
              ? (overview.profit.totalProfit / overview.billing.totalRevenue) *
                100
              : 0,
          target: 20, // 20% profit margin target
        },
        clients: {
          total: overview.clients.totalClients,
          active: overview.clients.activeClients,
          retention: overview.clients.clientRetentionRate,
          target: 95, // 95% retention target
        },
        sms: {
          volume: overview.sms.totalSms,
          deliveryRate: overview.sms.deliveryRate,
          target: 98, // 98% delivery rate target
        },
        billing: {
          paymentRate: overview.billing.paymentRate,
          overdueInvoices: overview.billing.overdueInvoices,
          target: 95, // 95% payment rate target
        },
      };

      res.status(200).json({
        success: true,
        message: "KPIs retrieved successfully",
        data: kpis,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get KPIs",
      });
    }
  }

  /**
   * Get dashboard widgets data
   */
  static async getDashboardWidgets(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;

      const [overview, recentTransactions, topServices] = await Promise.all([
        ResellerDashboardService.getDashboardOverview(userId, {
          period: "month",
        }),
        ResellerDashboardService.getRecentTransactions(userId, 5),
        ResellerDashboardService.getTopPerformingServices(userId, 3),
      ]);

      const widgets = {
        summary: {
          totalProfit: overview.profit.totalProfit,
          totalRevenue: overview.billing.totalRevenue,
          totalClients: overview.clients.totalClients,
          totalSms: overview.sms.totalSms,
        },
        charts: {
          profitTrend: overview.profit.profitByType,
          smsDelivery: {
            successful: overview.sms.successfulSms,
            failed: overview.sms.failedSms,
            rate: overview.sms.deliveryRate,
          },
        },
        lists: {
          recentTransactions,
          topServices,
        },
        alerts: [], // TODO: Implement alerts system
      };

      res.status(200).json({
        success: true,
        message: "Dashboard widgets data retrieved successfully",
        data: widgets,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get dashboard widgets data",
      });
    }
  }
}
