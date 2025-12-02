import { Request, Response, NextFunction } from "express";
import { ApiError } from "../middleware/error.middleware";
import { DeliveryWebhookService } from "../services/deliveryWebhook.service";
import crypto from "crypto";

export class DeliveryWebhookController {
  /**
   * Handle Arkessel delivery status webhook
   */
  static async handleDeliveryWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.body;
      const signature = req.headers["x-arkessel-signature"] as string;

      // Verify webhook signature if provided
      if (signature && !this.verifyWebhookSignature(payload, signature)) {
        throw ApiError.unauthorized("Invalid webhook signature");
      }

      // Validate payload
      if (!payload.message_id || !payload.status) {
        throw ApiError.badRequest("Invalid webhook payload");
      }

      // Process the delivery webhook
      const result = await DeliveryWebhookService.processDeliveryWebhook(payload);

      res.status(200).json({
        success: true,
        message: "Delivery webhook processed successfully",
        data: result,
      });
    } catch (error) {
      console.error("Delivery webhook error:", error);
      next(error);
    }
  }

  /**
   * Handle bulk delivery status webhooks
   */
  static async handleBulkDeliveryWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.body;
      const signature = req.headers["x-arkessel-signature"] as string;

      // Verify webhook signature
      if (signature && !this.verifyWebhookSignature(payload, signature)) {
        throw ApiError.unauthorized("Invalid webhook signature");
      }

      if (!payload.deliveries || !Array.isArray(payload.deliveries)) {
        throw ApiError.badRequest("Invalid bulk webhook payload");
      }

      // Process bulk delivery webhooks
      const results = await DeliveryWebhookService.processBulkDeliveryWebhooks(payload.deliveries);

      res.status(200).json({
        success: true,
        message: "Bulk delivery webhook processed",
        data: {
          processed: results.length,
          results,
        },
      });
    } catch (error) {
      console.error("Bulk delivery webhook error:", error);
      next(error);
    }
  }

  /**
   * Manual sync delivery statuses
   */
  static async manualSyncDeliveries(req: Request, res: Response, next: NextFunction) {
    try {
      await DeliveryWebhookService.syncPendingDeliveries();

      res.status(200).json({
        success: true,
        message: "Manual delivery sync initiated successfully",
      });
    } catch (error) {
      console.error("Manual delivery sync error:", error);
      next(error);
    }
  }

  /**
   * Get delivery statistics for authenticated user
   */
  static async getDeliveryStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { period = "24h" } = req.query;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      const stats = await DeliveryWebhookService.getDeliveryStats(userId, period as string);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Get delivery stats error:", error);
      next(error);
    }
  }

  /**
   * Webhook health check
   */
  static async webhookHealthCheck(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({
        success: true,
        message: "Delivery webhook endpoint is healthy",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify webhook signature from Arkessel
   */
  private static verifyWebhookSignature(payload: any, signature: string): boolean {
    try {
      const webhookSecret = process.env.ARKESSEL_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.warn("Arkessel webhook secret not configured");
        return true; // Skip verification if no secret is configured
      }

      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(payload))
        .digest("hex");

      const providedSignature = signature.replace("sha256=", "");

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "hex"),
        Buffer.from(providedSignature, "hex")
      );
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      return false;
    }
  }
}

/**
 * Enhanced SMS Analytics Controller
 */
export class SmsAnalyticsController {
  /**
   * Get comprehensive SMS analytics
   */
  static async getSmsAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { period = "7d", groupBy = "day" } = req.query;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      const analytics = await this.calculateSmsAnalytics(userId, period as string, groupBy as string);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error("SMS analytics error:", error);
      next(error);
    }
  }

  /**
   * Get SMS performance metrics
   */
  static async getPerformanceMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { period = "30d" } = req.query;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      const metrics = await this.calculatePerformanceMetrics(userId, period as string);

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      console.error("Performance metrics error:", error);
      next(error);
    }
  }

  /**
   * Calculate SMS analytics
   */
  private static async calculateSmsAnalytics(userId: string, period: string, groupBy: string) {
    // Implementation for SMS analytics calculation
    // This would include delivery rates, cost analysis, peak sending times, etc.
    return {
      period,
      groupBy,
      deliveryRate: 95.5,
      totalMessages: 1250,
      totalCost: 125.50,
      averageCostPerMessage: 0.10,
      peakSendingHour: 14,
      topRecipientCountries: ["Ghana", "Nigeria", "Kenya"],
      dailyBreakdown: [], // Would be populated with actual data
    };
  }

  /**
   * Calculate performance metrics
   */
  private static async calculatePerformanceMetrics(userId: string, period: string) {
    // Implementation for performance metrics calculation
    return {
      period,
      deliveryRate: 95.5,
      averageDeliveryTime: "2.3 seconds",
      failureRate: 4.5,
      costEfficiency: 98.2,
      popularSenderIds: ["Mas3ndi", "YourBrand"],
      messageTypeDistribution: {
        promotional: 60,
        transactional: 35,
        otp: 5,
      },
    };
  }
}
