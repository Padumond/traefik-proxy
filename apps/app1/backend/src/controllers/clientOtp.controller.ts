import { Request, Response, NextFunction } from 'express';
import { OtpService } from '../services/otp.service';
import { ApiError } from '../middleware/error.middleware';

export class ClientOtpController {
  /**
   * Generate and send OTP (Client API)
   */
  static async generateOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        phone_number,
        type = 'PHONE_VERIFICATION',
        code_length,
        expiry_minutes,
        sender_id,
        message_template,
        reference_id
      } = req.body;

      if (!phone_number) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_PHONE_NUMBER',
          message: 'Phone number is required'
        });
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const result = await OtpService.generateOtp({
        userId,
        phoneNumber: phone_number,
        type: type.toUpperCase(),
        codeLength: code_length,
        expiryMinutes: expiry_minutes,
        senderId: sender_id,
        template: message_template,
        metadata: { reference_id },
        ipAddress,
        userAgent
      });

      res.status(200).json({
        success: true,
        data: {
          otp_id: result.otpId,
          phone_number,
          expires_at: result.expiresAt,
          expiry_minutes: result.expiryMinutes,
          reference_id
        }
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        const errorCode = this.getErrorCode(error.message);
        res.status(error.statusCode || 400).json({
          success: false,
          error: errorCode,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Failed to generate OTP'
        });
      }
    }
  }

  /**
   * Verify OTP code (Client API)
   */
  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        phone_number,
        code,
        type = 'PHONE_VERIFICATION',
        reference_id
      } = req.body;

      if (!phone_number) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_PHONE_NUMBER',
          message: 'Phone number is required'
        });
      }

      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_OTP_CODE',
          message: 'OTP code is required'
        });
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const result = await OtpService.verifyOtp({
        userId,
        phoneNumber: phone_number,
        code,
        type: type.toUpperCase(),
        ipAddress,
        userAgent
      });

      res.status(200).json({
        success: result.success,
        data: {
          verified: result.verified,
          phone_number,
          remaining_attempts: result.remainingAttempts,
          reference_id
        }
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        const errorCode = this.getErrorCode(error.message);
        res.status(error.statusCode || 400).json({
          success: false,
          error: errorCode,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Failed to verify OTP'
        });
      }
    }
  }

  /**
   * Resend OTP (Client API)
   */
  static async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        phone_number,
        type = 'PHONE_VERIFICATION',
        reference_id
      } = req.body;

      if (!phone_number) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_PHONE_NUMBER',
          message: 'Phone number is required'
        });
      }

      const result = await OtpService.resendOtp(userId, phone_number, type.toUpperCase());

      res.status(200).json({
        success: true,
        data: {
          otp_id: result.otpId,
          phone_number,
          expires_at: result.expiresAt,
          expiry_minutes: result.expiryMinutes,
          reference_id
        }
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        const errorCode = this.getErrorCode(error.message);
        res.status(error.statusCode || 400).json({
          success: false,
          error: errorCode,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Failed to resend OTP'
        });
      }
    }
  }

  /**
   * Check OTP status (Client API)
   */
  static async checkOtpStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { phone_number, type = 'PHONE_VERIFICATION' } = req.query;

      if (!phone_number) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_PHONE_NUMBER',
          message: 'Phone number is required'
        });
      }

      const result = await OtpService.getOtpStatus(
        userId, 
        phone_number as string, 
        (type as string).toUpperCase() as any
      );

      if (!result.exists) {
        return res.status(404).json({
          success: false,
          error: 'OTP_NOT_FOUND',
          message: 'No OTP found for this phone number'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          phone_number,
          status: result.status?.toLowerCase(),
          expires_at: result.expiresAt,
          attempts_used: result.attempts,
          max_attempts: result.maxAttempts,
          remaining_attempts: result.remainingAttempts,
          created_at: result.createdAt,
          verified_at: result.verifiedAt
        }
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        const errorCode = this.getErrorCode(error.message);
        res.status(error.statusCode || 400).json({
          success: false,
          error: errorCode,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Failed to check OTP status'
        });
      }
    }
  }

  /**
   * Cancel OTP (Client API)
   */
  static async cancelOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        phone_number,
        type = 'PHONE_VERIFICATION',
        reference_id
      } = req.body;

      if (!phone_number) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_PHONE_NUMBER',
          message: 'Phone number is required'
        });
      }

      const result = await OtpService.cancelOtp(userId, phone_number, type.toUpperCase());

      res.status(200).json({
        success: true,
        data: {
          phone_number,
          cancelled_count: result.cancelled,
          reference_id
        }
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        const errorCode = this.getErrorCode(error.message);
        res.status(error.statusCode || 400).json({
          success: false,
          error: errorCode,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Failed to cancel OTP'
        });
      }
    }
  }

  /**
   * Get OTP usage statistics (Client API)
   */
  static async getOtpStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { days = 30 } = req.query;

      const analytics = await OtpService.getOtpAnalytics(userId, parseInt(days as string));

      res.status(200).json({
        success: true,
        data: {
          period_days: parseInt(days as string),
          total_otps: analytics.totalOtps,
          verified_otps: analytics.verifiedOtps,
          expired_otps: analytics.expiredOtps,
          failed_otps: analytics.failedOtps,
          success_rate: analytics.successRate,
          type_breakdown: analytics.typeBreakdown.map(item => ({
            type: item.type.toLowerCase(),
            count: item.count
          }))
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to get OTP statistics'
      });
    }
  }

  /**
   * Map error messages to client-friendly error codes
   */
  private static getErrorCode(message: string): string {
    const errorMap: { [key: string]: string } = {
      'Invalid phone number format': 'INVALID_PHONE_NUMBER',
      'Rate limit exceeded': 'RATE_LIMIT_EXCEEDED',
      'No valid OTP found': 'OTP_NOT_FOUND',
      'OTP has expired': 'OTP_EXPIRED',
      'Maximum verification attempts exceeded': 'MAX_ATTEMPTS_EXCEEDED',
      'Invalid OTP': 'INVALID_OTP_CODE',
      'Please wait': 'RESEND_TOO_SOON',
      'Failed to send OTP SMS': 'SMS_DELIVERY_FAILED'
    };

    for (const [key, code] of Object.entries(errorMap)) {
      if (message.includes(key)) {
        return code;
      }
    }

    return 'UNKNOWN_ERROR';
  }
}
