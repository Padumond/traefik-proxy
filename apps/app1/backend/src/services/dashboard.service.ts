import { prisma } from "../server";
import { WalletService } from "./wallet.service";
import { MessageStatus, TransactionType, SenderIdStatus } from "@prisma/client";

export interface DashboardStats {
  messagesCount: {
    today: number;
    week: number;
    month: number;
    total: number;
  };
  walletBalance: {
    balance: number;
    amountSpent: number;
    lastTopup: string | null;
    lastTopupAmount: number | null;
  };
  senderIds: {
    active: number;
    pending: number;
    rejected: number;
  };
  smsCredits: {
    available: number;
    used: number;
    total: number;
  };
  apiUsage: {
    requests: number;
    failures: number;
  };
  analytics: {
    deliveryStatus: {
      delivered: number;
      failed: number;
      pending: number;
    };
    messageVolume: {
      daily: {
        labels: string[];
        values: number[];
      };
      weekly: {
        labels: string[];
        values: number[];
      };
      monthly: {
        labels: string[];
        values: number[];
      };
    };
    monthlyDelivery: Array<{
      month: string;
      deliveryRate: number;
      messageCount: number;
    }>;
    averageSuccessRate: {
      overall: number;
      last30Days: number;
      last7Days: number;
      trend: number; // Percentage change from previous period
    };
  };
}

export interface RecentMessage {
  id: string;
  recipients: number;
  message: string;
  senderId: string;
  date: string;
  status: string;
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  credits: number;
  date: string;
  description: string | null;
}

export class DashboardService {
  /**
   * Get all dashboard data including stats, recent messages, and recent transactions
   */
  static async getDashboardData(userId: string) {
    const stats = await DashboardService.getDashboardStats(userId);
    const recentMessages = await DashboardService.getRecentMessages(userId, 5);
    const recentTransactions = await DashboardService.getRecentTransactions(
      userId,
      5
    );

    return {
      stats,
      recentMessages,
      recentTransactions,
    };
  }

