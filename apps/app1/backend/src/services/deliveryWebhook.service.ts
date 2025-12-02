import { prisma } from "../server";
import { ArkeselService } from "./arkessel.service";

interface ArkeselDeliveryWebhookPayload {
  message_id: string;
  status: "delivered" | "failed" | "pending" | "sent";
  recipient: string;
  sender: string;
  message: string;
  delivery_time?: string;
  failure_reason?: string;
  cost?: number;
  timestamp: string;
}

export class DeliveryWebhookService {
  /**
   * Process delivery status webhook from Arkessel
   */
  static async processDeliveryWebhook(payload: ArkeselDeliveryWebhookPayload) {
    try {
      console.log("Processing delivery webhook:", payload);

      // Find the message in our database
      const message = await prisma.smsLog.findFirst({
        where: {
          providerRef: payload.message_id,
        },
        include: {
          user: true,
        },
      });

      if (!message) {
        console.warn(
          `Message not found for Arkessel ID: ${payload.message_id}`
        );
        return { success: false, message: "Message not found" };
      }

      // Map Arkessel status to our status
      const mappedStatus = this.mapArkeselStatus(payload.status);

      // Update message status
      const updatedMessage = await prisma.smsLog.update({
        where: { id: message.id },
        data: {
          status: mappedStatus,
          updatedAt: new Date(),
        },
      });

      // Create delivery report entry
      await this.createDeliveryReport({
        messageId: message.id,
        userId: message.userId,
        status: mappedStatus,
        deliveryTime: payload.delivery_time,
        failureReason: payload.failure_reason,
        cost: payload.cost,
        arkeselData: payload,
      });

      // Update user statistics
      await this.updateUserStats(message.userId, mappedStatus, payload.cost);

      console.log(`Message ${message.id} status updated to ${mappedStatus}`);

      return { success: true, message: "Delivery status updated" };
    } catch (error) {
      console.error("Error processing delivery webhook:", error);
      throw error;
    }
  }

  /**
   * Map Arkessel delivery status to our internal status
   */
  private static mapArkeselStatus(
    arkeselStatus: string
  ): "PENDING" | "SENT" | "DELIVERED" | "FAILED" {
    switch (arkeselStatus.toLowerCase()) {
      case "delivered":
        return "DELIVERED";
      case "failed":
        return "FAILED";
      case "sent":
        return "SENT";
      case "pending":
      default:
        return "PENDING";
    }
  }

  /**
   * Create delivery report entry
   */
  private static async createDeliveryReport({
    messageId,
    userId,
    status,
    deliveryTime,
    failureReason,
    cost,
    arkeselData,
  }: {
    messageId: string;
    userId: string;
    status: "PENDING" | "SENT" | "DELIVERED" | "FAILED";
    deliveryTime?: string;
    failureReason?: string;
    cost?: number;
    arkeselData: any;
  }) {
    try {
      // Map our status to DeliveryStatus enum
      const deliveryStatus = status as any; // We'll need to check the actual enum values

      await prisma.deliveryReport.create({
        data: {
          smsLogId: messageId,
          userId,
          messageId: `arkessel_${messageId}`,
          status: deliveryStatus,
          deliveredAt: deliveryTime ? new Date(deliveryTime) : null,
          failureReason,
          cost: cost || 0,
          metadata: arkeselData,
        },
      });
    } catch (error) {
      console.error("Error creating delivery report:", error);
    }
  }

  /**
   * Update user statistics based on delivery status
   */
  private static async updateUserStats(
    userId: string,
    status: string,
    cost?: number
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) return;

      // Update wallet balance if message was delivered and cost is provided
      if (status === "DELIVERED" && cost && cost > 0) {
        // Update user wallet balance
        await prisma.user.update({
          where: { id: userId },
          data: {
            walletBalance: {
              decrement: cost,
            },
          },
        });

        // Create transaction record
        await prisma.walletTransaction.create({
          data: {
            userId,
            type: "DEBIT",
            amount: cost,
            description: "SMS delivery charge",
            status: "COMPLETED",
            reference: `sms_delivery_${Date.now()}`,
          },
        });
      }

      // Update user message statistics
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingStats = await prisma.userStats.findFirst({
        where: {
          userId,
          date: today,
        },
      });

      if (existingStats) {
        await prisma.userStats.update({
          where: { id: existingStats.id },
          data: {
            ...(status === "DELIVERED" && {
              messagesDelivered: { increment: 1 },
            }),
            ...(status === "FAILED" && { messagesFailed: { increment: 1 } }),
            totalSpent: { increment: cost || 0 },
          },
        });
      } else {
        await prisma.userStats.create({
          data: {
            userId,
            date: today,
            messagesDelivered: status === "DELIVERED" ? 1 : 0,
            messagesFailed: status === "FAILED" ? 1 : 0,
            totalSpent: cost || 0,
          },
        });
      }
    } catch (error) {
      console.error("Error updating user stats:", error);
    }
  }

  /**
   * Bulk process delivery webhooks
   */
  static async processBulkDeliveryWebhooks(
    payloads: ArkeselDeliveryWebhookPayload[]
  ) {
    const results = [];

    for (const payload of payloads) {
      try {
        const result = await this.processDeliveryWebhook(payload);
        results.push({
          messageId: payload.message_id,
          status: "processed",
          result,
        });
      } catch (error) {
        console.error(
          `Failed to process webhook for message ${payload.message_id}:`,
          error
        );
        results.push({
          messageId: payload.message_id,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  /**
   * Sync delivery statuses for pending messages
   */
  static async syncPendingDeliveries() {
    try {
      // Get messages that are still pending or sent but not delivered
      const pendingMessages = await prisma.smsLog.findMany({
        where: {
          status: {
            in: ["PENDING", "SENT"],
          },
          providerRef: {
            not: null,
          },
          sentAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        take: 50, // Process 50 at a time
      });

      console.log(
        `Syncing delivery status for ${pendingMessages.length} pending messages`
      );

      for (const message of pendingMessages) {
        try {
          if (message.providerRef) {
            const deliveryStatus = await ArkeselService.getDeliveryStatus(
              message.providerRef
            );

            if (deliveryStatus.status === "success" && deliveryStatus.data) {
              await this.processDeliveryWebhook({
                message_id: message.providerRef,
                status: "delivered" as any, // Simplified for now
                recipient: message.recipients[0] || "unknown",
                sender: "Mas3ndi", // Simplified for now
                message: message.message,
                delivery_time: new Date().toISOString(),
                failure_reason: undefined,
                cost: message.cost,
                timestamp: new Date().toISOString(),
              });
            }
          }

          // Add delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(
            `Failed to sync delivery status for message ${message.id}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Error syncing pending deliveries:", error);
    }
  }

  /**
   * Get delivery statistics for a user
   */
  static async getDeliveryStats(userId: string, period: string = "24h") {
    try {
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

      const stats = await prisma.smsLog.groupBy({
        by: ["status"],
        where: {
          userId,
          sentAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          status: true,
        },
        _sum: {
          cost: true,
        },
      });

      return {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        stats: stats.reduce((acc, stat) => {
          acc[stat.status] = {
            count: stat._count.status,
            totalCost: stat._sum.cost || 0,
          };
          return acc;
        }, {} as Record<string, { count: number; totalCost: number }>),
      };
    } catch (error) {
      console.error("Error getting delivery stats:", error);
      throw error;
    }
  }
}
