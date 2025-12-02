import { PrismaClient, DeliveryStatus } from "@prisma/client";
import { ApiError } from "../middleware/error.middleware";

const prisma = new PrismaClient();

interface CreateDeliveryReportParams {
  userId: string;
  smsLogId: string;
  messageId: string;
  status?: DeliveryStatus;
  networkOperator?: string;
  countryCode?: string;
  cost?: number;
  metadata?: any;
}

interface UpdateDeliveryStatusParams {
  messageId: string;
  status: DeliveryStatus;
  deliveredAt?: Date;
  failureReason?: string;
  source?: string;
  metadata?: any;
}

export class DeliveryTrackingService {
  /**
   * Create delivery report for SMS
   */
  static async createDeliveryReport(params: CreateDeliveryReportParams) {
    try {
      const {
        userId,
        smsLogId,
        messageId,
        status = "PENDING",
        networkOperator,
        countryCode,
        cost,
        metadata,
      } = params;

      // Check if delivery report already exists
      const existingReport = await prisma.deliveryReport.findUnique({
        where: { smsLogId },
      });

      if (existingReport) {
        throw ApiError.conflict("Delivery report already exists for this SMS");
      }

      const deliveryReport = await prisma.deliveryReport.create({
        data: {
          userId,
          smsLogId,
          messageId,
          status,
          networkOperator,
          countryCode,
          cost,
          metadata,
          statusHistory: {
            create: {
              status,
              source: "system",
              metadata: { initial: true },
            },
          },
        },
        include: {
          statusHistory: true,
        },
      });

      return deliveryReport;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Create Delivery Report Error:", error);
      throw ApiError.internal("Failed to create delivery report");
    }
  }

  /**
   * Update delivery status
   */
  static async updateDeliveryStatus(params: UpdateDeliveryStatusParams) {
    try {
      const {
        messageId,
        status,
        deliveredAt,
        failureReason,
        source = "webhook",
        metadata,
      } = params;

      const deliveryReport = await prisma.deliveryReport.findFirst({
        where: { messageId },
      });

      if (!deliveryReport) {
        throw ApiError.notFound("Delivery report not found");
      }

      // Don't update if status hasn't changed
      if (deliveryReport.status === status) {
        return deliveryReport;
      }

      const updatedReport = await prisma.deliveryReport.update({
        where: { id: deliveryReport.id },
        data: {
          status,
          deliveredAt:
            deliveredAt || (status === "DELIVERED" ? new Date() : undefined),
          failureReason: status === "FAILED" ? failureReason : undefined,
          statusHistory: {
            create: {
              status,
              source,
              metadata,
            },
          },
        },
        include: {
          statusHistory: {
            orderBy: { timestamp: "desc" },
          },
        },
      });

      // Update analytics
      await this.updateDeliveryAnalytics(
        deliveryReport.userId,
        deliveryReport.countryCode
      );

      return updatedReport;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Update Delivery Status Error:", error);
      throw ApiError.internal("Failed to update delivery status");
    }
  }

  /**
   * Get delivery report by message ID
   */
  static async getDeliveryReport(messageId: string, userId?: string) {
    try {
      const where: any = { messageId };
      if (userId) {
        where.userId = userId;
      }

      const deliveryReport = await prisma.deliveryReport.findFirst({
        where,
        include: {
          statusHistory: {
            orderBy: { timestamp: "desc" },
          },
          smsLog: true,
        },
      });

      if (!deliveryReport) {
        throw ApiError.notFound("Delivery report not found");
      }

      return deliveryReport;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Get Delivery Report Error:", error);
      throw ApiError.internal("Failed to get delivery report");
    }
  }

  /**
   * Get delivery reports for user
   */
  static async getDeliveryReports(
    userId: string,
    filters: {
      status?: DeliveryStatus;
      startDate?: Date;
      endDate?: Date;
      countryCode?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    try {
      const {
        status,
        startDate,
        endDate,
        countryCode,
        page = 1,
        limit = 20,
      } = filters;

      const skip = (page - 1) * limit;
      const where: any = { userId };

      if (status) where.status = status;
      if (countryCode) where.countryCode = countryCode;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [reports, total] = await Promise.all([
        prisma.deliveryReport.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            smsLog: {
              select: {
                message: true,
                recipients: true,
                sentAt: true,
              },
            },
          },
        }),
        prisma.deliveryReport.count({ where }),
      ]);

