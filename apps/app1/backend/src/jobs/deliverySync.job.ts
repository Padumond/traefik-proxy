import cron from "node-cron";
import { DeliveryWebhookService } from "../services/deliveryWebhook.service";
import { SmsCampaignService } from "../services/smsCampaign.service";
import { prisma } from "../server";

export class DeliverySyncJob {
  private static isRunning = false;

  /**
   * Start the delivery sync jobs
   */
  static start() {
    // Sync delivery statuses every 10 minutes
    cron.schedule("*/10 * * * *", async () => {
      if (this.isRunning) {
        console.log("Delivery sync job already running, skipping...");
        return;
      }

      console.log("Starting delivery sync job...");
      await this.syncPendingDeliveries();
      console.log("Delivery sync job completed");
    });

    // Process scheduled campaigns every minute
    cron.schedule("* * * * *", async () => {
      await this.processScheduledCampaigns();
    });

    // Clean up old delivery reports every day at 2 AM
    cron.schedule("0 2 * * *", async () => {
      await this.cleanupOldDeliveryReports();
    });

    console.log("Delivery sync jobs scheduled");
  }

  /**
   * Sync pending delivery statuses
   */
  static async syncPendingDeliveries() {
    try {
      this.isRunning = true;
      await DeliveryWebhookService.syncPendingDeliveries();
    } catch (error) {
      console.error("Error in syncPendingDeliveries:", error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process scheduled campaigns
   */
  static async processScheduledCampaigns() {
    try {
      const now = new Date();

      // Get campaigns scheduled to run now or in the past
      const scheduledCampaigns = await prisma.smsCampaign.findMany({
        where: {
          status: "SCHEDULED",
          scheduledAt: {
            lte: now,
          },
        },
        take: 5, // Process 5 campaigns at a time
      });

      console.log(
        `Found ${scheduledCampaigns.length} scheduled campaigns to process`
      );

      for (const campaign of scheduledCampaigns) {
        try {
          console.log(`Processing scheduled campaign: ${campaign.id}`);
          await SmsCampaignService.processCampaign(campaign.id);
        } catch (error) {
          console.error(`Failed to process campaign ${campaign.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Error processing scheduled campaigns:", error);
    }
  }

  /**
   * Clean up old delivery reports
   */
  static async cleanupOldDeliveryReports() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Delete delivery reports older than 30 days
      const deletedCount = await prisma.deliveryReport.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      console.log(`Cleaned up ${deletedCount.count} old delivery reports`);

      // Also clean up old user stats
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const deletedStatsCount = await prisma.userStats.deleteMany({
        where: {
          date: {
            lt: sixtyDaysAgo,
          },
        },
      });

      console.log(`Cleaned up ${deletedStatsCount.count} old user stats`);
    } catch (error) {
      console.error("Error cleaning up old data:", error);
    }
  }

  /**
   * Generate daily reports
   */
  static async generateDailyReports() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all users who sent messages yesterday
      const activeUsers = await prisma.smsLog.findMany({
        where: {
          sentAt: {
            gte: yesterday,
            lt: today,
          },
        },
        select: {
          userId: true,
        },
        distinct: ["userId"],
      });

      console.log(
        `Generating daily reports for ${activeUsers.length} active users`
      );

      for (const { userId } of activeUsers) {
        try {
          await this.generateUserDailyReport(userId, yesterday);
        } catch (error) {
          console.error(
            `Failed to generate daily report for user ${userId}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Error generating daily reports:", error);
    }
  }

  /**
   * Generate daily report for a specific user
   */
  private static async generateUserDailyReport(userId: string, date: Date) {
    try {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      // Get message statistics for the day
      const messageStats = await prisma.smsLog.groupBy({
        by: ["status"],
        where: {
          userId,
          sentAt: {
            gte: date,
            lt: nextDay,
          },
        },
        _count: {
          status: true,
        },
        _sum: {
          cost: true,
        },
      });

      // Calculate totals
      let totalMessages = 0;
      let totalCost = 0;
      let deliveredMessages = 0;
      let failedMessages = 0;

      messageStats.forEach((stat) => {
        totalMessages += stat._count.status;
        totalCost += stat._sum.cost || 0;

        if (stat.status === "DELIVERED") {
          deliveredMessages += stat._count.status;
        } else if (stat.status === "FAILED") {
          failedMessages += stat._count.status;
        }
      });

      // Create or update daily report
      await prisma.dailyReport.upsert({
        where: {
          userId_date: {
            userId,
            date,
          },
        },
        update: {
          totalMessages,
          deliveredMessages,
          failedMessages,
          totalCost,
          deliveryRate:
            totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 0,
        },
        create: {
          userId,
          date,
          totalMessages,
          deliveredMessages,
          failedMessages,
          totalCost,
          deliveryRate:
            totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 0,
        },
      });

      console.log(
        `Daily report generated for user ${userId} on ${
          date.toISOString().split("T")[0]
        }`
      );
    } catch (error) {
      console.error(`Error generating daily report for user ${userId}:`, error);
    }
  }

  /**
   * Get delivery sync statistics
   */
  static async getSyncStats() {
    try {
      const pendingMessages = await prisma.smsLog.count({
        where: {
          status: {
            in: ["PENDING", "SENT"],
          },
          providerRef: {
            not: null,
          },
        },
      });

      const recentDeliveries = await prisma.smsLog.count({
        where: {
          status: "DELIVERED",
          sentAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      const failedMessages = await prisma.smsLog.count({
        where: {
          status: "FAILED",
          sentAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      return {
        pendingMessages,
        recentDeliveries,
        failedMessages,
        lastSyncAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error getting sync stats:", error);
      throw error;
    }
  }
}
