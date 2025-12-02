import { Request, Response, NextFunction } from "express";
import { DeliveryAnalyticsService } from "../services/deliveryAnalytics.service";
import { DeliveryTrackingService } from "../services/deliveryTracking.service";
import { ApiError } from "../middleware/error.middleware";

export class DeliveryReportsController {
  /**
   * Get real-time delivery dashboard
   */
  static async getRealTimeDashboard(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;

      const dashboardData = await DeliveryAnalyticsService.getRealTimeDashboard(
        userId
      );

      res.status(200).json({
        success: true,
        message: "Real-time dashboard data retrieved successfully",
        data: dashboardData,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get real-time dashboard data",
        error: error.message,
      });
    }
  }

  /**
   * Get comprehensive delivery analytics
   */
  static async getDeliveryAnalytics(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const {
        startDate,
        endDate,
        countryCode,
        serviceType,
        period = "day",
      } = req.query;

      const filters: any = { period };

      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (countryCode) filters.countryCode = countryCode as string;
      if (serviceType) filters.serviceType = serviceType as string;

      const analytics = await DeliveryAnalyticsService.getDeliveryAnalytics(
        userId,
        filters
      );

      res.status(200).json({
        success: true,
        message: "Delivery analytics retrieved successfully",
        data: analytics,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get delivery analytics",
        error: error.message,
      });
    }
  }

  /**
   * Get delivery report by message ID
   */
  static async getDeliveryReport(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { messageId } = req.params;

      if (!messageId) {
        return res.status(400).json({
          success: false,
          message: "Message ID is required",
        });
      }

      const deliveryReport = await DeliveryTrackingService.getDeliveryReport(
        messageId,
        userId
      );

      res.status(200).json({
        success: true,
        message: "Delivery report retrieved successfully",
        data: deliveryReport,
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to get delivery report",
        error: error.message,
      });
    }
  }

  /**
   * Get delivery reports with pagination and filters
   */
  static async getDeliveryReports(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const {
        page = 1,
        limit = 20,
        status,
        countryCode,
        startDate,
        endDate,
        search,
      } = req.query;

      const filters: any = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      if (status) filters.status = status;
      if (countryCode) filters.countryCode = countryCode;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (search) filters.search = search;

      const reports = await DeliveryTrackingService.getDeliveryReports(
        userId,
        filters
      );

      res.status(200).json({
        success: true,
        message: "Delivery reports retrieved successfully",
        data: reports,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get delivery reports",
        error: error.message,
      });
    }
  }

  /**
   * Export delivery reports
   */
  static async exportDeliveryReports(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const {
        format = "csv",
        startDate,
        endDate,
        status,
        countryCode,
      } = req.query;

      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (status) filters.status = status;
      if (countryCode) filters.countryCode = countryCode;

      const exportData = await DeliveryTrackingService.exportDeliveryReports(
        userId,
        filters,
        format as string
      );

      // Set appropriate headers for file download
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `delivery-reports-${timestamp}.${format}`;

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Type", this.getContentType(format as string));

      res.status(200).send(exportData);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to export delivery reports",
        error: error.message,
      });
    }
  }

  /**
   * Get delivery performance metrics
   */
  static async getPerformanceMetrics(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { period = "30d" } = req.query;

      // Convert period string to AnalyticsFilters
      const filters: any = {};
      const now = new Date();

      switch (period) {
        case "7d":
          filters.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          filters.startDate = new Date(
            now.getTime() - 30 * 24 * 60 * 60 * 1000
          );
          break;
        case "90d":
          filters.startDate = new Date(
            now.getTime() - 90 * 24 * 60 * 60 * 1000
          );
          break;
        default:
          filters.startDate = new Date(
            now.getTime() - 30 * 24 * 60 * 60 * 1000
          );
      }
      filters.endDate = now;

      const metrics = await DeliveryAnalyticsService.getPerformanceMetrics(
        userId,
        filters
      );

      res.status(200).json({
        success: true,
        message: "Performance metrics retrieved successfully",
        data: metrics,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get performance metrics",
        error: error.message,
      });
    }
  }

  /**
   * Get delivery insights and recommendations
   */
  static async getDeliveryInsights(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { period = "30d" } = req.query;

      // Convert period string to AnalyticsFilters
      const filters: any = {};
      const now = new Date();

      switch (period) {
        case "7d":
          filters.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          filters.startDate = new Date(
            now.getTime() - 30 * 24 * 60 * 60 * 1000
          );
          break;
        case "90d":
          filters.startDate = new Date(
            now.getTime() - 90 * 24 * 60 * 60 * 1000
          );
          break;
        default:
          filters.startDate = new Date(
            now.getTime() - 30 * 24 * 60 * 60 * 1000
          );
      }
      filters.endDate = now;

      const insights = await DeliveryAnalyticsService.generateInsights(
        userId,
        filters
      );

      res.status(200).json({
        success: true,
        message: "Delivery insights retrieved successfully",
        data: insights,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get delivery insights",
        error: error.message,
      });
    }
  }

  /**
   * Get delivery status summary
   */
  static async getDeliveryStatusSummary(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { period = "24h" } = req.query;

      let startDate: Date;
      const endDate = new Date();

      switch (period) {
        case "1h":
          startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
          break;
        case "24h":
          startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      }

      const analytics = await DeliveryAnalyticsService.getDeliveryAnalytics(
        userId,
        {
          startDate,
          endDate,
        }
      );

      const summary = analytics.overall;

      res.status(200).json({
        success: true,
        message: "Delivery status summary retrieved successfully",
        data: {
          period,
          startDate,
          endDate,
          summary,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get delivery status summary",
        error: error.message,
      });
    }
  }

  /**
   * Get content type for export format
   */
  private static getContentType(format: string): string {
    switch (format.toLowerCase()) {
      case "csv":
        return "text/csv";
      case "excel":
      case "xlsx":
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      case "json":
        return "application/json";
      case "pdf":
        return "application/pdf";
      default:
        return "application/octet-stream";
    }
  }
}
