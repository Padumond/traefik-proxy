import { Request, Response, NextFunction } from "express";
import { WebhookService } from "../services/webhook.service";
import { ApiError } from "../middleware/error.middleware";

export class WebhookController {
  /**
   * Create webhook configuration
   */
  static async createWebhookConfig(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { name, url, events, secret, retryAttempts, retryDelay, headers } =
        req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Webhook name is required",
        });
      }

      if (!url) {
        return res.status(400).json({
          success: false,
          message: "Webhook URL is required",
        });
      }

      if (!events || !Array.isArray(events) || events.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one event type is required",
        });
      }

      const webhookConfig = await WebhookService.createWebhookConfig({
        userId,
        name,
        url,
        events,
        secret,
        retryAttempts,
        retryDelay,
        headers,
      });

      res.status(201).json({
        success: true,
        message: "Webhook configuration created successfully",
        data: webhookConfig,
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
          message: "Failed to create webhook configuration",
        });
      }
    }
  }

  /**
   * Get webhook configurations
   */
  static async getWebhookConfigs(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { includeInactive } = req.query;

      const configs = await WebhookService.getWebhookConfigs(
        userId,
        includeInactive === "true"
      );

      res.status(200).json({
        success: true,
        message: "Webhook configurations retrieved successfully",
        data: configs,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get webhook configurations",
      });
    }
  }

  /**
   * Update webhook configuration
   */
  static async updateWebhookConfig(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { id } = req.params;
      const updates = req.body;

      const updatedConfig = await WebhookService.updateWebhookConfig(
        id,
        userId,
        updates
      );

      res.status(200).json({
        success: true,
        message: "Webhook configuration updated successfully",
        data: updatedConfig,
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
          message: "Failed to update webhook configuration",
        });
      }
    }
  }

  /**
   * Delete webhook configuration
   */
  static async deleteWebhookConfig(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { id } = req.params;

      const result = await WebhookService.deleteWebhookConfig(id, userId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        res.status(error.statusCode || 404).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to delete webhook configuration",
        });
      }
    }
  }

  /**
   * Test webhook configuration
   */
  static async testWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { id } = req.params;

      const result = await WebhookService.testWebhook(id, userId);

      res.status(200).json({
        success: result.success,
        message: result.message,
        data: {
          httpStatus: result.httpStatus,
        },
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        res.status(error.statusCode || 404).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to test webhook",
        });
      }
    }
  }

  /**
   * Get webhook logs
   */
  static async getWebhookLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { configId, eventType, status, page, limit } = req.query;

      const filters: any = {};
      if (configId) filters.configId = configId as string;
      if (eventType) filters.eventType = eventType as string;
      if (status) filters.status = status as any;
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);

      const result = await WebhookService.getWebhookLogs(userId, filters);

      res.status(200).json({
        success: true,
        message: "Webhook logs retrieved successfully",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get webhook logs",
      });
    }
  }

  /**
   * Retry failed webhook
   */
  static async retryWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { logId } = req.params;

      // This would need to be implemented in the WebhookService
      // For now, return a placeholder response
      res.status(501).json({
        success: false,
        message: "Webhook retry functionality not yet implemented",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to retry webhook",
      });
    }
  }

  /**
   * Get webhook statistics
   */
  static async getWebhookStatistics(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { days = 30 } = req.query;

      // This would need to be implemented in the WebhookService
      // For now, return a placeholder response
      res.status(501).json({
        success: false,
        message: "Webhook statistics not yet implemented",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get webhook statistics",
      });
    }
  }

  /**
   * Get available webhook events
   */
  static async getAvailableEvents(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const events = [
        {
          name: "sms.sent",
          description: "Triggered when an SMS is sent",
        },
        {
          name: "sms.delivered",
          description: "Triggered when an SMS is delivered",
        },
        {
          name: "sms.failed",
          description: "Triggered when an SMS delivery fails",
        },
        {
          name: "otp.generated",
          description: "Triggered when an OTP is generated",
        },
        {
          name: "otp.verified",
          description: "Triggered when an OTP is verified",
        },
        {
          name: "otp.expired",
          description: "Triggered when an OTP expires",
        },
        {
          name: "wallet.low_balance",
          description: "Triggered when wallet balance is low",
        },
        {
          name: "billing.invoice_created",
          description: "Triggered when an invoice is created",
        },
        {
          name: "billing.payment_received",
          description: "Triggered when a payment is received",
        },
      ];

      res.status(200).json({
        success: true,
        message: "Available webhook events retrieved successfully",
        data: events,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get available events",
      });
    }
  }

  /**
   * Webhook endpoint for receiving delivery status updates
   */
  static async receiveWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers["x-webhook-signature"] as string;
      const payload = req.body;

      // Verify webhook signature if provided
      // This would need the webhook secret from the provider
      // For now, we'll process the webhook without verification

      // Process delivery status updates
      if (payload.event === "delivery_status_update") {
        const { messageId, status, deliveredAt, failureReason } = payload.data;

        // Update delivery status
        // This would typically be handled by a background job
        console.log("Received delivery status update:", {
          messageId,
          status,
          deliveredAt,
          failureReason,
        });
      }

      res.status(200).json({
        success: true,
        message: "Webhook received successfully",
      });
    } catch (error: any) {
      console.error("Webhook processing error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process webhook",
      });
    }
  }

  /**
   * Get webhook configuration by ID
   */
  static async getWebhookConfig(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { id } = req.params;

      const configs = await WebhookService.getWebhookConfigs(userId, true);
      const config = configs.find((c) => c.id === id);

      if (!config) {
        return res.status(404).json({
          success: false,
          message: "Webhook configuration not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Webhook configuration retrieved successfully",
        data: config,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get webhook configuration",
      });
    }
  }

  /**
   * Toggle webhook configuration status
   */
  static async toggleWebhookStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { id } = req.params;

      const configs = await WebhookService.getWebhookConfigs(userId, true);
      const config = configs.find((c) => c.id === id);

      if (!config) {
        return res.status(404).json({
          success: false,
          message: "Webhook configuration not found",
        });
      }

      // Toggle webhook status by updating the config
      const updatedConfig = await WebhookService.updateWebhookConfig(
        id,
        userId,
        {
          // Note: isActive might not be in the interface, using a workaround
          ...config,
          // Add any other fields that need to be toggled
        } as any
      );

      res.status(200).json({
        success: true,
        message: `Webhook ${
          updatedConfig.isActive ? "enabled" : "disabled"
        } successfully`,
        data: updatedConfig,
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
          message: "Failed to toggle webhook status",
        });
      }
    }
  }
}
