import { PrismaClient, WebhookStatus } from "@prisma/client";
import { ApiError } from "../middleware/error.middleware";
import axios from "axios";
import crypto from "crypto";

const prisma = new PrismaClient();

interface CreateWebhookConfigParams {
  userId: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  retryAttempts?: number;
  retryDelay?: number;
  headers?: any;
}

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
  signature?: string;
}

export class WebhookService {
  /**
   * Create webhook configuration
   */
  static async createWebhookConfig(params: CreateWebhookConfigParams) {
    try {
      const {
        userId,
        name,
        url,
        events,
        secret,
        retryAttempts = 3,
        retryDelay = 60,
        headers,
      } = params;

      // Validate URL
      try {
        new URL(url);
      } catch {
        throw ApiError.badRequest("Invalid webhook URL");
      }

      // Check for duplicate name
      const existingConfig = await prisma.webhookConfig.findFirst({
        where: { userId, name },
      });

      if (existingConfig) {
        throw ApiError.conflict(
          "Webhook configuration with this name already exists"
        );
      }

      const webhookConfig = await prisma.webhookConfig.create({
        data: {
          userId,
          name,
          url,
          events,
          secret: secret || this.generateSecret(),
          retryAttempts,
          retryDelay,
          headers,
        },
      });

      return webhookConfig;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Create Webhook Config Error:", error);
      throw ApiError.internal("Failed to create webhook configuration");
    }
  }

  /**
   * Get webhook configurations for user
   */
  static async getWebhookConfigs(userId: string, includeInactive = false) {
    try {
      const where: any = { userId };
      if (!includeInactive) {
        where.isActive = true;
      }

      const configs = await prisma.webhookConfig.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      return configs;
    } catch (error) {
      console.error("Get Webhook Configs Error:", error);
      throw ApiError.internal("Failed to get webhook configurations");
    }
  }

  /**
   * Update webhook configuration
   */
  static async updateWebhookConfig(
    configId: string,
    userId: string,
    updates: Partial<CreateWebhookConfigParams>
  ) {
    try {
      const existingConfig = await prisma.webhookConfig.findFirst({
        where: { id: configId, userId },
      });

      if (!existingConfig) {
        throw ApiError.notFound("Webhook configuration not found");
      }

      // Validate URL if provided
      if (updates.url) {
        try {
          new URL(updates.url);
        } catch {
          throw ApiError.badRequest("Invalid webhook URL");
        }
      }

      // Check for duplicate name if name is being updated
      if (updates.name && updates.name !== existingConfig.name) {
        const duplicateName = await prisma.webhookConfig.findFirst({
          where: {
            userId,
            name: updates.name,
            id: { not: configId },
          },
        });

        if (duplicateName) {
          throw ApiError.conflict(
            "Webhook configuration with this name already exists"
          );
        }
      }

      const updatedConfig = await prisma.webhookConfig.update({
        where: { id: configId },
        data: updates,
      });

      return updatedConfig;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Update Webhook Config Error:", error);
      throw ApiError.internal("Failed to update webhook configuration");
    }
  }

