import { PrismaClient } from "@prisma/client";
import { ApiError } from "../middleware/error.middleware";
import { PricingService } from "./pricing.service";
import { BillingService } from "./billing.service";

const prisma = new PrismaClient();

interface DashboardFilters {
  startDate?: Date;
  endDate?: Date;
  period?: "today" | "week" | "month" | "quarter" | "year";
}

export class ResellerDashboardService {
  /**
   * Get comprehensive dashboard overview
   */
  static async getDashboardOverview(
    userId: string,
    filters: DashboardFilters = {}
  ) {
    try {
      const { startDate, endDate } = this.getDateRange(filters);

      const [
        profitAnalytics,
        billingAnalytics,
        smsAnalytics,
        clientAnalytics,
        recentTransactions,
      ] = await Promise.all([
        PricingService.getProfitAnalytics(
          userId,
          this.getDaysDifference(startDate, endDate)
        ),
        BillingService.getBillingAnalytics(
          userId,
          this.getDaysDifference(startDate, endDate)
        ),
        this.getSmsAnalytics(userId, startDate, endDate),
        this.getClientAnalytics(userId, startDate, endDate),
        this.getRecentTransactions(userId, 10),
      ]);

      return {
        period: {
          startDate,
          endDate,
          days: this.getDaysDifference(startDate, endDate),
        },
        profit: profitAnalytics,
        billing: billingAnalytics,
        sms: smsAnalytics,
        clients: clientAnalytics,
        recentTransactions,
      };
    } catch (error) {
      console.error("Dashboard Overview Error:", error);
      throw ApiError.internal("Failed to get dashboard overview");
    }
  }

