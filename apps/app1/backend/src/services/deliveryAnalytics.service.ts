import { PrismaClient } from "@prisma/client";
import { ApiError } from "../middleware/error.middleware";

const prisma = new PrismaClient();

interface AnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  countryCode?: string;
  serviceType?: string;
  period?: "hour" | "day" | "week" | "month";
}

export class DeliveryAnalyticsService {
  /**
   * Get real-time delivery dashboard data
   */
  static async getRealTimeDashboard(userId: string) {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

      const [
        last24HoursStats,
        lastHourStats,
        recentDeliveries,
        activeMessages,
        topCountries,
        alertsData,
      ] = await Promise.all([
        this.getOverallStatistics(userId, {
          startDate: last24Hours,
          endDate: now,
        }),
        this.getOverallStatistics(userId, {
          startDate: lastHour,
          endDate: now,
        }),
        this.getRecentDeliveries(userId, 10),
        this.getActiveMessages(userId),
        this.getTopCountries(userId, { startDate: last24Hours, endDate: now }),
        this.getDeliveryAlerts(userId),
      ]);

      return {
        timestamp: now.toISOString(),
        last24Hours: last24HoursStats,
        lastHour: lastHourStats,
        recentDeliveries,
        activeMessages,
        topCountries,
        alerts: alertsData,
        summary: {
          totalSent: last24HoursStats.totalMessages,
          deliveryRate: last24HoursStats.deliveryRate,
          avgDeliveryTime: last24HoursStats.avgDeliveryTime,
          totalCost: last24HoursStats.totalCost,
          trend: this.calculateTrend(last24HoursStats, lastHourStats),
        },
      };
    } catch (error) {
      console.error("Real-time Dashboard Error:", error);
      throw ApiError.internal("Failed to get real-time dashboard data");
    }
  }

  /**
   * Get comprehensive delivery analytics
   */
  static async getDeliveryAnalytics(
    userId: string,
    filters: AnalyticsFilters = {}
  ) {
    try {
      const { startDate, endDate, countryCode, serviceType } = filters;

      const [
        overallStats,
        trendData,
        countryBreakdown,
        serviceBreakdown,
        hourlyDistribution,
        failureAnalysis,
      ] = await Promise.all([
        this.getOverallStatistics(userId, filters),
        this.getTrendData(userId, filters),
        this.getCountryBreakdown(userId, filters),
        this.getServiceBreakdown(userId, filters),
        this.getHourlyDistribution(userId, filters),
        this.getFailureAnalysis(userId, filters),
      ]);

      return {
        period: {
          startDate:
            startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: endDate || new Date(),
        },
        overall: overallStats,
        trends: trendData,
        breakdowns: {
          byCountry: countryBreakdown,
          byService: serviceBreakdown,
          byHour: hourlyDistribution,
        },
        failures: failureAnalysis,
      };
    } catch (error) {
      console.error("Get Delivery Analytics Error:", error);
      throw ApiError.internal("Failed to get delivery analytics");
    }
  }

  /**
   * Get overall delivery statistics
   */
  private static async getOverallStatistics(
    userId: string,
    filters: AnalyticsFilters
  ) {
    try {
      const where: any = { userId };

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      if (filters.countryCode) where.countryCode = filters.countryCode;

      const [totalReports, statusCounts, avgDeliveryTime, totalCost] =
        await Promise.all([
          prisma.deliveryReport.count({ where }),
          prisma.deliveryReport.groupBy({
            by: ["status"],
            where,
            _count: { id: true },
          }),
          this.calculateAverageDeliveryTime(userId, filters),
          prisma.deliveryReport.aggregate({
            where: { ...where, cost: { not: null } },
            _sum: { cost: true },
          }),
        ]);

      const stats = statusCounts.reduce((acc, item) => {
        acc[item.status.toLowerCase()] = item._count.id;
        return acc;
      }, {} as any);

      const delivered = stats.delivered || 0;
      const failed = stats.failed || 0;
      const pending = stats.pending || 0;
      const sent = stats.sent || 0;

      const deliveryRate =
        totalReports > 0 ? (delivered / totalReports) * 100 : 0;
      const failureRate = totalReports > 0 ? (failed / totalReports) * 100 : 0;

      return {
        totalMessages: totalReports,
        delivered,
        failed,
        pending,
        sent,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100,
        avgDeliveryTime,
        totalCost: totalCost._sum.cost || 0,
      };
    } catch (error) {
      console.error("Get Overall Statistics Error:", error);
      throw error;
    }
  }

  /**
   * Get trend data over time
   */
  private static async getTrendData(userId: string, filters: AnalyticsFilters) {
    try {
      const period = filters.period || "day";
      const where: any = { userId };

      if (filters.startDate || filters.endDate) {
        where.date = {};
        if (filters.startDate) where.date.gte = filters.startDate;
        if (filters.endDate) where.date.lte = filters.endDate;
      }

      if (filters.countryCode) where.countryCode = filters.countryCode;
      if (filters.serviceType) where.serviceType = filters.serviceType;

      const analytics = await prisma.deliveryAnalytics.findMany({
        where,
        orderBy: { date: "asc" },
      });

      // Group by period if needed
      const groupedData = this.groupDataByPeriod(analytics, period);

      return groupedData.map((item) => ({
        date: item.date,
        totalSent: item.totalSent,
        totalDelivered: item.totalDelivered,
        totalFailed: item.totalFailed,
        deliveryRate: item.deliveryRate,
        avgDeliveryTime: item.avgDeliveryTime,
      }));
    } catch (error) {
      console.error("Get Trend Data Error:", error);
      throw error;
    }
  }

  /**
   * Get country breakdown
   */
  private static async getCountryBreakdown(
    userId: string,
    filters: AnalyticsFilters
  ) {
    try {
      const where: any = {
        userId,
        countryCode: { not: null },
      };

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      const countryStats = await prisma.deliveryReport.groupBy({
        by: ["countryCode", "status"],
        where,
        _count: { id: true },
        _sum: { cost: true },
      });

      // Process the data to get country-wise statistics
      const countryMap = new Map();

      countryStats.forEach((stat) => {
        const country = stat.countryCode!;
        if (!countryMap.has(country)) {
          countryMap.set(country, {
            country,
            total: 0,
            delivered: 0,
            failed: 0,
            pending: 0,
            sent: 0,
            cost: 0,
          });
        }

        const countryData = countryMap.get(country);
        countryData.total += stat._count.id;
        countryData[stat.status.toLowerCase()] += stat._count.id;
        countryData.cost += stat._sum.cost || 0;
      });

      return Array.from(countryMap.values())
        .map((country) => ({
          ...country,
          deliveryRate:
            country.total > 0 ? (country.delivered / country.total) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total);
    } catch (error) {
      console.error("Get Country Breakdown Error:", error);
      throw error;
    }
  }

  /**
   * Get service type breakdown
   */
  private static async getServiceBreakdown(
    userId: string,
    filters: AnalyticsFilters
  ) {
    try {
      const where: any = { userId };

      if (filters.startDate || filters.endDate) {
        where.date = {};
        if (filters.startDate) where.date.gte = filters.startDate;
        if (filters.endDate) where.date.lte = filters.endDate;
      }

      if (filters.countryCode) where.countryCode = filters.countryCode;

      const serviceStats = await prisma.deliveryAnalytics.groupBy({
        by: ["serviceType"],
        where,
        _sum: {
          totalSent: true,
          totalDelivered: true,
          totalFailed: true,
          totalCost: true,
        },
        _avg: {
          deliveryRate: true,
          avgDeliveryTime: true,
        },
      });

      return serviceStats.map((stat) => ({
        serviceType: stat.serviceType || "Unknown",
        totalSent: stat._sum.totalSent || 0,
        totalDelivered: stat._sum.totalDelivered || 0,
        totalFailed: stat._sum.totalFailed || 0,
        deliveryRate: stat._avg.deliveryRate || 0,
        avgDeliveryTime: stat._avg.avgDeliveryTime || 0,
        totalCost: stat._sum.totalCost || 0,
      }));
    } catch (error) {
      console.error("Get Service Breakdown Error:", error);
      throw error;
    }
  }

  /**
   * Get hourly distribution
   */
  private static async getHourlyDistribution(
    userId: string,
    filters: AnalyticsFilters
  ) {
    try {
      const where: any = { userId };

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      // This would need raw SQL for proper hour extraction
      // For now, we'll return a simplified version
      const reports = await prisma.deliveryReport.findMany({
        where,
        select: {
          createdAt: true,
          status: true,
        },
      });

      const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        total: 0,
        delivered: 0,
        failed: 0,
      }));

      reports.forEach((report) => {
        const hour = report.createdAt.getHours();
        hourlyData[hour].total++;
        if (report.status === "DELIVERED") {
          hourlyData[hour].delivered++;
        } else if (report.status === "FAILED") {
          hourlyData[hour].failed++;
        }
      });

      return hourlyData.map((data) => ({
        ...data,
        deliveryRate: data.total > 0 ? (data.delivered / data.total) * 100 : 0,
      }));
    } catch (error) {
      console.error("Get Hourly Distribution Error:", error);
      throw error;
    }
  }

  /**
   * Get failure analysis
   */
  private static async getFailureAnalysis(
    userId: string,
    filters: AnalyticsFilters
  ) {
    try {
      const where: any = {
        userId,
        status: "FAILED",
        failureReason: { not: null },
      };

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      const failureReasons = await prisma.deliveryReport.groupBy({
        by: ["failureReason"],
        where,
        _count: { id: true },
      });

      const totalFailures = failureReasons.reduce(
        (sum, reason) => sum + reason._count.id,
        0
      );

      return {
        totalFailures,
        reasons: failureReasons
          .map((reason) => ({
            reason: reason.failureReason,
            count: reason._count.id,
            percentage:
              totalFailures > 0 ? (reason._count.id / totalFailures) * 100 : 0,
          }))
          .sort((a, b) => b.count - a.count),
      };
    } catch (error) {
      console.error("Get Failure Analysis Error:", error);
      throw error;
    }
  }

  /**
   * Calculate average delivery time
   */
  private static async calculateAverageDeliveryTime(
    userId: string,
    filters: AnalyticsFilters
  ) {
    try {
      const where: any = {
        userId,
        status: "DELIVERED",
        deliveredAt: { not: null },
      };

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      const deliveredReports = await prisma.deliveryReport.findMany({
        where,
        select: {
          createdAt: true,
          deliveredAt: true,
        },
      });

      if (deliveredReports.length === 0) {
        return null;
      }

      const totalTime = deliveredReports.reduce((sum, report) => {
        if (report.deliveredAt) {
          const deliveryTime =
            report.deliveredAt.getTime() - report.createdAt.getTime();
          return sum + deliveryTime;
        }
        return sum;
      }, 0);

      return Math.round(totalTime / deliveredReports.length / 1000); // Return in seconds
    } catch (error) {
      console.error("Calculate Average Delivery Time Error:", error);
      return null;
    }
  }

  /**
   * Group data by period
   */
  private static groupDataByPeriod(data: any[], period: string) {
    if (period === "day") {
      return data; // Already grouped by day
    }

    // For other periods, we would need more complex grouping logic
    // For now, return the data as-is
    return data;
  }

  /**
   * Get delivery performance metrics
   */
  static async getPerformanceMetrics(
    userId: string,
    filters: AnalyticsFilters = {}
  ) {
    try {
      const [currentPeriod, previousPeriod] = await Promise.all([
        this.getOverallStatistics(userId, filters),
        this.getOverallStatistics(
          userId,
          this.getPreviousPeriodFilters(filters)
        ),
      ]);

      const metrics = {
        deliveryRate: {
          current: currentPeriod.deliveryRate,
          previous: previousPeriod.deliveryRate,
          change: currentPeriod.deliveryRate - previousPeriod.deliveryRate,
        },
        volume: {
          current: currentPeriod.totalMessages,
          previous: previousPeriod.totalMessages,
          change: currentPeriod.totalMessages - previousPeriod.totalMessages,
        },
        avgDeliveryTime: {
          current: currentPeriod.avgDeliveryTime,
          previous: previousPeriod.avgDeliveryTime,
          change:
            (currentPeriod.avgDeliveryTime || 0) -
            (previousPeriod.avgDeliveryTime || 0),
        },
        cost: {
          current: currentPeriod.totalCost,
          previous: previousPeriod.totalCost,
          change: currentPeriod.totalCost - previousPeriod.totalCost,
        },
      };

      return metrics;
    } catch (error) {
      console.error("Get Performance Metrics Error:", error);
      throw ApiError.internal("Failed to get performance metrics");
    }
  }

  /**
   * Get previous period filters for comparison
   */
  private static getPreviousPeriodFilters(
    filters: AnalyticsFilters
  ): AnalyticsFilters {
    if (!filters.startDate || !filters.endDate) {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      return {
        ...filters,
        startDate: sixtyDaysAgo,
        endDate: thirtyDaysAgo,
      };
    }

    const periodLength =
      filters.endDate.getTime() - filters.startDate.getTime();
    const previousEndDate = new Date(filters.startDate.getTime());
    const previousStartDate = new Date(
      filters.startDate.getTime() - periodLength
    );

    return {
      ...filters,
      startDate: previousStartDate,
      endDate: previousEndDate,
    };
  }

  /**
   * Generate delivery insights
   */
  static async generateInsights(
    userId: string,
    filters: AnalyticsFilters = {}
  ) {
    try {
      const [analytics, performance] = await Promise.all([
        this.getDeliveryAnalytics(userId, filters),
        this.getPerformanceMetrics(userId, filters),
      ]);

      const insights = [];

      // Delivery rate insights
      if (performance.deliveryRate.change < -5) {
        insights.push({
          type: "warning",
          title: "Delivery Rate Decline",
          description: `Delivery rate decreased by ${Math.abs(
            performance.deliveryRate.change
          ).toFixed(1)}%`,
          recommendation:
            "Review failed messages and consider adjusting sender IDs or message content",
        });
      } else if (performance.deliveryRate.change > 5) {
        insights.push({
          type: "positive",
          title: "Improved Delivery Rate",
          description: `Delivery rate improved by ${performance.deliveryRate.change.toFixed(
            1
          )}%`,
          recommendation:
            "Continue current practices to maintain high delivery rates",
        });
      }

      // Volume insights
      if (performance.volume.change > 50) {
        insights.push({
          type: "info",
          title: "High Volume Increase",
          description: `Message volume increased by ${performance.volume.change} messages`,
          recommendation:
            "Monitor delivery performance and consider volume-based optimizations",
        });
      }

      // Cost insights
      if (performance.cost.change > 0) {
        const costIncrease = (
          (performance.cost.change / performance.cost.previous) *
          100
        ).toFixed(1);
        insights.push({
          type: "info",
          title: "Cost Analysis",
          description: `Delivery costs increased by ${costIncrease}%`,
          recommendation:
            "Review pricing strategies and optimize for cost efficiency",
        });
      }

      return {
        insights,
        summary: {
          totalInsights: insights.length,
          criticalIssues: insights.filter((i) => i.type === "warning").length,
          improvements: insights.filter((i) => i.type === "positive").length,
        },
      };
    } catch (error) {
      console.error("Generate Insights Error:", error);
      throw ApiError.internal("Failed to generate insights");
    }
  }

  /**
   * Get recent deliveries for real-time dashboard
   */
  private static async getRecentDeliveries(userId: string, limit: number = 10) {
    try {
      const recentDeliveries = await prisma.deliveryReport.findMany({
        where: { userId },
        include: {
          smsLog: {
            include: {
              senderId: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      });

      return recentDeliveries.map((delivery) => ({
        id: delivery.id,
        messageId: delivery.messageId,
        status: delivery.status,
        recipients: delivery.smsLog?.recipients?.length || 0,
        senderId: delivery.smsLog?.senderId?.senderId || "Unknown",
        countryCode: delivery.countryCode,
        networkOperator: delivery.networkOperator,
        cost: delivery.cost,
        deliveredAt: delivery.deliveredAt,
        createdAt: delivery.createdAt,
        updatedAt: delivery.updatedAt,
      }));
    } catch (error) {
      console.error("Get Recent Deliveries Error:", error);
      return [];
    }
  }

  /**
   * Get active messages (pending/sent status)
   */
  private static async getActiveMessages(userId: string) {
    try {
      const activeMessages = await prisma.deliveryReport.findMany({
        where: {
          userId,
          status: { in: ["PENDING", "SENT"] },
        },
        include: {
          smsLog: {
            include: {
              senderId: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        count: activeMessages.length,
        messages: activeMessages.map((message) => ({
          id: message.id,
          messageId: message.messageId,
          status: message.status,
          recipients: message.smsLog?.recipients?.length || 0,
          senderId: message.smsLog?.senderId?.senderId || "Unknown",
          createdAt: message.createdAt,
          timeElapsed: Math.floor(
            (Date.now() - message.createdAt.getTime()) / 1000
          ),
        })),
      };
    } catch (error) {
      console.error("Get Active Messages Error:", error);
      return { count: 0, messages: [] };
    }
  }

  /**
   * Get top countries for real-time dashboard
   */
  private static async getTopCountries(
    userId: string,
    filters: AnalyticsFilters,
    limit: number = 5
  ) {
    try {
      const deliveryReports = await prisma.deliveryReport.findMany({
        where: {
          userId,
          createdAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
          countryCode: { not: null },
        },
      });

      const countryStats = new Map();

      deliveryReports.forEach((report) => {
        if (!report.countryCode) return;

        const stats = countryStats.get(report.countryCode) || {
          countryCode: report.countryCode,
          totalSent: 0,
          totalDelivered: 0,
          totalFailed: 0,
          totalCost: 0,
        };

        stats.totalSent++;
        if (report.status === "DELIVERED") stats.totalDelivered++;
        if (report.status === "FAILED") stats.totalFailed++;
        stats.totalCost += report.cost || 0;

        countryStats.set(report.countryCode, stats);
      });

      return Array.from(countryStats.values())
        .map((stats) => ({
          ...stats,
          deliveryRate:
            stats.totalSent > 0
              ? (stats.totalDelivered / stats.totalSent) * 100
              : 0,
        }))
        .sort((a, b) => b.totalSent - a.totalSent)
        .slice(0, limit);
    } catch (error) {
      console.error("Get Top Countries Error:", error);
      return [];
    }
  }

  /**
   * Get delivery alerts
   */
  private static async getDeliveryAlerts(userId: string) {
    try {
      const alerts = [];
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Check for high failure rate
      const recentStats = await this.getOverallStatistics(userId, {
        startDate: last24Hours,
        endDate: now,
      });

      if (recentStats.failureRate > 10) {
        alerts.push({
          type: "HIGH_FAILURE_RATE",
          severity: "warning",
          message: `High failure rate detected: ${recentStats.failureRate.toFixed(
            1
          )}%`,
          timestamp: now.toISOString(),
        });
      }

      // Check for slow delivery times
      if (recentStats.avgDeliveryTime > 300) {
        // 5 minutes
        alerts.push({
          type: "SLOW_DELIVERY",
          severity: "info",
          message: `Average delivery time is ${Math.round(
            recentStats.avgDeliveryTime / 60
          )} minutes`,
          timestamp: now.toISOString(),
        });
      }

      // Check for stuck messages
      const stuckMessages = await prisma.deliveryReport.count({
        where: {
          userId,
          status: { in: ["PENDING", "SENT"] },
          createdAt: {
            lt: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
          },
        },
      });

      if (stuckMessages > 0) {
        alerts.push({
          type: "STUCK_MESSAGES",
          severity: "error",
          message: `${stuckMessages} messages stuck in pending/sent status`,
          timestamp: now.toISOString(),
        });
      }

      return alerts;
    } catch (error) {
      console.error("Get Delivery Alerts Error:", error);
      return [];
    }
  }

  /**
   * Calculate trend between two periods
   */
  private static calculateTrend(current: any, previous: any) {
    const trends = {
      deliveryRate: this.calculatePercentageChange(
        previous.deliveryRate,
        current.deliveryRate
      ),
      totalSent: this.calculatePercentageChange(
        previous.totalSent,
        current.totalSent
      ),
      avgDeliveryTime: this.calculatePercentageChange(
        previous.avgDeliveryTime,
        current.avgDeliveryTime
      ),
      totalCost: this.calculatePercentageChange(
        previous.totalCost,
        current.totalCost
      ),
    };

    return trends;
  }

  /**
   * Calculate percentage change between two values
   */
  private static calculatePercentageChange(
    oldValue: number,
    newValue: number
  ): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return Math.round(((newValue - oldValue) / oldValue) * 100 * 100) / 100;
  }
}
