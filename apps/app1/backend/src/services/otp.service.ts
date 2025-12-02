import { PrismaClient, OtpType, OtpStatus } from "@prisma/client";
import { ApiError } from "../middleware/error.middleware";
import { SmsService } from "./sms.service";
import { ArkeselService } from "./arkessel.service";
import crypto from "crypto";

const prisma = new PrismaClient();

interface GenerateOtpParams {
  userId: string;
  phoneNumber: string;
  type?: OtpType;
  codeLength?: number;
  expiryMinutes?: number;
  maxAttempts?: number;
  senderId?: string;
  template?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

interface VerifyOtpParams {
  userId: string;
  phoneNumber: string;
  code: string;
  type?: OtpType;
  ipAddress?: string;
  userAgent?: string;
}

interface OtpRateLimitResult {
  allowed: boolean;
  remainingRequests?: number;
  resetTime?: Date;
  blockedUntil?: Date;
}

export class OtpService {
  /**
   * Generate and send OTP
   */
  static async generateOtp(params: GenerateOtpParams) {
    try {
      const {
        userId,
        phoneNumber,
        type = "PHONE_VERIFICATION",
        codeLength = 6,
        expiryMinutes = 5,
        maxAttempts = 3,
        senderId = "OTP",
        template,
        metadata,
        ipAddress,
        userAgent,
      } = params;

      // Validate phone number
      const formattedPhone = ArkeselService.formatPhoneNumber(phoneNumber);
      if (!ArkeselService.validatePhoneNumber(formattedPhone)) {
        throw ApiError.badRequest("Invalid phone number format");
      }

      // Check rate limits
      const rateLimitCheck = await this.checkRateLimit(
        formattedPhone,
        userId,
        ipAddress
      );
      if (!rateLimitCheck.allowed) {
        throw ApiError.tooManyRequests(
          `Rate limit exceeded. ${
            rateLimitCheck.blockedUntil
              ? `Blocked until ${rateLimitCheck.blockedUntil.toISOString()}`
              : `Try again after ${rateLimitCheck.resetTime?.toISOString()}`
          }`
        );
      }

      // Invalidate any existing pending OTPs for this phone/type
      await prisma.otp.updateMany({
        where: {
          userId,
          phoneNumber: formattedPhone,
          type,
          status: "PENDING",
        },
        data: {
          status: "EXPIRED",
        },
      });

      // Generate secure OTP code
      const code = this.generateSecureCode(codeLength);

      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

      // Create OTP record
      const otp = await prisma.otp.create({
        data: {
          userId,
          phoneNumber: formattedPhone,
          code,
          type,
          expiresAt,
          maxAttempts,
          ipAddress,
          userAgent,
          metadata,
        },
      });

      // Get or create message template
      const message =
        template || (await this.getOtpMessage(userId, type, code));

      // Send SMS
      const smsResult = await SmsService.sendSms({
        senderId,
        message,
        recipients: [formattedPhone],
        userId,
      });

      if (!smsResult.success) {
        // Mark OTP as failed if SMS couldn't be sent
        await prisma.otp.update({
          where: { id: otp.id },
          data: { status: "FAILED" },
        });
        throw ApiError.internal("Failed to send OTP SMS");
      }

      // Update rate limit
      await this.updateRateLimit(formattedPhone, userId, ipAddress);

      return {
        success: true,
        otpId: otp.id,
        expiresAt: otp.expiresAt,
        expiryMinutes,
        message: "OTP sent successfully",
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("OTP Generation Error:", error);
      throw ApiError.internal("Failed to generate OTP");
    }
  }

  /**
   * Verify OTP code
   */
  static async verifyOtp(params: VerifyOtpParams) {
    try {
      const {
        userId,
        phoneNumber,
        code,
        type = "PHONE_VERIFICATION",
        ipAddress,
        userAgent,
      } = params;

      // Format phone number
      const formattedPhone = ArkeselService.formatPhoneNumber(phoneNumber);

      // Find the most recent pending OTP
      const otp = await prisma.otp.findFirst({
        where: {
          userId,
          phoneNumber: formattedPhone,
          type,
          status: "PENDING",
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!otp) {
        throw ApiError.notFound("No valid OTP found for this phone number");
      }

      // Check if OTP has expired
      if (new Date() > otp.expiresAt) {
        await prisma.otp.update({
          where: { id: otp.id },
          data: { status: "EXPIRED" },
        });
        throw ApiError.badRequest("OTP has expired");
      }

      // Check if max attempts exceeded
      if (otp.attempts >= otp.maxAttempts) {
        await prisma.otp.update({
          where: { id: otp.id },
          data: { status: "FAILED" },
        });
        throw ApiError.badRequest("Maximum verification attempts exceeded");
      }

      // Record verification attempt
      const isCorrect = code === otp.code;

      await prisma.otpVerificationAttempt.create({
        data: {
          otpId: otp.id,
          code,
          success: isCorrect,
          ipAddress,
          userAgent,
        },
      });

      // Update OTP attempts
      const updatedOtp = await prisma.otp.update({
        where: { id: otp.id },
        data: {
          attempts: otp.attempts + 1,
          ...(isCorrect
            ? {
                status: "VERIFIED",
                verifiedAt: new Date(),
              }
            : {}),
        },
      });

      if (isCorrect) {
        return {
          success: true,
          verified: true,
          message: "OTP verified successfully",
        };
      } else {
        const remainingAttempts = otp.maxAttempts - (otp.attempts + 1);
        return {
          success: false,
          verified: false,
          remainingAttempts,
          message: `Invalid OTP. ${remainingAttempts} attempts remaining`,
        };
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("OTP Verification Error:", error);
      throw ApiError.internal("Failed to verify OTP");
    }
  }

  /**
   * Resend OTP
   */
  static async resendOtp(
    userId: string,
    phoneNumber: string,
    type: OtpType = "PHONE_VERIFICATION"
  ) {
    try {
      // Find the most recent OTP
      const formattedPhone = ArkeselService.formatPhoneNumber(phoneNumber);

      const existingOtp = await prisma.otp.findFirst({
        where: {
          userId,
          phoneNumber: formattedPhone,
          type,
          status: "PENDING",
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!existingOtp) {
        throw ApiError.notFound("No OTP found to resend");
      }

      // Check if enough time has passed since last OTP (prevent spam)
      const timeSinceLastOtp = Date.now() - existingOtp.createdAt.getTime();
      const minResendInterval = 60 * 1000; // 1 minute

      if (timeSinceLastOtp < minResendInterval) {
        const waitTime = Math.ceil(
          (minResendInterval - timeSinceLastOtp) / 1000
        );
        throw ApiError.badRequest(
          `Please wait ${waitTime} seconds before requesting a new OTP`
        );
      }

      // Generate new OTP with same parameters
      return await this.generateOtp({
        userId,
        phoneNumber: formattedPhone,
        type,
        codeLength: existingOtp.code.length,
        maxAttempts: existingOtp.maxAttempts,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("OTP Resend Error:", error);
      throw ApiError.internal("Failed to resend OTP");
    }
  }

  /**
   * Generate secure random code
   */
  private static generateSecureCode(length: number): string {
    const digits = "0123456789";
    let code = "";

    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, digits.length);
      code += digits[randomIndex];
    }

    return code;
  }

  /**
   * Get OTP message template
   */
  private static async getOtpMessage(
    userId: string,
    type: OtpType,
    code: string
  ): Promise<string> {
    try {
      // Try to find user's custom template
      const template = await prisma.otpTemplate.findFirst({
        where: {
          userId,
          type,
          isDefault: true,
        },
      });

      if (template) {
        return template.message.replace("{{code}}", code);
      }

      // Default templates
      const defaultTemplates = {
        PHONE_VERIFICATION: `Your verification code is ${code}. Valid for 5 minutes.`,
        LOGIN_VERIFICATION: `Your login code is ${code}. Do not share this code.`,
        PASSWORD_RESET: `Your password reset code is ${code}. Valid for 5 minutes.`,
        TRANSACTION_VERIFICATION: `Your transaction verification code is ${code}.`,
        CUSTOM: `Your verification code is ${code}.`,
      };

      return defaultTemplates[type] || defaultTemplates.CUSTOM;
    } catch (error) {
      console.error("Template Error:", error);
      return `Your verification code is ${code}. Valid for 5 minutes.`;
    }
  }

  /**
   * Check rate limits
   */
  private static async checkRateLimit(
    phoneNumber: string,
    userId: string,
    ipAddress?: string
  ): Promise<OtpRateLimitResult> {
    try {
      const now = new Date();
      const windowMinutes = 60; // 1 hour window
      const maxRequestsPerHour = 5;
      const maxRequestsPerDay = 20;

      // Check phone number rate limit
      const phoneRateLimit = await prisma.otpRateLimit.findUnique({
        where: {
          identifier_identifierType: {
            identifier: phoneNumber,
            identifierType: "phone",
          },
        },
      });

      if (phoneRateLimit) {
        // Check if blocked
        if (phoneRateLimit.blockedUntil && phoneRateLimit.blockedUntil > now) {
          return {
            allowed: false,
            blockedUntil: phoneRateLimit.blockedUntil,
          };
        }

        // Check hourly limit
        const hourlyWindowStart = new Date(
          now.getTime() - windowMinutes * 60 * 1000
        );
        if (phoneRateLimit.windowStart > hourlyWindowStart) {
          if (phoneRateLimit.requestCount >= maxRequestsPerHour) {
            return {
              allowed: false,
              resetTime: new Date(
                phoneRateLimit.windowStart.getTime() + windowMinutes * 60 * 1000
              ),
            };
          }
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error("Rate Limit Check Error:", error);
      return { allowed: true }; // Allow on error to prevent blocking legitimate users
    }
  }

  /**
   * Update rate limit counters
   */
  private static async updateRateLimit(
    phoneNumber: string,
    userId: string,
    ipAddress?: string
  ) {
    try {
      const now = new Date();
      const windowMinutes = 60;

      // Update phone rate limit
      await prisma.otpRateLimit.upsert({
        where: {
          identifier_identifierType: {
            identifier: phoneNumber,
            identifierType: "phone",
          },
        },
        update: {
          requestCount: {
            increment: 1,
          },
          updatedAt: now,
        },
        create: {
          identifier: phoneNumber,
          identifierType: "phone",
          userId,
          requestCount: 1,
          windowStart: now,
        },
      });

      // Update IP rate limit if provided
      if (ipAddress) {
        await prisma.otpRateLimit.upsert({
          where: {
            identifier_identifierType: {
              identifier: ipAddress,
              identifierType: "ip",
            },
          },
          update: {
            requestCount: {
              increment: 1,
            },
            updatedAt: now,
          },
          create: {
            identifier: ipAddress,
            identifierType: "ip",
            userId,
            requestCount: 1,
            windowStart: now,
          },
        });
      }
    } catch (error) {
      console.error("Rate Limit Update Error:", error);
      // Don't throw error to prevent blocking OTP generation
    }
  }

  /**
   * Get OTP status
   */
  static async getOtpStatus(
    userId: string,
    phoneNumber: string,
    type: OtpType = "PHONE_VERIFICATION"
  ) {
    try {
      const formattedPhone = ArkeselService.formatPhoneNumber(phoneNumber);

      const otp = await prisma.otp.findFirst({
        where: {
          userId,
          phoneNumber: formattedPhone,
          type,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          verifications: {
            orderBy: {
              attemptedAt: "desc",
            },
            take: 5,
          },
        },
      });

      if (!otp) {
        return {
          exists: false,
          message: "No OTP found",
        };
      }

      const isExpired = new Date() > otp.expiresAt;
      const remainingAttempts = Math.max(0, otp.maxAttempts - otp.attempts);

      return {
        exists: true,
        status: isExpired ? "EXPIRED" : otp.status,
        expiresAt: otp.expiresAt,
        attempts: otp.attempts,
        maxAttempts: otp.maxAttempts,
        remainingAttempts,
        createdAt: otp.createdAt,
        verifiedAt: otp.verifiedAt,
        recentAttempts: otp.verifications,
      };
    } catch (error) {
      console.error("OTP Status Error:", error);
      throw ApiError.internal("Failed to get OTP status");
    }
  }

  /**
   * Cancel/invalidate OTP
   */
  static async cancelOtp(
    userId: string,
    phoneNumber: string,
    type: OtpType = "PHONE_VERIFICATION"
  ) {
    try {
      const formattedPhone = ArkeselService.formatPhoneNumber(phoneNumber);

      const result = await prisma.otp.updateMany({
        where: {
          userId,
          phoneNumber: formattedPhone,
          type,
          status: "PENDING",
        },
        data: {
          status: "EXPIRED",
        },
      });

      return {
        success: true,
        cancelled: result.count,
        message: `${result.count} OTP(s) cancelled`,
      };
    } catch (error) {
      console.error("OTP Cancel Error:", error);
      throw ApiError.internal("Failed to cancel OTP");
    }
  }

  /**
   * Get OTP analytics for user
   */
  static async getOtpAnalytics(userId: string, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [totalOtps, verifiedOtps, expiredOtps, failedOtps, typeBreakdown] =
        await Promise.all([
          prisma.otp.count({
            where: {
              userId,
              createdAt: { gte: startDate },
            },
          }),
          prisma.otp.count({
            where: {
              userId,
              status: "VERIFIED",
              createdAt: { gte: startDate },
            },
          }),
          prisma.otp.count({
            where: {
              userId,
              status: "EXPIRED",
              createdAt: { gte: startDate },
            },
          }),
          prisma.otp.count({
            where: {
              userId,
              status: "FAILED",
              createdAt: { gte: startDate },
            },
          }),
          prisma.otp.groupBy({
            by: ["type"],
            where: {
              userId,
              createdAt: { gte: startDate },
            },
            _count: {
              id: true,
            },
          }),
        ]);

      const successRate = totalOtps > 0 ? (verifiedOtps / totalOtps) * 100 : 0;

      return {
        period: `${days} days`,
        totalOtps,
        verifiedOtps,
        expiredOtps,
        failedOtps,
        successRate: Math.round(successRate * 100) / 100,
        typeBreakdown: typeBreakdown.map((item) => ({
          type: item.type,
          count: item._count.id,
        })),
      };
    } catch (error) {
      console.error("OTP Analytics Error:", error);
      throw ApiError.internal("Failed to get OTP analytics");
    }
  }

  /**
   * Clean up expired OTPs (for maintenance)
   */
  static async cleanupExpiredOtps() {
    try {
      const now = new Date();

      // Mark expired OTPs
      const expiredResult = await prisma.otp.updateMany({
        where: {
          status: "PENDING",
          expiresAt: { lt: now },
        },
        data: {
          status: "EXPIRED",
        },
      });

      // Clean up old rate limit records (older than 24 hours)
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const rateLimitResult = await prisma.otpRateLimit.deleteMany({
        where: {
          windowStart: { lt: dayAgo },
          blockedUntil: null,
        },
      });

      return {
        expiredOtps: expiredResult.count,
        cleanedRateLimits: rateLimitResult.count,
      };
    } catch (error) {
      console.error("OTP Cleanup Error:", error);
      throw ApiError.internal("Failed to cleanup expired OTPs");
    }
  }

  /**
   * Block phone number or IP (admin function)
   */
  static async blockIdentifier(
    identifier: string,
    type: "phone" | "ip",
    blockDurationHours = 24,
    adminId?: string
  ) {
    try {
      const blockedUntil = new Date();
      blockedUntil.setHours(blockedUntil.getHours() + blockDurationHours);

      await prisma.otpRateLimit.upsert({
        where: {
          identifier_identifierType: {
            identifier,
            identifierType: type,
          },
        },
        update: {
          blockedUntil,
          updatedAt: new Date(),
        },
        create: {
          identifier,
          identifierType: type,
          requestCount: 999, // High count to indicate blocked
          windowStart: new Date(),
          blockedUntil,
        },
      });

      return {
        success: true,
        message: `${type} ${identifier} blocked until ${blockedUntil.toISOString()}`,
      };
    } catch (error) {
      console.error("Block Identifier Error:", error);
      throw ApiError.internal("Failed to block identifier");
    }
  }

  /**
   * Unblock phone number or IP (admin function)
   */
  static async unblockIdentifier(identifier: string, type: "phone" | "ip") {
    try {
      await prisma.otpRateLimit.updateMany({
        where: {
          identifier,
          identifierType: type,
        },
        data: {
          blockedUntil: null,
          requestCount: 0,
          windowStart: new Date(),
        },
      });

      return {
        success: true,
        message: `${type} ${identifier} unblocked successfully`,
      };
    } catch (error) {
      console.error("Unblock Identifier Error:", error);
      throw ApiError.internal("Failed to unblock identifier");
    }
  }
}
