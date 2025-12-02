import { PrismaClient, MessageStatus, User, SenderID } from "@prisma/client";
import { ApiError } from "../middleware/error.middleware";
import { ArkeselService } from "./arkessel.service";
import { PricingService } from "./pricing.service";
import { DeliveryTrackingService } from "./deliveryTracking.service";
import { WebhookService } from "./webhook.service";
import axios from "axios";

const prisma = new PrismaClient();

interface SendSmsParams {
  senderId: string;
  message: string;
  recipients: string[];
  userId: string;
}

interface SmsResponse {
  success: boolean;
  messageId?: string;
  message: string;
  status: MessageStatus;
  cost: number;
  totalMessages?: number;
}

export class SmsService {
  /**
   * Send SMS through Arkessel API
   */
  static async sendSms({
    senderId,
    message,
    recipients,
    userId,
  }: SendSmsParams): Promise<SmsResponse> {
    try {
      // First validate if the sender ID is approved for this user
      const senderIdRecord = await prisma.senderID.findFirst({
        where: {
          userId,
          senderId,
          status: "APPROVED",
        },
      });

      if (!senderIdRecord) {
        throw ApiError.badRequest("Invalid or unapproved sender ID");
      }

      // Get the user to check wallet balance
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw ApiError.notFound("User not found");
      }

      // Calculate the cost based on number of recipients and message length
      const smsCount = ArkeselService.calculateSmsCount(message);
      const costPerSms = 0.059; // GH₵0.059 per SMS unit (standard rate)
      const totalCost = costPerSms * recipients.length * smsCount;

      // Check if user has enough balance
      if (user.walletBalance < totalCost) {
        throw ApiError.badRequest("Insufficient wallet balance");
      }

      // Make API call to Arkessel
      const arkeselResponse = await this.callArkeselApi({
        senderId,
        message,
        recipients,
      });

      if (!arkeselResponse.success) {
        throw ApiError.internal(
          `Failed to send SMS: ${arkeselResponse.message}`
        );
      }

      // Deduct from wallet
      await prisma.user.update({
        where: { id: userId },
        data: {
          walletBalance: {
            decrement: totalCost,
          },
        },
      });

      // Record wallet transaction
      await prisma.walletTransaction.create({
        data: {
          userId,
          type: "DEBIT",
          amount: totalCost,
          description: `${recipients.length} SMS messages sent`,
        },
      });

      // Create individual SMS log entries for each recipient
      const smsLogs = await Promise.all(
        recipients.map(async (recipient, index) => {
          return prisma.smsLog.create({
            data: {
              userId,
              senderIdId: senderIdRecord.id,
              message,
              recipients: [recipient], // Single recipient per log entry
              providerRef: arkeselResponse.messageId,
              status: "SENT",
              cost: costPerSms, // Cost per individual message
            },
          });
        })
      );

      return {
        success: true,
        messageId: smsLogs[0].id, // Return first log ID for compatibility
        message: `SMS sent successfully to ${recipients.length} recipients`,
        status: "SENT",
        cost: totalCost,
        totalMessages: recipients.length,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("SMS Service Error:", error);
      throw ApiError.internal("Failed to send SMS");
    }
  }

