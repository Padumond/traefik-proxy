import { Request, Response, NextFunction } from 'express';
import { DeliveryTrackingService } from '../services/deliveryTracking.service';
import { ApiError } from '../middleware/error.middleware';

export class DeliveryTrackingController {
  /**
   * Get delivery report by message ID
   */
  static async getDeliveryReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { messageId } = req.params;
      const { userId } = (req as any).user;

      if (!messageId) {
        return res.status(400).json({
          success: false,
          message: 'Message ID is required'
        });
      }

      const deliveryReport = await DeliveryTrackingService.getDeliveryReport(messageId, userId);

      res.status(200).json({
        success: true,
        message: 'Delivery report retrieved successfully',
        data: deliveryReport
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        res.status(error.statusCode || 404).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get delivery report'
        });
      }
    }
  }

  /**
   * Get delivery reports for user
   */
  static async getDeliveryReports(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        status,
        startDate,
        endDate,
        countryCode,
        page,
        limit
      } = req.query;

      const filters: any = {};
      if (status) filters.status = status as any;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (countryCode) filters.countryCode = countryCode as string;
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);

      const result = await DeliveryTrackingService.getDeliveryReports(userId, filters);

      res.status(200).json({
        success: true,
        message: 'Delivery reports retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get delivery reports'
      });
    }
  }

  /**
   * Get delivery statistics
   */
  static async getDeliveryStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        startDate,
        endDate,
        countryCode,
        serviceType
      } = req.query;

      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (countryCode) filters.countryCode = countryCode as string;
      if (serviceType) filters.serviceType = serviceType as string;

      const statistics = await DeliveryTrackingService.getDeliveryStatistics(userId, filters);

      res.status(200).json({
        success: true,
        message: 'Delivery statistics retrieved successfully',
        data: statistics
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get delivery statistics'
      });
    }
  }

  /**
   * Update delivery status (webhook endpoint)
   */
  static async updateDeliveryStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { messageId, status, deliveredAt, failureReason, metadata } = req.body;

      if (!messageId || !status) {
        return res.status(400).json({
          success: false,
          message: 'Message ID and status are required'
        });
      }

      const updatedReport = await DeliveryTrackingService.updateDeliveryStatus({
        messageId,
        status,
        deliveredAt: deliveredAt ? new Date(deliveredAt) : undefined,
        failureReason,
        source: 'webhook',
        metadata
      });

      res.status(200).json({
        success: true,
        message: 'Delivery status updated successfully',
        data: updatedReport
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        res.status(error.statusCode || 400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to update delivery status'
        });
      }
    }
  }

  /**
   * Bulk update delivery statuses
   */
  static async bulkUpdateDeliveryStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { updates } = req.body;

      if (!updates || !Array.isArray(updates)) {
        return res.status(400).json({
          success: false,
          message: 'Updates array is required'
        });
      }

      const results = await DeliveryTrackingService.bulkUpdateDeliveryStatus(updates);

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      res.status(200).json({
        success: true,
        message: `Bulk update completed: ${successCount} successful, ${failureCount} failed`,
        data: {
          results,
          summary: {
            total: results.length,
            successful: successCount,
            failed: failureCount
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to bulk update delivery statuses'
      });
    }
  }

  /**
   * Get delivery summary
   */
  static async getDeliverySummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { period = 'week' } = req.query;

      let startDate: Date;
      const endDate = new Date();

      switch (period) {
        case 'today':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        default:
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
      }

      const [statistics, reports] = await Promise.all([
        DeliveryTrackingService.getDeliveryStatistics(userId, { startDate, endDate }),
        DeliveryTrackingService.getDeliveryReports(userId, {
          startDate,
          endDate,
          page: 1,
          limit: 5
        })
      ]);

      res.status(200).json({
        success: true,
        message: 'Delivery summary retrieved successfully',
        data: {
          period: period as string,
          statistics,
          recentReports: reports.data
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get delivery summary'
      });
    }
  }

  /**
   * Search delivery reports
   */
  static async searchDeliveryReports(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        query,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      // For now, we'll search by message ID or phone number
      // In a real implementation, you might want to use full-text search
      const filters: any = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      if (status) filters.status = status as any;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const result = await DeliveryTrackingService.getDeliveryReports(userId, filters);

      // Filter results based on query (simple implementation)
      const filteredData = result.data.filter(report => 
        report.messageId.includes(query as string) ||
        report.smsLog?.recipients.some(recipient => recipient.includes(query as string))
      );

      res.status(200).json({
        success: true,
        message: 'Search completed successfully',
        data: filteredData,
        pagination: {
          ...result.pagination,
          total: filteredData.length
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to search delivery reports'
      });
    }
  }

  /**
   * Export delivery reports
   */
  static async exportDeliveryReports(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        format = 'csv',
        status,
        startDate,
        endDate,
        countryCode
      } = req.query;

      const filters: any = { limit: 10000 }; // Large limit for export
      if (status) filters.status = status as any;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (countryCode) filters.countryCode = countryCode as string;

      const result = await DeliveryTrackingService.getDeliveryReports(userId, filters);

      if (format === 'json') {
        res.status(200).json({
          success: true,
          message: 'Delivery reports exported successfully',
          data: result.data
        });
      } else {
        // For CSV/Excel export, we would need additional libraries
        // For now, return JSON with a note
        res.status(501).json({
          success: false,
          message: 'CSV/Excel export not yet implemented',
          data: result.data
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to export delivery reports'
      });
    }
  }
}
