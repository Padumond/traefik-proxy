import { Request, Response, NextFunction } from "express";
import { SmsService } from "../services/sms.service";
import { ApiError } from "../middleware/error.middleware";
import { ArkeselService } from "../services/arkessel.service";

export class ClientSmsController {
  /**
   * Send single SMS via client API
   */
  static async sendSms(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).clientApiInfo;
      const { to, message, from, scheduled_date } = req.body;

      // Validate required fields
      if (!to || !message) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PARAMETERS",
            message: "Required parameters: to, message, from",
          },
        });
      }

      // Validate sender ID is provided (required for white-label clients)
      if (!from) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_SENDER_ID",
            message:
              "Sender ID (from) is required. Please use your approved sender ID.",
          },
        });
      }

      // Validate sender ID format
      if (!/^[A-Za-z0-9]{3,11}$/.test(from)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_SENDER_ID_FORMAT",
            message: "Sender ID must be 3-11 alphanumeric characters",
          },
        });
      }

      // Validate phone number format
      const phoneNumbers = Array.isArray(to) ? to : [to];
      for (const phone of phoneNumbers) {
        if (
          !ArkeselService.validatePhoneNumber(
            ArkeselService.formatPhoneNumber(phone)
          )
        ) {
          return res.status(400).json({
            success: false,
            error: {
              code: "INVALID_PHONE_NUMBER",
              message: `Invalid phone number format: ${phone}`,
            },
          });
        }
      }

      // Use the client's provided sender ID (already validated above)
      const senderId = from;

      const result = await SmsService.sendSms({
        senderId,
        message,
        recipients: phoneNumbers,
        userId,
      });

      // Client API response format
      res.status(200).json({
        success: true,
        data: {
          message_id: result.messageId,
          status: result.status.toLowerCase(),
          message: result.message,
          cost: result.cost,
          recipients: phoneNumbers.length,
          sender: senderId,
        },
      });
    } catch (error: any) {
      // Client-friendly error response
      if (error instanceof ApiError) {
        let errorCode = "API_ERROR";
        let statusCode = error.statusCode || 400;

        // Categorize errors for better client understanding
        if (
          error.message.includes("balance") ||
          error.message.includes("Insufficient")
        ) {
          errorCode = "INSUFFICIENT_BALANCE";
        } else if (
          error.message.includes("sender") ||
          error.message.includes("unapproved")
        ) {
          errorCode = "INVALID_SENDER_ID";
          statusCode = 403; // Forbidden - sender ID not approved for this client
        } else if (error.message.includes("not found")) {
          errorCode = "SENDER_ID_NOT_FOUND";
          statusCode = 404;
        }

        res.status(statusCode).json({
          success: false,
          error: {
            code: errorCode,
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "An internal error occurred",
          },
        });
      }
    }
  }

  /**
   * Send bulk SMS via client API
   */
  static async sendBulkSms(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).clientApiInfo;
      const { recipients, message, from } = req.body;

      // Validate required fields
      if (
        !recipients ||
        !Array.isArray(recipients) ||
        recipients.length === 0
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PARAMETERS",
            message: "Recipients array is required and cannot be empty",
          },
        });
      }

      if (!message) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PARAMETERS",
            message: "Message is required",
          },
        });
      }

      // Validate sender ID is provided (required for white-label clients)
      if (!from) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_SENDER_ID",
            message:
              "Sender ID (from) is required. Please use your approved sender ID.",
          },
        });
      }

      // Validate sender ID format
      if (!/^[A-Za-z0-9]{3,11}$/.test(from)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_SENDER_ID_FORMAT",
            message: "Sender ID must be 3-11 alphanumeric characters",
          },
        });
      }

      // Validate phone numbers
      const validRecipients = [];
      const invalidRecipients = [];

      for (const recipient of recipients) {
        const phone =
          typeof recipient === "string" ? recipient : recipient.phone;
        if (
          phone &&
          ArkeselService.validatePhoneNumber(
            ArkeselService.formatPhoneNumber(phone)
          )
        ) {
          validRecipients.push(ArkeselService.formatPhoneNumber(phone));
        } else {
          invalidRecipients.push(phone || "unknown");
        }
      }

      if (validRecipients.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "NO_VALID_RECIPIENTS",
            message: "No valid phone numbers found",
            details: { invalid_recipients: invalidRecipients },
          },
        });
      }

      // Use the client's provided sender ID (already validated above)
      const senderId = from;

      const result = await SmsService.sendSms({
        senderId,
        message,
        recipients: validRecipients,
        userId,
      });

      // Client API response format
      res.status(200).json({
        success: true,
        data: {
          message_id: result.messageId,
          status: result.status.toLowerCase(),
          message: result.message,
          cost: result.cost,
          total_recipients: recipients.length,
          valid_recipients: validRecipients.length,
          invalid_recipients: invalidRecipients.length,
          sender: senderId,
          invalid_numbers:
            invalidRecipients.length > 0 ? invalidRecipients : undefined,
        },
      });
    } catch (error: any) {
      // Client-friendly error response
      if (error instanceof ApiError) {
        let errorCode = "API_ERROR";
        let statusCode = error.statusCode || 400;

        // Categorize errors for better client understanding
        if (
          error.message.includes("balance") ||
          error.message.includes("Insufficient")
        ) {
          errorCode = "INSUFFICIENT_BALANCE";
        } else if (
          error.message.includes("sender") ||
          error.message.includes("unapproved")
        ) {
          errorCode = "INVALID_SENDER_ID";
          statusCode = 403; // Forbidden - sender ID not approved for this client
        } else if (error.message.includes("not found")) {
          errorCode = "SENDER_ID_NOT_FOUND";
          statusCode = 404;
        }

        res.status(statusCode).json({
          success: false,
          error: {
            code: errorCode,
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "An internal error occurred",
          },
        });
      }
    }
  }

  /**
   * Get SMS delivery status
   */
  static async getSmsStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).clientApiInfo;
      const { message_id } = req.params;

      if (!message_id) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PARAMETERS",
            message: "Message ID is required",
          },
        });
      }

      const smsLog = await SmsService.getSmsLog(message_id, userId);

      res.status(200).json({
        success: true,
        data: {
          message_id: smsLog.id,
          status: smsLog.status.toLowerCase(),
          recipients: smsLog.recipients,
          message: smsLog.message,
          sender: smsLog.senderId?.senderId || "Unknown",
          cost: smsLog.cost,
          sent_at: smsLog.sentAt,
          provider_ref: smsLog.providerRef,
        },
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        res.status(error.statusCode || 404).json({
          success: false,
          error: {
            code: "MESSAGE_NOT_FOUND",
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "An internal error occurred",
          },
        });
      }
    }
  }

  /**
   * Get SMS history/logs
   */
  static async getSmsHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).clientApiInfo;
      const {
        page = 1,
        limit = 20,
        status,
        from_date,
        to_date,
        sender,
      } = req.query;

      const filters: any = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100), // Max 100 per page
      };

      if (status) filters.status = (status as string).toUpperCase();
      if (from_date) filters.startDate = new Date(from_date as string);
      if (to_date) filters.endDate = new Date(to_date as string);
      if (sender) filters.senderId = sender as string;

      const result = await SmsService.getSmsLogs(userId, filters);

      // Format response for client API
      const formattedData = result.data.map((sms) => ({
        message_id: sms.id,
        status: sms.status.toLowerCase(),
        recipients: sms.recipients,
        message: sms.message,
        sender: sms.senderId?.senderId || "Unknown",
        cost: sms.cost,
        sent_at: sms.sentAt,
        provider_ref: sms.providerRef,
      }));

      res.status(200).json({
        success: true,
        data: formattedData,
        pagination: {
          current_page: result.pagination.page,
          total_pages: result.pagination.pages,
          total_records: result.pagination.total,
          per_page: result.pagination.limit,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An internal error occurred",
        },
      });
    }
  }

  /**
   * Calculate SMS cost
   */
  static async calculateCost(req: Request, res: Response, next: NextFunction) {
    try {
      const { message, recipients } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PARAMETERS",
            message: "Message is required",
          },
        });
      }

      const recipientCount = Array.isArray(recipients)
        ? recipients.length
        : recipients
        ? 1
        : 1;

      const smsCount = ArkeselService.calculateSmsCount(message);
      const costPerSms = 0.059; // GH₵0.059 per SMS (standard rate)
      const totalCost = costPerSms * recipientCount * smsCount;

      res.status(200).json({
        success: true,
        data: {
          message_length: message.length,
          sms_count: smsCount,
          recipients: recipientCount,
          cost_per_sms: costPerSms,
          total_cost: totalCost,
          is_unicode: /[^\x00-\x7F]/.test(message),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An internal error occurred",
        },
      });
    }
  }
}
