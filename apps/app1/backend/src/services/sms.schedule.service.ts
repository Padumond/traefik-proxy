import { PrismaClient, MessageStatus, ScheduleStatus } from "@prisma/client";
import { addMinutes, isPast } from "date-fns";
import { ApiError } from "../middleware/error.middleware";
import { SmsService } from "./sms.service";
import { ArkeselService } from "./arkessel.service";
import {
  scheduleSmsJob,
  cancelScheduledSmsJob,
  ScheduleSmsJobData,
} from "./queue.service";

const prisma = new PrismaClient();
const smsService = new SmsService();

interface ScheduleSmsParams {
  senderId: string;
  message: string;
  recipients: string[];
  userId: string;
  scheduledFor: Date;
}

interface ScheduleResponse {
  success: boolean;
  scheduleId: string;
  message: string;
  scheduledFor: Date;
}

export class SmsScheduleService {
  /**
   * Schedule an SMS for future delivery
   */
  static async scheduleSms({
    senderId,
    message,
    recipients,
    userId,
    scheduledFor,
  }: ScheduleSmsParams): Promise<ScheduleResponse> {
    try {
      // Validate scheduling time (must be at least 5 minutes in the future)
      const minScheduleTime = addMinutes(new Date(), 5);
      if (isPast(scheduledFor) || scheduledFor < minScheduleTime) {
        throw ApiError.badRequest(
          "Schedule time must be at least 5 minutes in the future"
        );
      }

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
      const costPerSms = 0.059; // GH₵0.059 per SMS (standard rate)
      const totalCost = costPerSms * recipients.length * smsCount;

      // Check if user has enough balance
      if (user.walletBalance < totalCost) {
        throw ApiError.badRequest("Insufficient wallet balance");
      }

      // Create individual SMS log entries for each recipient with scheduled status
      const smsLogs = await Promise.all(
        recipients.map(async (recipient) => {
          return prisma.smsLog.create({
            data: {
              userId,
              senderIdId: senderIdRecord.id,
              message,
              recipients: [recipient], // Single recipient per log entry
              status: "PENDING",
              cost: costPerSms, // Cost per individual message
              isScheduled: true,
              scheduledFor,
              scheduleStatus: "SCHEDULED",
            },
          });
        })
      );

      const smsLog = smsLogs[0]; // Use first log for job scheduling

      // Schedule the job
      const jobData: ScheduleSmsJobData = {
        smsLogId: smsLog.id,
        userId,
        message,
        recipients,
        senderId,
        cost: totalCost,
      };

      const jobId = await scheduleSmsJob(jobData, scheduledFor);

      // Update the SMS log with the job ID
      await prisma.smsLog.update({
        where: { id: smsLog.id },
        data: { jobId },
      });

      return {
        success: true,
        scheduleId: smsLog.id,
        message: "SMS scheduled successfully",
        scheduledFor,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("SMS Schedule Service Error:", error);
      throw ApiError.internal("Failed to schedule SMS");
    }
  }

  /**
   * Schedule bulk SMS messages for future delivery
   */
  static async scheduleBulkSms({
    senderId,
    message,
    recipients,
    userId,
    scheduledFor,
  }: ScheduleSmsParams): Promise<ScheduleResponse> {
    // The implementation is similar to scheduleSms, but optimized for bulk operations
    return this.scheduleSms({
      senderId,
      message,
      recipients,
      userId,
      scheduledFor,
    });
  }

  /**
   * Cancel a scheduled SMS
   */
  static async cancelScheduledSms(
    smsLogId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check if the SMS log exists and belongs to the user
      const smsLog = await prisma.smsLog.findFirst({
        where: {
          id: smsLogId,
          userId,
          isScheduled: true,
          scheduleStatus: "SCHEDULED",
        },
      });

      if (!smsLog) {
        throw ApiError.notFound("Scheduled SMS not found or already processed");
      }

      // Cancel the job in the queue
      const cancelled = await cancelScheduledSmsJob(smsLog.jobId || smsLog.id);

      if (!cancelled) {
        throw ApiError.internal("Failed to cancel scheduled SMS");
      }

      return {
        success: true,
        message: "Scheduled SMS cancelled successfully",
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Cancel Scheduled SMS Error:", error);
      throw ApiError.internal("Failed to cancel scheduled SMS");
    }
  }

  /**
   * Get all scheduled SMS for a user
   */
  static async getScheduledSms(
    userId: string,
    filters: {
      senderId?: string;
      status?: ScheduleStatus;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ) {
    try {
      const {
        senderId,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 10,
      } = filters;

      // Build where conditions
      const where = {
        userId,
        isScheduled: true,
        ...(senderId && {
          senderId: {
            senderId,
          },
        }),
        ...(status && { scheduleStatus: status }),
        ...(startDate &&
          endDate && {
            scheduledFor: {
              gte: startDate,
              lte: endDate,
            },
          }),
      };

      // Get total count for pagination
      const totalCount = await prisma.smsLog.count({ where });

      // Get scheduled SMS with pagination
      const scheduledSms = await prisma.smsLog.findMany({
        where,
        include: {
          senderId: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          scheduledFor: "asc",
        },
      });

      return {
        data: scheduledSms,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      console.error("Get Scheduled SMS Error:", error);
      throw ApiError.internal("Failed to retrieve scheduled SMS");
    }
  }
}