      return {
        data: reports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Get Delivery Reports Error:", error);
      throw ApiError.internal("Failed to get delivery reports");
    }
  }

  /**
   * Get delivery statistics
   */
  static async getDeliveryStatistics(
    userId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      countryCode?: string;
      serviceType?: string;
    } = {}
  ) {
    try {
      const { startDate, endDate, countryCode, serviceType } = filters;
      const where: any = { userId };

      if (countryCode) where.countryCode = countryCode;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [statusCounts, totalReports, avgDeliveryTime] = await Promise.all([
        prisma.deliveryReport.groupBy({
          by: ["status"],
          where,
          _count: { id: true },
        }),
        prisma.deliveryReport.count({ where }),
        this.calculateAverageDeliveryTime(userId, filters),
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
        total: totalReports,
        delivered,
        failed,
        pending,
        sent,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100,
        avgDeliveryTime,
      };
    } catch (error) {
      console.error("Get Delivery Statistics Error:", error);
      throw ApiError.internal("Failed to get delivery statistics");
    }
  }

  /**
   * Update delivery analytics (daily aggregation)
   */
  private static async updateDeliveryAnalytics(
    userId: string,
    countryCode?: string | null,
    serviceType?: string
  ) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const where: any = {
        userId,
        createdAt: { gte: today },
      };

      if (countryCode) where.countryCode = countryCode;

      const [totalSent, totalDelivered, totalFailed, totalPending] =
        await Promise.all([
          prisma.deliveryReport.count({ where }),
          prisma.deliveryReport.count({
            where: { ...where, status: "DELIVERED" },
          }),
          prisma.deliveryReport.count({
            where: { ...where, status: "FAILED" },
          }),
          prisma.deliveryReport.count({
            where: { ...where, status: "PENDING" },
          }),
        ]);

      const deliveryRate =
        totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

      await prisma.deliveryAnalytics.upsert({
        where: {
          userId_date_countryCode_serviceType: {
            userId,
            date: today,
            countryCode: countryCode || null,
            serviceType: serviceType || null,
          },
        },
        update: {
          totalSent,
          totalDelivered,
          totalFailed,
          totalPending,
          deliveryRate,
        },
        create: {
          userId,
          date: today,
          totalSent,
          totalDelivered,
          totalFailed,
          totalPending,
          deliveryRate,
          countryCode,
          serviceType,
        },
      });
    } catch (error) {
      console.error("Update Delivery Analytics Error:", error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Calculate average delivery time
   */
  private static async calculateAverageDeliveryTime(
    userId: string,
    filters: any = {}
  ): Promise<number | null> {
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
   * Bulk update delivery statuses (for webhook processing)
   */
  static async bulkUpdateDeliveryStatus(updates: UpdateDeliveryStatusParams[]) {
    try {
      const results = [];

      for (const update of updates) {
        try {
          const result = await this.updateDeliveryStatus(update);
          results.push({
            success: true,
            messageId: update.messageId,
            data: result,
          });
        } catch (error) {
          results.push({
            success: false,
            messageId: update.messageId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return results;
    } catch (error) {
      console.error("Bulk Update Delivery Status Error:", error);
      throw ApiError.internal("Failed to bulk update delivery statuses");
    }
  }

  /**
   * Get delivery reports with pagination and filters (enhanced version)
   */
  static async getDeliveryReportsEnhanced(userId: string, filters: any = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        countryCode,
        startDate,
        endDate,
        search,
      } = filters;

      const skip = (page - 1) * limit;
      const where: any = { userId };

      if (status) {
        where.status = status;
      }

      if (countryCode) {
        where.countryCode = countryCode;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      if (search) {
        where.OR = [
          { messageId: { contains: search, mode: "insensitive" } },
          { networkOperator: { contains: search, mode: "insensitive" } },
          { failureReason: { contains: search, mode: "insensitive" } },
        ];
      }

      const [reports, total] = await Promise.all([
        prisma.deliveryReport.findMany({
          where,
          include: {
            smsLog: {
              include: {
                senderId: true,
              },
            },
            statusHistory: {
              orderBy: { timestamp: "desc" },
              take: 1,
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.deliveryReport.count({ where }),
      ]);

      return {
        reports: reports.map((report) => ({
          id: report.id,
          messageId: report.messageId,
          status: report.status,
          recipients: report.smsLog?.recipients?.length || 0,
          senderId: report.smsLog?.senderId?.senderId || "Unknown",
          message:
            report.smsLog?.message?.substring(0, 100) +
            (report.smsLog?.message?.length > 100 ? "..." : ""),
          countryCode: report.countryCode,
          networkOperator: report.networkOperator,
          cost: report.cost,
          failureReason: report.failureReason,
          deliveredAt: report.deliveredAt,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
          lastStatusUpdate:
            report.statusHistory[0]?.timestamp || report.updatedAt,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Get Delivery Reports Error:", error);
      throw ApiError.internal("Failed to get delivery reports");
    }
  }

  /**
   * Export delivery reports in various formats
   */
  static async exportDeliveryReports(
    userId: string,
    filters: any = {},
    format: string = "csv"
  ) {
    try {
      const where: any = { userId };

      if (filters.status) where.status = filters.status;
      if (filters.countryCode) where.countryCode = filters.countryCode;
      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      const reports = await prisma.deliveryReport.findMany({
        where,
        include: {
          smsLog: {
            include: {
              senderId: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const exportData = reports.map((report) => ({
        "Message ID": report.messageId,
        Status: report.status,
        Recipients: report.smsLog?.recipients?.length || 0,
        "Sender ID": report.smsLog?.senderId?.senderId || "Unknown",
        Message: report.smsLog?.message || "",
        "Country Code": report.countryCode || "",
        "Network Operator": report.networkOperator || "",
        Cost: report.cost || 0,
        "Failure Reason": report.failureReason || "",
        "Delivered At": report.deliveredAt?.toISOString() || "",
        "Created At": report.createdAt.toISOString(),
        "Updated At": report.updatedAt.toISOString(),
      }));

      switch (format.toLowerCase()) {
        case "csv":
          return this.generateCSV(exportData);
        case "json":
          return JSON.stringify(exportData, null, 2);
        default:
          return this.generateCSV(exportData);
      }
    } catch (error) {
      console.error("Export Delivery Reports Error:", error);
      throw ApiError.internal("Failed to export delivery reports");
    }
  }

  /**
   * Generate CSV from data
   */
  private static generateCSV(data: any[]): string {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Escape commas and quotes in CSV
            if (
              typeof value === "string" &&
              (value.includes(",") || value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      ),
    ].join("\n");

    return csvContent;
  }
}