  /**
   * Call the Arkessel API to send SMS
   * This is a mock implementation - you'll need to replace with actual Arkessel API integration
   */
  private static async callArkeselApi({
    senderId,
    message,
    recipients,
  }: {
    senderId: string;
    message: string;
    recipients: string[];
  }): Promise<{ success: boolean; messageId?: string; message: string }> {
    try {
      // Validate and format phone numbers
      const formattedRecipients = recipients.map((recipient) => {
        const formatted = ArkeselService.formatPhoneNumber(recipient);
        if (!ArkeselService.validatePhoneNumber(formatted)) {
          throw new ApiError(`Invalid phone number format: ${recipient}`, 400);
        }
        return formatted;
      });

      // Send SMS through Arkessel
      const response = await ArkeselService.sendSms({
        to: formattedRecipients,
        message,
        sender: senderId,
        type: /[^\x00-\x7F]/.test(message) ? "unicode" : "plain",
      });

      if (response.status === "success" && response.data) {
        // response.data can be an array of recipients or invalid numbers object
        const messageId =
          Array.isArray(response.data) && response.data.length > 0
            ? response.data[0].id
            : undefined;
        return {
          success: true,
          messageId,
          message: "SMS sent successfully",
        };
      }

      return {
        success: false,
        message: response.message || "Failed to send SMS through Arkessel",
      };
    } catch (error: any) {
      console.error("Arkessel API Error:", error);

      // For development, simulate success if API is not configured
      if (
        process.env.NODE_ENV === "development" &&
        !process.env.ARKESSEL_API_KEY
      ) {
        console.log("Development mode: Simulating SMS send success");
        return {
          success: true,
          messageId: `dev_mock_${Date.now()}`,
          message: "SMS sent successfully (DEVELOPMENT MOCK)",
        };
      }

      return {
        success: false,
        message: error.message || "Failed to connect to SMS provider",
      };
    }
  }

  /**
   * Get SMS logs for a user
   */
  static async getSmsLogs(
    userId: string,
    filters: {
      senderId?: string;
      status?: MessageStatus;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ) {
    const {
      senderId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause based on filters
    const where: any = { userId };

    if (senderId) {
      const senderIdRecord = await prisma.senderID.findFirst({
        where: { senderId, userId },
      });
      if (senderIdRecord) {
        where.senderIdId = senderIdRecord.id;
      }
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.sentAt = {};
      if (startDate) {
        where.sentAt.gte = startDate;
      }
      if (endDate) {
        where.sentAt.lte = endDate;
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.smsLog.count({ where });

    // Get SMS logs
    const smsLogs = await prisma.smsLog.findMany({
      where,
      include: {
        senderId: true,
      },
      orderBy: {
        sentAt: "desc",
      },
      skip,
      take: limit,
    });

    return {
      data: smsLogs,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Get a single SMS log
   */
  static async getSmsLog(id: string, userId: string) {
    const smsLog = await prisma.smsLog.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        senderId: true,
      },
    });

    if (!smsLog) {
      throw ApiError.notFound("SMS log not found");
    }

    return smsLog;
  }

  /**
   * Test Arkessel API connection
   */
  static async testArkeselConnection(): Promise<{
    success: boolean;
    message: string;
    balance?: number;
  }> {
    try {
      return await ArkeselService.testConnection();
    } catch (error: any) {
      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
      };
    }
  }

  /**
   * Get Arkessel account balance
   */
  static async getArkeselBalance(): Promise<{
    success: boolean;
    balance?: number;
    message: string;
  }> {
    try {
      const response = await ArkeselService.getBalance();

      if (response.status === "success" && response.data) {
        return {
          success: true,
          balance: response.data.balance,
          message: "Balance retrieved successfully",
        };
      }

      return {
        success: false,
        message: response.message || "Failed to get balance",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Balance check failed: ${error.message}`,
      };
    }
  }

  /**
   * Send test SMS
   */
  static async sendTestSms(
    phoneNumber: string,
    userId: string
  ): Promise<{ success: boolean; message: string; messageId?: string }> {
    try {
      const testMessage = `Test SMS from Mas3ndi platform. Time: ${new Date().toISOString()}`;
      const defaultSenderId = process.env.ARKESSEL_SENDER_ID || "Mas3ndi";

      // Use the regular sendSms method but with test message
      const result = await this.sendSms({
        senderId: defaultSenderId,
        message: testMessage,
        recipients: [phoneNumber],
        userId,
      });

      return {
        success: result.success,
        message: result.message,
        messageId: result.messageId,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Test SMS failed: ${error.message}`,
      };
    }
  }
}