  /**
   * Get SMS analytics
   */
  static async getSmsAnalytics(userId: string, startDate: Date, endDate: Date) {
    try {
      const [totalSms, successfulSms, failedSms, smsByType, smsByCountry] =
        await Promise.all([
          prisma.smsLog.count({
            where: {
              userId,
              sentAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          }),
          prisma.smsLog.count({
            where: {
              userId,
              status: "DELIVERED",
              sentAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          }),
          prisma.smsLog.count({
            where: {
              userId,
              status: "FAILED",
              sentAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          }),
          prisma.profitTransaction.groupBy({
            by: ["transactionType"],
            where: {
              userId,
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
            _sum: { volume: true },
            _count: { id: true },
          }),
          prisma.profitTransaction.groupBy({
            by: ["countryCode"],
            where: {
              userId,
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
              countryCode: { not: null },
            },
            _sum: { volume: true },
            _count: { id: true },
          }),
        ]);

      const deliveryRate = totalSms > 0 ? (successfulSms / totalSms) * 100 : 0;

      return {
        totalSms,
        successfulSms,
        failedSms,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        smsByType: smsByType.map((item) => ({
          type: item.transactionType,
          volume: item._sum.volume || 0,
          transactions: item._count.id,
        })),
        smsByCountry: smsByCountry
          .map((item) => ({
            country: item.countryCode,
            volume: item._sum.volume || 0,
            transactions: item._count.id,
          }))
          .slice(0, 10), // Top 10 countries
      };
    } catch (error) {
      console.error("SMS Analytics Error:", error);
      throw ApiError.internal("Failed to get SMS analytics");
    }
  }

  /**
   * Get client analytics
   */
  static async getClientAnalytics(
    userId: string,
    startDate: Date,
    endDate: Date
  ) {
    try {
      const [totalClients, activeClients, newClients, clientActivity] =
        await Promise.all([
          prisma.clientApi.count({
            where: { userId },
          }),
          prisma.clientApi.count({
            where: {
              userId,
              createdAt: {
                gte: startDate,
              },
            },
          }),
          prisma.clientApi.count({
            where: {
              userId,
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          }),
          prisma.smsLog.groupBy({
            by: ["userId"],
            where: {
              userId,
              sentAt: {
                gte: startDate,
                lte: endDate,
              },
            },
            _count: { id: true },
            _sum: { cost: true },
          }),
        ]);

      return {
        totalClients,
        activeClients,
        newClients,
        clientRetentionRate:
          totalClients > 0 ? (activeClients / totalClients) * 100 : 0,
        averageUsagePerClient:
          activeClients > 0
            ? (clientActivity[0]?._count.id || 0) / activeClients
            : 0,
      };
    } catch (error) {
      console.error("Client Analytics Error:", error);
      throw ApiError.internal("Failed to get client analytics");
    }
  }

  /**
   * Get recent transactions
   */
  static async getRecentTransactions(userId: string, limit = 10) {
    try {
      const transactions = await prisma.profitTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return transactions;
    } catch (error) {
      console.error("Recent Transactions Error:", error);
      throw ApiError.internal("Failed to get recent transactions");
    }
  }

  /**
   * Get profit trends over time
   */
  static async getProfitTrends(
    userId: string,
    period: "daily" | "weekly" | "monthly" = "daily",
    days = 30
  ) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let groupByFormat: string;
      switch (period) {
        case "weekly":
          groupByFormat = 'YYYY-"W"WW';
          break;
        case "monthly":
          groupByFormat = "YYYY-MM";
          break;
        default:
          groupByFormat = "YYYY-MM-DD";
      }

      // This would need to be implemented with raw SQL for proper date grouping
      // For now, we'll return a simplified version
      const transactions = await prisma.profitTransaction.findMany({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: "asc" },
      });

      // Group by date manually
      const groupedData = transactions.reduce((acc, transaction) => {
        const date = transaction.createdAt.toISOString().split("T")[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            profit: 0,
            volume: 0,
            transactions: 0,
          };
        }
        acc[date].profit += transaction.profit;
        acc[date].volume += transaction.volume;
        acc[date].transactions++;
        return acc;
      }, {} as any);

      return Object.values(groupedData);
    } catch (error) {
      console.error("Profit Trends Error:", error);
      throw ApiError.internal("Failed to get profit trends");
    }
  }

  /**
   * Get top performing services
   */
  static async getTopPerformingServices(userId: string, limit = 5) {
    try {
      const services = await prisma.profitTransaction.groupBy({
        by: ["transactionType"],
        where: { userId },
        _sum: {
          profit: true,
          volume: true,
        },
        _count: { id: true },
        orderBy: {
          _sum: {
            profit: "desc",
          },
        },
        take: limit,
      });

      return services.map((service) => ({
        service: service.transactionType,
        totalProfit: service._sum.profit || 0,
        totalVolume: service._sum.volume || 0,
        totalTransactions: service._count.id,
        averageProfitPerTransaction:
          service._count.id > 0
            ? (service._sum.profit || 0) / service._count.id
            : 0,
      }));
    } catch (error) {
      console.error("Top Performing Services Error:", error);
      throw ApiError.internal("Failed to get top performing services");
    }
  }

  /**
   * Get business insights and recommendations
   */
  static async getBusinessInsights(userId: string) {
    try {
      const [profitAnalytics, markupRules, billingConfig, recentPerformance] =
        await Promise.all([
          PricingService.getProfitAnalytics(userId, 30),
          PricingService.getMarkupRules(userId),
          BillingService.getBillingConfig(userId),
          this.getProfitTrends(userId, "daily", 7),
        ]);

      const insights = [];
      const recommendations = [];

      // Analyze profit trends
      if (recentPerformance.length >= 2) {
        const latestProfit =
          (recentPerformance[recentPerformance.length - 1] as any)?.profit || 0;
        const previousProfit =
          (recentPerformance[recentPerformance.length - 2] as any)?.profit || 0;

        if (latestProfit > previousProfit) {
          insights.push({
            type: "positive",
            title: "Profit Growth",
            description: `Daily profit increased by ${(
              ((latestProfit - previousProfit) / previousProfit) *
              100
            ).toFixed(1)}%`,
          });
        } else if (latestProfit < previousProfit) {
          insights.push({
            type: "warning",
            title: "Profit Decline",
            description: `Daily profit decreased by ${(
              ((previousProfit - latestProfit) / previousProfit) *
              100
            ).toFixed(1)}%`,
          });
          recommendations.push({
            title: "Review Pricing Strategy",
            description:
              "Consider adjusting markup rules to improve profitability",
          });
        }
      }

      // Analyze markup rules
      if (markupRules.length === 0) {
        recommendations.push({
          title: "Set Up Markup Rules",
          description:
            "Create markup rules to optimize pricing for different volumes and regions",
        });
      }

      // Analyze billing configuration
      if (
        billingConfig.billingCycle === "PREPAID" &&
        !billingConfig.autoRecharge
      ) {
        recommendations.push({
          title: "Enable Auto-Recharge",
          description:
            "Set up auto-recharge to ensure uninterrupted service for your clients",
        });
      }

      return {
        insights,
        recommendations,
        summary: {
          totalProfit: profitAnalytics.totalProfit,
          totalTransactions: profitAnalytics.totalTransactions,
          activeMarkupRules: markupRules.length,
          billingCycle: billingConfig.billingCycle,
        },
      };
    } catch (error) {
      console.error("Business Insights Error:", error);
      throw ApiError.internal("Failed to get business insights");
    }
  }

  /**
   * Helper: Get date range based on filters
   */
  private static getDateRange(filters: DashboardFilters) {
    const now = new Date();
    let startDate = filters.startDate;
    let endDate = filters.endDate || now;

    if (filters.period && !startDate) {
      switch (filters.period) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "quarter":
          const quarterStart = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterStart, 1);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    if (!startDate) {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  /**
   * Helper: Calculate days difference
   */
  private static getDaysDifference(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
