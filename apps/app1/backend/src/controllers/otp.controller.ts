import { Request, Response, NextFunction } from 'express';
import { OtpService } from '../services/otp.service';
import { OtpTemplateService } from '../services/otpTemplate.service';
import { ApiError } from '../middleware/error.middleware';

export class OtpController {
  /**
   * Generate and send OTP
   */
  static async generateOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        phoneNumber,
        type = 'PHONE_VERIFICATION',
        codeLength,
        expiryMinutes,
        maxAttempts,
        senderId,
        template,
        metadata
      } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const result = await OtpService.generateOtp({
        userId,
        phoneNumber,
        type,
        codeLength,
        expiryMinutes,
        maxAttempts,
        senderId,
        template,
        metadata,
        ipAddress,
        userAgent
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          otpId: result.otpId,
          expiresAt: result.expiresAt,
          expiryMinutes: result.expiryMinutes
        }
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
          message: 'Failed to generate OTP'
        });
      }
    }
  }

  /**
   * Verify OTP code
   */
  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        phoneNumber,
        code,
        type = 'PHONE_VERIFICATION'
      } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'OTP code is required'
        });
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const result = await OtpService.verifyOtp({
        userId,
        phoneNumber,
        code,
        type,
        ipAddress,
        userAgent
      });

      res.status(200).json({
        success: result.success,
        message: result.message,
        data: {
          verified: result.verified,
          remainingAttempts: result.remainingAttempts
        }
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
          message: 'Failed to verify OTP'
        });
      }
    }
  }

  /**
   * Resend OTP
   */
  static async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        phoneNumber,
        type = 'PHONE_VERIFICATION'
      } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      const result = await OtpService.resendOtp(userId, phoneNumber, type);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          otpId: result.otpId,
          expiresAt: result.expiresAt,
          expiryMinutes: result.expiryMinutes
        }
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
          message: 'Failed to resend OTP'
        });
      }
    }
  }

  /**
   * Get OTP status
   */
  static async getOtpStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { phoneNumber, type = 'PHONE_VERIFICATION' } = req.query;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      const result = await OtpService.getOtpStatus(userId, phoneNumber as string, type as any);

      res.status(200).json({
        success: true,
        message: 'OTP status retrieved successfully',
        data: result
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
          message: 'Failed to get OTP status'
        });
      }
    }
  }

  /**
   * Cancel OTP
   */
  static async cancelOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        phoneNumber,
        type = 'PHONE_VERIFICATION'
      } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      const result = await OtpService.cancelOtp(userId, phoneNumber, type);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          cancelled: result.cancelled
        }
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
          message: 'Failed to cancel OTP'
        });
      }
    }
  }

  /**
   * Get OTP analytics
   */
  static async getOtpAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { days = 30 } = req.query;

      const analytics = await OtpService.getOtpAnalytics(userId, parseInt(days as string));

      res.status(200).json({
        success: true,
        message: 'OTP analytics retrieved successfully',
        data: analytics
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get OTP analytics'
      });
    }
  }

  /**
   * Create OTP template
   */
  static async createTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        name,
        type,
        message,
        codeLength,
        expiryMinutes,
        maxAttempts,
        isDefault
      } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Template name is required'
        });
      }

      if (!type) {
        return res.status(400).json({
          success: false,
          message: 'Template type is required'
        });
      }

      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'Template message is required'
        });
      }

      const template = await OtpTemplateService.createTemplate({
        userId,
        name,
        type,
        message,
        codeLength,
        expiryMinutes,
        maxAttempts,
        isDefault
      });

      res.status(201).json({
        success: true,
        message: 'OTP template created successfully',
        data: template
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
          message: 'Failed to create OTP template'
        });
      }
    }
  }

  /**
   * Get OTP templates
   */
  static async getTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { type, search, page, limit } = req.query;

      const filters: any = {};
      if (type) filters.type = type as string;
      if (search) filters.search = search as string;
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);

      const result = await OtpTemplateService.getTemplates(userId, filters);

      res.status(200).json({
        success: true,
        message: 'OTP templates retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get OTP templates'
      });
    }
  }

  /**
   * Preview OTP template
   */
  static async previewTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { message, sampleCode } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'Template message is required'
        });
      }

      const preview = OtpTemplateService.previewTemplate(message, sampleCode);

      res.status(200).json({
        success: true,
        message: 'Template preview generated successfully',
        data: preview
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
          message: 'Failed to preview template'
        });
      }
    }
  }
}
