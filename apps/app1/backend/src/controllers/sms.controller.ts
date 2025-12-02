import { Request, Response, NextFunction } from "express";
import { SmsService } from "../services/sms.service";
import { ApiError } from "../middleware/error.middleware";
import {
  validateSendSms,
  validateBulkSms,
  validatePagination,
  validateUuidParam,
} from "../middleware/inputValidation.middleware";
import { MessageStatus } from "@prisma/client";
import { AuthenticatedRequest } from "../types/auth.types";
import { prisma } from "../server";

export class SmsController {
  /**
   * Send a single SMS
   */
  static async sendSms(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      const { senderId, recipient, recipients, message, content } = req.body;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      // Accept either 'message' or 'content' field
      const messageText = message || content;

      // Accept either 'recipient' (single) or 'recipients' (array)
      const recipientList = recipients || (recipient ? [recipient] : []);

      if (!senderId || !messageText || !recipientList.length) {
        throw ApiError.badRequest(
          "Sender ID, recipients, and message are required"
        );
      }

      // Validate phone number format for all recipients
      const invalidNumbers = recipientList.filter(
        (num) => !SmsController.isValidPhoneNumber(num)
      );
      if (invalidNumbers.length > 0) {
        throw ApiError.badRequest(
          `Invalid phone number format for: ${invalidNumbers.join(", ")}`
        );
      }

      const result = await SmsService.sendSms({
        userId,
        senderId,
        recipients: recipientList,
        message: messageText,
      });

      res.status(200).json({
        success: true,
        message: "SMS sent successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send bulk SMS
   */
  static async sendBulkSms(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      const { senderId, recipients, message, content } = req.body;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      // Accept either 'message' or 'content' field
      const messageText = message || content;

      if (
        !senderId ||
        !recipients ||
        !messageText ||
        !Array.isArray(recipients)
      ) {
        throw ApiError.badRequest(
          "Sender ID, recipients array, and message are required"
        );
      }

      // Validate recipients
      if (recipients.length === 0) {
        throw ApiError.badRequest("Recipients array cannot be empty");
      }

      // Validate phone number format for all recipients
      const invalidNumbers = recipients.filter(
        (num) => !SmsController.isValidPhoneNumber(num)
      );
      if (invalidNumbers.length > 0) {
        throw ApiError.badRequest(
          `Invalid phone number format for: ${invalidNumbers.join(", ")}`
        );
      }

      const result = await SmsService.sendSms({
        userId,
        senderId,
        recipients,
        message: messageText,
      });

      res.status(200).json({
        success: true,
        message: "Bulk SMS sent successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get SMS logs
   */
  static async getSmsLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      const { status, recipient, senderId, startDate, endDate, page, limit } =
        req.query;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      // Parse date strings to Date objects
      const parsedStartDate = startDate
        ? new Date(startDate as string)
        : undefined;
      const parsedEndDate = endDate ? new Date(endDate as string) : undefined;

      const result = await SmsService.getSmsLogs(userId, {
        status: status as MessageStatus,
        senderId: senderId as string,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get SMS status by ID
   */
  static async getSmsStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      const { id } = req.params;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      // Use getSmsLogs with filters to get a specific SMS by ID
      const result = await SmsService.getSmsLogs(userId, {
        // We don't have a direct getSmsStatus method, so we're using getSmsLogs
        // and will filter the results in the controller
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Get all SMS logs
   */
  static async getAllSmsLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as AuthenticatedRequest).user?.id;
      const {
        status,
        recipient,
        senderId,
        userId,
        startDate,
        endDate,
        page,
        limit,
      } = req.query;

      if (!adminId || (req as AuthenticatedRequest).user?.role !== "ADMIN") {
        throw ApiError.forbidden("Admin access required");
      }

      // Parse date strings to Date objects
      const parsedStartDate = startDate
        ? new Date(startDate as string)
        : undefined;
      const parsedEndDate = endDate ? new Date(endDate as string) : undefined;

      // Create admin-specific query for all users
      const pageNum = page ? parseInt(page as string) : 1;
      const limitNum = limit ? parseInt(limit as string) : 10;
      const skip = (pageNum - 1) * limitNum;

      // Build where clause for admin query (no userId filter)
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (userId) {
        where.userId = userId; // Optional filter by specific user
      }

      if (startDate || endDate) {
        where.sentAt = {};
        if (parsedStartDate) {
          where.sentAt.gte = parsedStartDate;
        }
        if (parsedEndDate) {
          where.sentAt.lte = parsedEndDate;
        }
      }

      // Get total count for pagination
      const totalCount = await prisma.smsLog.count({ where });

      // Get SMS logs with user information
      const smsLogs = await prisma.smsLog.findMany({
        where,
        include: {
          senderId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          sentAt: "desc",
        },
        skip,
        take: limitNum,
      });

      const result = {
        data: smsLogs,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(totalCount / limitNum),
        },
      };

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate phone number format
   * Supports both local Ghanaian format (0XXXXXXXXX) and international format (+233XXXXXXXXX)
   */
  private static isValidPhoneNumber(number: string): boolean {
    // Remove any spaces, dashes, or parentheses
    const cleaned = number.replace(/[\s\-\(\)]/g, "");

    // Ghanaian phone number patterns:
    // 1. Local format: 0XXXXXXXXX (10 digits starting with 0)
    // 2. International format: +233XXXXXXXXX or 233XXXXXXXXX (12-13 digits)
    // 3. General international format: +[country code][number]

    // Check for Ghanaian local format (0XXXXXXXXX - 10 digits)
    if (/^0[2-9]\d{8}$/.test(cleaned)) {
      return true;
    }

    // Check for Ghanaian international format (+233XXXXXXXXX or 233XXXXXXXXX)
    if (/^(\+?233)[2-9]\d{8}$/.test(cleaned)) {
      return true;
    }

    // Check for general international format (+[1-9][4-14 more digits])
    if (/^\+[1-9]\d{4,14}$/.test(cleaned)) {
      return true;
    }

    // Check for other country codes without + (minimum 7 digits, maximum 15)
    if (/^[1-9]\d{6,14}$/.test(cleaned)) {
      return true;
    }

    return false;
  }
}