  /**
   * Get only dashboard stats
   */
  static async getDashboardStats(userId: string): Promise<DashboardStats> {
    try {
      // Get current date values for filtering
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);

      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      monthAgo.setHours(0, 0, 0, 0);

      // Get user data
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Get message counts (with fallback to 0 if table doesn't exist)
      let todayCount = 0,
        weekCount = 0,
        monthCount = 0,
        totalCount = 0;

      try {
        [todayCount, weekCount, monthCount, totalCount] = await Promise.all([
          // Today's messages
          prisma.smsLog.count({
            where: {
              userId,
              sentAt: { gte: today },
            },
          }),
          // Week's messages
          prisma.smsLog.count({
            where: {
              userId,
              sentAt: { gte: weekAgo },
            },
          }),
          // Month's messages
          prisma.smsLog.count({
            where: {
              userId,
              sentAt: { gte: monthAgo },
            },
          }),
          // Total messages
          prisma.smsLog.count({
            where: { userId },
          }),
        ]);
      } catch (error) {
        console.warn("SMS logs not available, using default values");
        // If SMS logs table doesn't exist, use default values
      }

      // Get sender ID counts (with fallback)
      let activeSenderIds = 0,
        pendingSenderIds = 0,
        rejectedSenderIds = 0;
      try {
        [activeSenderIds, pendingSenderIds, rejectedSenderIds] =
          await Promise.all([
            prisma.senderID.count({
              where: {
                userId,
                status: SenderIdStatus.APPROVED,
              },
            }),
            prisma.senderID.count({
              where: {
                userId,
                status: SenderIdStatus.PENDING,
              },
            }),
            prisma.senderID.count({
              where: {
                userId,
                status: SenderIdStatus.REJECTED,
              },
            }),
          ]);
      } catch (error) {
        console.warn("Sender ID table not available, using default values");
      }

      // Get API usage stats (with fallback)
      let apiRequests = 0,
        apiFailures = 0;
      try {
        [apiRequests, apiFailures] = await Promise.all([
          prisma.smsLog.count({
            where: { userId },
          }),
          prisma.smsLog.count({
            where: {
              userId,
              status: MessageStatus.FAILED,
            },
          }),
        ]);
      } catch (error) {
        console.warn("API usage stats not available, using default values");
      }

      // Get wallet information (with fallback)
      let walletBalance = user.walletBalance || 0;
      let lastTopupAmount = 0;
      let lastTopupDate = null;
      let amountSpentTotal = 0;

      try {
        // Get last credit transaction
        const lastTopup = await prisma.walletTransaction.findFirst({
          where: {
            userId,
            type: TransactionType.CREDIT,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        // Calculate amount spent from wallet (sum of debits)
        const amountSpent = await prisma.walletTransaction.aggregate({
          where: {
            userId,
            type: TransactionType.DEBIT,
          },
          _sum: {
            amount: true,
          },
        });

        lastTopupAmount = lastTopup?.amount || 0;
        lastTopupDate = lastTopup?.createdAt?.toISOString() || null;
        amountSpentTotal = amountSpent._sum?.amount || 0;
      } catch (error) {
        console.warn("Wallet transactions not available, using default values");
      }

      // Calculate analytics data (with fallback)
      let analytics;
      try {
        analytics = await DashboardService.getAnalyticsData(userId);
      } catch (error) {
        console.warn("Analytics data not available, using default values");
        analytics = {
          deliveryStatus: { delivered: 0, failed: 0, pending: 0 },
          messageVolume: {
            daily: { labels: [], values: [] },
            weekly: { labels: [], values: [] },
            monthly: { labels: [], values: [] },
          },
          monthlyDelivery: [],
          averageSuccessRate: {
            overall: 0,
            last30Days: 0,
            last7Days: 0,
            trend: 0,
          },
        };
      }

      return {
        messagesCount: {
          today: todayCount,
          week: weekCount,
          month: monthCount,
          total: totalCount,
        },
        walletBalance: {
          balance: walletBalance,
          amountSpent: amountSpentTotal,
          lastTopup: lastTopupDate,
          lastTopupAmount: lastTopupAmount,
        },
        senderIds: {
          active: activeSenderIds,
          pending: pendingSenderIds,
          rejected: rejectedSenderIds,
        },
        smsCredits: await this.getSmsCreditsStats(userId),
        apiUsage: {
          requests: apiRequests,
          failures: apiFailures,
        },
        analytics,
      };
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      // Return default values if everything fails
      return {
        messagesCount: { today: 0, week: 0, month: 0, total: 0 },
        walletBalance: {
          balance: 0,
          amountSpent: 0,
          lastTopup: null,
          lastTopupAmount: null,
        },
        senderIds: { active: 0, pending: 0, rejected: 0 },
        smsCredits: { available: 0, used: 0, total: 0 },
        apiUsage: { requests: 0, failures: 0 },
        analytics: {
          deliveryStatus: { delivered: 0, failed: 0, pending: 0 },
          messageVolume: {
            daily: { labels: [], values: [] },
            weekly: { labels: [], values: [] },
            monthly: { labels: [], values: [] },
          },
          monthlyDelivery: [],
          averageSuccessRate: {
            overall: 0,
            last30Days: 0,
            last7Days: 0,
            trend: 0,
          },
        },
      };
    }
  }

  /**
   * Get recent messages
   */
  static async getRecentMessages(
    userId: string,
    limit: number = 5
  ): Promise<RecentMessage[]> {
    try {
      const messages = await prisma.smsLog.findMany({
        where: { userId },
        orderBy: {
          sentAt: "desc",
        },
        take: limit,
        include: {
          senderId: true,
        },
      });

      return messages.map((message) => ({
        id: message.id,
        recipients: message.recipients.length,
        message: message.message,
        senderId: message.senderId?.senderId || "Unknown",
        date: message.sentAt.toISOString(),
        status: message.status.toLowerCase(),
      }));
    } catch (error) {
      console.warn("Recent messages not available, returning empty array");
      return [];
    }
  }

  /**
   * Get SMS credits statistics for the user
   */
  private static async getSmsCreditsStats(userId: string) {
    try {
      // Get user's current SMS credits from the database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { smsCredits: true },
      });

      if (!user) {
        return {
          available: 0,
          used: 0,
          total: 0,
        };
      }

      // Calculate total credits purchased from credit transactions with SMS credits metadata
      const creditTransactions = await prisma.creditTransaction.findMany({
        where: {
          userId,
          type: "PURCHASE",
        },
      });

      let totalPurchased = 0;
      for (const transaction of creditTransactions) {
        totalPurchased += transaction.amount;
      }

      // Calculate used credits (total purchased - current available)
      const availableCredits = user.smsCredits;
      const usedCredits = Math.max(0, totalPurchased - availableCredits);

      return {
        available: availableCredits,
        used: usedCredits,
        total: totalPurchased,
      };
    } catch (error) {
      console.warn("SMS credits stats not available, returning default values");
      return {
        available: 0,
        used: 0,
        total: 0,
      };
    }
  }

  /**
   * Get recent transactions
   */
  static async getRecentTransactions(
    userId: string,
    limit: number = 5
  ): Promise<Transaction[]> {
    try {
      const transactions = await prisma.walletTransaction.findMany({
        where: { userId },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
      });

      return transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type.toLowerCase(),
        amount: transaction.amount,
        credits: this.calculateCreditsFromTransaction(transaction),
        date: transaction.createdAt.toISOString(),
        description: transaction.description,
      }));
    } catch (error) {
      console.warn("Recent transactions not available, returning empty array");
      return [];
    }
  }

  /**
   * Calculate SMS credits from transaction amount based on package pricing
   * Only for SMS-related transactions, not wallet top-ups
   */
  private static calculateCreditsFromTransaction(transaction: any): number {
    const amount = transaction.amount;
    const type = transaction.type;
    const description = transaction.description || "";

    // Check if this is a wallet top-up transaction
    const isWalletTopup =
      description.toLowerCase().includes("wallet topup") ||
      description.toLowerCase().includes("topup") ||
      description.toLowerCase().includes("paystack");

    // For wallet top-ups, don't show credits - they're just monetary transactions
    if (isWalletTopup) {
      return 0;
    }

    // Package pricing structure (amount -> credits) - only for SMS package purchases
    const packagePricing = [
      { price: 20, credits: 364 },
      { price: 50, credits: 926 },
      { price: 100, credits: 1887 },
      { price: 200, credits: 3846 },
      { price: 500, credits: 9804 },
      { price: 1000, credits: 20000 },
      { price: 1500, credits: 30612 },
      { price: 2000, credits: 41667 },
    ];

    if (type === "CREDIT") {
      // For SMS package purchases, find matching package or calculate based on best rate
      const exactMatch = packagePricing.find((pkg) => pkg.price === amount);
      if (exactMatch) {
        return exactMatch.credits;
      }

      // If no exact match, calculate based on best rate (GH₵0.048 per SMS)
      return Math.floor(amount / 0.048);
    } else if (type === "DEBIT") {
      // For debit transactions (SMS sending), calculate SMS count based on average rate
      return Math.floor(amount / 0.052); // Average SMS cost
    }

    return 0;
  }

  /**
   * Get analytics data for charts
   */
  static async getAnalyticsData(userId: string) {
    // Get delivery status counts
    const [deliveredCount, failedCount, pendingCount] = await Promise.all([
      prisma.smsLog.count({
        where: {
          userId,
          status: MessageStatus.DELIVERED,
        },
      }),
      prisma.smsLog.count({
        where: {
          userId,
          status: MessageStatus.FAILED,
        },
      }),
      prisma.smsLog.count({
        where: {
          userId,
          status: MessageStatus.PENDING,
        },
      }),
    ]);

    // Get message volume for the last 7 days (daily data)
    const dailyData = await this.getMessageVolumeData(userId, "daily");

    // Get weekly data for the last 4 weeks
    const weeklyData = await this.getMessageVolumeData(userId, "weekly");

    // Get monthly data for the last 6 months
    const monthlyData = await this.getMessageVolumeData(userId, "monthly");

    // Get average success rate data
    const averageSuccessRate = await this.getAverageSuccessRate(userId);

    // Get monthly delivery data for the last 6 months
    const monthlyDelivery = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      date.setDate(1);
      date.setHours(0, 0, 0, 0);

      const nextMonth = new Date(date);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const [totalMessages, deliveredMessages] = await Promise.all([
        prisma.smsLog.count({
          where: {
            userId,
            sentAt: {
              gte: date,
              lt: nextMonth,
            },
          },
        }),
        prisma.smsLog.count({
          where: {
            userId,
            status: MessageStatus.DELIVERED,
            sentAt: {
              gte: date,
              lt: nextMonth,
            },
          },
        }),
      ]);

      const deliveryRate =
        totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 0;

      monthlyDelivery.push({
        month: date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        deliveryRate: Math.round(deliveryRate * 10) / 10, // Round to 1 decimal place
        messageCount: totalMessages,
      });
    }

    return {
      deliveryStatus: {
        delivered: deliveredCount,
        failed: failedCount,
        pending: pendingCount,
      },
      messageVolume: {
        daily: dailyData,
        weekly: weeklyData,
        monthly: monthlyData,
      },
      monthlyDelivery,
      averageSuccessRate,
    };
  }

  /**
   * Get message volume data for different timeframes
   */
  static async getMessageVolumeData(
    userId: string,
    timeframe: "daily" | "weekly" | "monthly"
  ) {
    const labels: string[] = [];
    const values: number[] = [];

    if (timeframe === "daily") {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const count = await prisma.smsLog.count({
          where: {
            userId,
            sentAt: {
              gte: date,
              lt: nextDay,
            },
          },
        });

        labels.push(
          date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        );
        values.push(count);
      }
    } else if (timeframe === "weekly") {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - i * 7);
        endDate.setHours(23, 59, 59, 999);

        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);

        const count = await prisma.smsLog.count({
          where: {
            userId,
            sentAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        const weekLabel = `Week ${4 - i}`;
        labels.push(weekLabel);
        values.push(count);
      }
    } else if (timeframe === "monthly") {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        date.setDate(1);
        date.setHours(0, 0, 0, 0);

        const nextMonth = new Date(date);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        const count = await prisma.smsLog.count({
          where: {
            userId,
            sentAt: {
              gte: date,
              lt: nextMonth,
            },
          },
        });

        labels.push(date.toLocaleDateString("en-US", { month: "short" }));
        values.push(count);
      }
    }

    return {
      labels,
      values,
    };
  }

  /**
   * Get average success rate statistics
   */
  static async getAverageSuccessRate(userId: string) {
    try {
      const now = new Date();

      // Calculate dates for different periods
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const previous30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Get overall success rate (all time)
      const [totalMessages, deliveredMessages] = await Promise.all([
        prisma.smsLog.count({
          where: { userId },
        }),
        prisma.smsLog.count({
          where: {
            userId,
            status: MessageStatus.DELIVERED,
          },
        }),
      ]);

      // Get last 30 days success rate
      const [last30DaysTotal, last30DaysDelivered] = await Promise.all([
        prisma.smsLog.count({
          where: {
            userId,
            sentAt: { gte: last30Days },
          },
        }),
        prisma.smsLog.count({
          where: {
            userId,
            status: MessageStatus.DELIVERED,
            sentAt: { gte: last30Days },
          },
        }),
      ]);

      // Get last 7 days success rate
      const [last7DaysTotal, last7DaysDelivered] = await Promise.all([
        prisma.smsLog.count({
          where: {
            userId,
            sentAt: { gte: last7Days },
          },
        }),
        prisma.smsLog.count({
          where: {
            userId,
            status: MessageStatus.DELIVERED,
            sentAt: { gte: last7Days },
          },
        }),
      ]);

      // Get previous 30 days for trend calculation
      const [previous30DaysTotal, previous30DaysDelivered] = await Promise.all([
        prisma.smsLog.count({
          where: {
            userId,
            sentAt: { gte: previous30Days, lt: last30Days },
          },
        }),
        prisma.smsLog.count({
          where: {
            userId,
            status: MessageStatus.DELIVERED,
            sentAt: { gte: previous30Days, lt: last30Days },
          },
        }),
      ]);

      // Calculate success rates
      const overallRate =
        totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 0;
      const last30DaysRate =
        last30DaysTotal > 0 ? (last30DaysDelivered / last30DaysTotal) * 100 : 0;
      const last7DaysRate =
        last7DaysTotal > 0 ? (last7DaysDelivered / last7DaysTotal) * 100 : 0;
      const previous30DaysRate =
        previous30DaysTotal > 0
          ? (previous30DaysDelivered / previous30DaysTotal) * 100
          : 0;

      // Calculate trend (percentage change from previous period)
      const trend =
        previous30DaysRate > 0
          ? ((last30DaysRate - previous30DaysRate) / previous30DaysRate) * 100
          : 0;

      return {
        overall: Math.round(overallRate * 10) / 10, // Round to 1 decimal place
        last30Days: Math.round(last30DaysRate * 10) / 10,
        last7Days: Math.round(last7DaysRate * 10) / 10,
        trend: Math.round(trend * 10) / 10,
      };
    } catch (error) {
      console.warn(
        "Average success rate calculation failed, returning default values"
      );
      return {
        overall: 0,
        last30Days: 0,
        last7Days: 0,
        trend: 0,
      };
    }
  }
}