  /**
   * Delete webhook configuration
   */
  static async deleteWebhookConfig(configId: string, userId: string) {
    try {
      const config = await prisma.webhookConfig.findFirst({
        where: { id: configId, userId },
      });

      if (!config) {
        throw ApiError.notFound("Webhook configuration not found");
      }

      await prisma.webhookConfig.delete({
        where: { id: configId },
      });

      return {
        success: true,
        message: "Webhook configuration deleted successfully",
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Delete Webhook Config Error:", error);
      throw ApiError.internal("Failed to delete webhook configuration");
    }
  }

  /**
   * Send webhook notification
   */
  static async sendWebhook(userId: string, eventType: string, data: any) {
    try {
      // Get active webhook configurations for this user and event
      const webhookConfigs = await prisma.webhookConfig.findMany({
        where: {
          userId,
          isActive: true,
          events: {
            has: eventType,
          },
        },
      });

      if (webhookConfigs.length === 0) {
        return { sent: 0, message: "No active webhooks for this event" };
      }

      const results = [];

      for (const config of webhookConfigs) {
        try {
          const payload: WebhookPayload = {
            event: eventType,
            timestamp: new Date().toISOString(),
            data,
          };

          // Generate signature if secret is provided
          if (config.secret) {
            payload.signature = this.generateSignature(payload, config.secret);
          }

          // Create webhook log entry
          const webhookLog = await prisma.webhookLog.create({
            data: {
              webhookConfigId: config.id,
              eventType,
              payload: payload as any,
              status: "PENDING",
            },
          });

          // Send webhook
          const result = await this.deliverWebhook(
            config,
            payload,
            webhookLog.id
          );
          results.push(result);
        } catch (error) {
          console.error(
            `Webhook delivery error for config ${config.id}:`,
            error
          );
          results.push({
            configId: config.id,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return {
        sent: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      };
    } catch (error) {
      console.error("Send Webhook Error:", error);
      throw ApiError.internal("Failed to send webhook");
    }
  }

  /**
   * Deliver webhook with retry logic
   */
  private static async deliverWebhook(
    config: any,
    payload: WebhookPayload,
    logId: string
  ) {
    try {
      const headers: any = {
        "Content-Type": "application/json",
        "User-Agent": "Mas3ndi-Webhook/1.0",
      };

      // Add custom headers
      if (config.headers) {
        Object.assign(headers, config.headers);
      }

      // Add signature header
      if (payload.signature) {
        headers["X-Mas3ndi-Signature"] = payload.signature;
      }

      const response = await axios.post(config.url, payload, {
        headers,
        timeout: 30000, // 30 seconds timeout
        validateStatus: (status) => status < 500, // Retry on 5xx errors
      });

      // Update webhook log with success
      await prisma.webhookLog.update({
        where: { id: logId },
        data: {
          status: "DELIVERED",
          httpStatus: response.status,
          response: JSON.stringify(response.data).substring(0, 1000), // Limit response size
          attempts: 1,
          deliveredAt: new Date(),
        },
      });

      return {
        configId: config.id,
        success: true,
        httpStatus: response.status,
      };
    } catch (error: any) {
      const httpStatus = error.response?.status;
      const shouldRetry = !httpStatus || httpStatus >= 500;

      if (shouldRetry) {
        // Schedule retry
        await this.scheduleWebhookRetry(logId, config, payload, 1);
      } else {
        // Mark as failed
        await prisma.webhookLog.update({
          where: { id: logId },
          data: {
            status: "FAILED",
            httpStatus,
            response: error.message,
            attempts: 1,
            lastAttemptAt: new Date(),
          },
        });
      }

      return {
        configId: config.id,
        success: false,
        httpStatus,
        error: error.message,
      };
    }
  }

  /**
   * Schedule webhook retry
   */
  private static async scheduleWebhookRetry(
    logId: string,
    config: any,
    payload: WebhookPayload,
    attempt: number
  ) {
    try {
      if (attempt > config.retryAttempts) {
        // Max retries reached, mark as failed
        await prisma.webhookLog.update({
          where: { id: logId },
          data: {
            status: "FAILED",
            attempts: attempt,
            lastAttemptAt: new Date(),
          },
        });
        return;
      }

      const nextRetryAt = new Date();
      nextRetryAt.setSeconds(
        nextRetryAt.getSeconds() + config.retryDelay * attempt
      );

      await prisma.webhookLog.update({
        where: { id: logId },
        data: {
          status: "RETRYING",
          attempts: attempt,
          lastAttemptAt: new Date(),
          nextRetryAt,
        },
      });

      // TODO: Implement actual retry scheduling with a job queue
      // For now, we'll just log the retry schedule
      console.log(
        `Webhook retry scheduled for ${nextRetryAt} (attempt ${attempt})`
      );
    } catch (error) {
      console.error("Schedule Webhook Retry Error:", error);
    }
  }

  /**
   * Process webhook retries
   */
  static async processWebhookRetries() {
    try {
      const now = new Date();
      const retryLogs = await prisma.webhookLog.findMany({
        where: {
          status: "RETRYING",
          nextRetryAt: { lte: now },
        },
        include: {
          webhookConfig: true,
        },
      });

      for (const log of retryLogs) {
        try {
          await this.deliverWebhook(
            log.webhookConfig,
            log.payload as unknown as WebhookPayload,
            log.id
          );
        } catch (error) {
          console.error(
            `Retry webhook delivery error for log ${log.id}:`,
            error
          );
        }
      }

      return { processed: retryLogs.length };
    } catch (error) {
      console.error("Process Webhook Retries Error:", error);
      throw ApiError.internal("Failed to process webhook retries");
    }
  }

  /**
   * Get webhook logs
   */
  static async getWebhookLogs(
    userId: string,
    filters: {
      configId?: string;
      eventType?: string;
      status?: WebhookStatus;
      page?: number;
      limit?: number;
    } = {}
  ) {
    try {
      const { configId, eventType, status, page = 1, limit = 20 } = filters;
      const skip = (page - 1) * limit;

      const where: any = {
        webhookConfig: { userId },
      };

      if (configId) where.webhookConfigId = configId;
      if (eventType) where.eventType = eventType;
      if (status) where.status = status;

      const [logs, total] = await Promise.all([
        prisma.webhookLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            webhookConfig: {
              select: {
                name: true,
                url: true,
              },
            },
          },
        }),
        prisma.webhookLog.count({ where }),
      ]);

      return {
        data: logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Get Webhook Logs Error:", error);
      throw ApiError.internal("Failed to get webhook logs");
    }
  }

  /**
   * Test webhook configuration
   */
  static async testWebhook(configId: string, userId: string) {
    try {
      const config = await prisma.webhookConfig.findFirst({
        where: { id: configId, userId },
      });

      if (!config) {
        throw ApiError.notFound("Webhook configuration not found");
      }

      const testPayload: WebhookPayload = {
        event: "webhook.test",
        timestamp: new Date().toISOString(),
        data: {
          message: "This is a test webhook from Mas3ndi",
          configId: config.id,
          configName: config.name,
        },
      };

      // Generate signature if secret is provided
      if (config.secret) {
        testPayload.signature = this.generateSignature(
          testPayload,
          config.secret
        );
      }

      const webhookLog = await prisma.webhookLog.create({
        data: {
          webhookConfigId: config.id,
          eventType: "webhook.test",
          payload: testPayload as any,
          status: "PENDING",
        },
      });

      const result = await this.deliverWebhook(
        config,
        testPayload as WebhookPayload,
        webhookLog.id
      );

      return {
        success: result.success,
        httpStatus: result.httpStatus,
        message: result.success
          ? "Webhook test successful"
          : "Webhook test failed",
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Test Webhook Error:", error);
      throw ApiError.internal("Failed to test webhook");
    }
  }

  /**
   * Generate webhook secret
   */
  private static generateSecret(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Generate webhook signature
   */
  private static generateSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac("sha256", secret)
      .update(payloadString)
      .digest("hex");
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    try {
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      return false;
    }
  }
}
