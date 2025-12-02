import { Request, Response, NextFunction } from 'express';
import { SmsScheduleService } from '../services/sms.schedule.service';
import { ApiError } from '../middleware/error.middleware';
import { isValidPhoneNumber } from '../utils/validators';

export class SmsScheduleController {
  /**
   * Schedule a single SMS
   * @route POST /api/sms/schedule
   */
  static async scheduleSms(req: Request, res: Response, next: NextFunction) {
    try {
      const { senderId, message, recipient, scheduledFor } = req.body;
      const userId = req.user.id;

      // Basic validation
      if (!senderId || !message || !recipient || !scheduledFor) {
        return next(ApiError.badRequest('Missing required fields'));
      }

      // Validate phone number
      if (!isValidPhoneNumber(recipient)) {
        return next(ApiError.badRequest('Invalid phone number format'));
      }

      // Parse scheduled date
      const scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime())) {
        return next(ApiError.badRequest('Invalid date format for scheduling'));
      }

      const result = await SmsScheduleService.scheduleSms({
        senderId,
        message,
        recipients: [recipient],
        userId,
        scheduledFor: scheduledDate
      });

      return res.status(201).json({
        success: true,
        message: 'SMS scheduled successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Schedule bulk SMS
   * @route POST /api/sms/schedule-bulk
   */
  static async scheduleBulkSms(req: Request, res: Response, next: NextFunction) {
    try {
      const { senderId, message, recipients, scheduledFor } = req.body;
      const userId = req.user.id;

      // Basic validation
      if (!senderId || !message || !recipients || !Array.isArray(recipients) || !scheduledFor) {
        return next(ApiError.badRequest('Missing required fields or invalid format'));
      }

      // Validate phone numbers
      const invalidNumbers = recipients.filter(number => !isValidPhoneNumber(number));
      if (invalidNumbers.length > 0) {
        return next(ApiError.badRequest(`Invalid phone number format for: ${invalidNumbers.join(', ')}`));
      }

      // Parse scheduled date
      const scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime())) {
        return next(ApiError.badRequest('Invalid date format for scheduling'));
      }

      const result = await SmsScheduleService.scheduleBulkSms({
        senderId,
        message,
        recipients,
        userId,
        scheduledFor: scheduledDate
      });

      return res.status(201).json({
        success: true,
        message: 'Bulk SMS scheduled successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel scheduled SMS
   * @route DELETE /api/sms/schedule/:id
   */
  static async cancelScheduledSms(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await SmsScheduleService.cancelScheduledSms(id, userId);

      return res.status(200).json({
        success: true,
        message: 'Scheduled SMS cancelled successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get scheduled SMS for user
   * @route GET /api/sms/scheduled
   */
  static async getScheduledSms(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { senderId, status, startDate, endDate, page, limit } = req.query;

      const filters = {
        senderId: senderId as string,
        status: status as any,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10
      };

      const result = await SmsScheduleService.getScheduledSms(userId, filters);

      return res.status(200).json({
        success: true,
        message: 'Scheduled SMS retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all scheduled SMS (admin only)
   * @route GET /api/sms/admin/scheduled
   */
  static async getAllScheduledSms(req: Request, res: Response, next: NextFunction) {
    try {
      const { senderId, status, startDate, endDate, page, limit, userId } = req.query;

      const filters = {
        senderId: senderId as string,
        status: status as any,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10
      };

      // If userId is provided, filter by that user
      const userIdFilter = userId as string;

      const result = await SmsScheduleService.getScheduledSms(
        userIdFilter || req.user.id, 
        filters
      );

      return res.status(200).json({
        success: true,
        message: 'All scheduled SMS retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }
}
