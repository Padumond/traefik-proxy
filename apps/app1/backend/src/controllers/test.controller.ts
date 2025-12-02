import { Request, Response } from "express";
import { SmsService } from "../services/sms.service";
import { ArkeselService } from "../services/arkessel.service";
import { ApiError } from "../middleware/error.middleware";

export class TestController {
  /**
   * Test Arkessel API connection
   */
  static async testConnection(req: Request, res: Response) {
    try {
      const result = await SmsService.testArkeselConnection();

      res.json({
        success: true,
        message: "Connection test completed",
        data: result,
      });
    } catch (error: any) {
      console.error("Connection test error:", error);
      res.status(500).json({
        success: false,
        message: "Connection test failed",
        error: error.message,
      });
    }
  }

  /**
   * Get Arkessel account balance
   */
  static async getBalance(req: Request, res: Response) {
    try {
      const result = await SmsService.getArkeselBalance();

      res.json({
        success: true,
        message: "Balance check completed",
        data: result,
      });
    } catch (error: any) {
      console.error("Balance check error:", error);
      res.status(500).json({
        success: false,
        message: "Balance check failed",
        error: error.message,
      });
    }
  }

  /**
   * Send test SMS
   */
  static async sendTestSms(req: Request, res: Response) {
    try {
      const { phoneNumber } = req.body;
      const userId = req.user?.id;

      if (!phoneNumber) {
        throw ApiError.badRequest("Phone number is required");
      }

      if (!userId) {
        throw ApiError.unauthorized("User not authenticated");
      }

      // Validate phone number format
      const formattedPhone = ArkeselService.formatPhoneNumber(phoneNumber);
      if (!ArkeselService.validatePhoneNumber(formattedPhone)) {
        throw ApiError.badRequest("Invalid phone number format");
      }

      const result = await SmsService.sendTestSms(formattedPhone, userId);

      res.json({
        success: true,
        message: "Test SMS completed",
        data: result,
      });
    } catch (error: any) {
      console.error("Test SMS error:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode || 500).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Test SMS failed",
          error: error.message,
        });
      }
    }
  }

  /**
   * Validate phone number
   */
  static async validatePhone(req: Request, res: Response) {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        throw ApiError.badRequest("Phone number is required");
      }

      const formatted = ArkeselService.formatPhoneNumber(phoneNumber);
      const isValid = ArkeselService.validatePhoneNumber(formatted);

      res.json({
        success: true,
        message: "Phone validation completed",
        data: {
          original: phoneNumber,
          formatted: formatted,
          isValid: isValid,
        },
      });
    } catch (error: any) {
      console.error("Phone validation error:", error);
      res.status(500).json({
        success: false,
        message: "Phone validation failed",
        error: error.message,
      });
    }
  }

  /**
   * Calculate SMS cost
   */
  static async calculateCost(req: Request, res: Response) {
    try {
      const { message, recipients } = req.body;

      if (!message) {
        throw ApiError.badRequest("Message is required");
      }

      if (
        !recipients ||
        !Array.isArray(recipients) ||
        recipients.length === 0
      ) {
        throw ApiError.badRequest("Recipients array is required");
      }

      const smsCount = ArkeselService.calculateSmsCount(message);
      const costPerSms = 0.01; // $0.01 per SMS unit
      const totalCost = costPerSms * recipients.length * smsCount;

      res.json({
        success: true,
        message: "Cost calculation completed",
        data: {
          message: message,
          messageLength: message.length,
          smsCount: smsCount,
          recipientCount: recipients.length,
          costPerSms: costPerSms,
          totalCost: totalCost,
          isUnicode: /[^\x00-\x7F]/.test(message),
        },
      });
    } catch (error: any) {
      console.error("Cost calculation error:", error);

      if (error instanceof ApiError) {
        res.status(error.statusCode || 500).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Cost calculation failed",
          error: error.message,
        });
      }
    }
  }

  /**
   * Get API configuration status
   */
  static async getApiStatus(req: Request, res: Response) {
    try {
      const config = {
        hasApiKey: !!process.env.ARKESSEL_API_KEY,
        hasApiUrl: !!process.env.ARKESSEL_API_URL,
        hasSenderId: !!process.env.ARKESSEL_SENDER_ID,
        apiUrl: process.env.ARKESSEL_API_URL || "Not configured",
        senderId: process.env.ARKESSEL_SENDER_ID || "Not configured",
        nodeEnv: process.env.NODE_ENV || "development",
      };

      res.json({
        success: true,
        message: "API configuration status",
        data: config,
      });
    } catch (error: any) {
      console.error("API status error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get API status",
        error: error.message,
      });
    }
  }
}
