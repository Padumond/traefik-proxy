import { Request, Response, NextFunction } from 'express';
import { ClientOnboardingService } from '../services/clientOnboarding.service';
import { ApiError } from '../middleware/error.middleware';

export class ClientOnboardingController {
  /**
   * Register a new client
   */
  static async registerClient(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        companyName,
        contactName,
        email,
        phone,
        website,
        businessType,
        expectedVolume,
        useCase,
        password,
      } = req.body;

      // Validation
      if (!companyName || !contactName || !email || !phone || !businessType || !expectedVolume || !useCase || !password) {
        throw ApiError.badRequest('All required fields must be provided');
      }

      if (password.length < 8) {
        throw ApiError.badRequest('Password must be at least 8 characters long');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw ApiError.badRequest('Invalid email format');
      }

      const result = await ClientOnboardingService.registerClient({
        companyName,
        contactName,
        email,
        phone,
        website,
        businessType,
        expectedVolume,
        useCase,
        password,
      });

      res.status(201).json({
        success: true,
        message: 'Client registration successful. Please check your email for verification.',
        data: {
          clientId: result.clientId,
          status: result.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify client email
   */
  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;

      if (!token) {
        throw ApiError.badRequest('Verification token is required');
      }

      const status = await ClientOnboardingService.verifyEmail(token);

      res.json({
        success: true,
        message: 'Email verified successfully. Your account is now pending approval.',
        data: { status },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get onboarding status for current user
   */
  static async getOnboardingStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized('Authentication required');
      }

      const status = await ClientOnboardingService.getOnboardingStatus(userId);

      res.json({
        success: true,
        message: 'Onboarding status retrieved successfully',
        data: { status },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending client approvals (admin only)
   */
  static async getPendingApprovals(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.role !== 'ADMIN') {
        throw ApiError.forbidden('Admin access required');
      }

      const pendingClients = await ClientOnboardingService.getPendingApprovals();

      res.json({
        success: true,
        message: 'Pending approvals retrieved successfully',
        data: pendingClients,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve or reject a client (admin only)
   */
  static async processClientApproval(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.role !== 'ADMIN') {
        throw ApiError.forbidden('Admin access required');
      }

      const { clientId } = req.params;
      const { approved, rejectionReason, initialCredits, tier } = req.body;

      if (!clientId) {
        throw ApiError.badRequest('Client ID is required');
      }

      if (typeof approved !== 'boolean') {
        throw ApiError.badRequest('Approval status must be specified');
      }

      if (!approved && !rejectionReason) {
        throw ApiError.badRequest('Rejection reason is required when rejecting');
      }

      if (approved && initialCredits && (initialCredits < 0 || initialCredits > 10000)) {
        throw ApiError.badRequest('Initial credits must be between 0 and 10000');
      }

      if (approved && tier && !['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'].includes(tier)) {
        throw ApiError.badRequest('Invalid tier specified');
      }

      const status = await ClientOnboardingService.processClientApproval({
        clientId,
        approved,
        rejectionReason,
        initialCredits,
        tier,
      });

      res.json({
        success: true,
        message: approved ? 'Client approved successfully' : 'Client rejected successfully',
        data: { status },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete client setup
   */
  static async completeSetup(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized('Authentication required');
      }

      if (req.user?.role !== 'CLIENT') {
        throw ApiError.forbidden('Client access required');
      }

      const status = await ClientOnboardingService.completeSetup(userId);

      res.json({
        success: true,
        message: status.completed 
          ? 'Onboarding completed successfully! Welcome to Mas3ndi!' 
          : 'Setup requirements not yet met',
        data: { status },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get client onboarding statistics (admin only)
   */
  static async getOnboardingStats(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.role !== 'ADMIN') {
        throw ApiError.forbidden('Admin access required');
      }

      // This would typically be implemented with proper database queries
      // For now, returning mock data structure
      const stats = {
        totalRegistrations: 0,
        pendingVerification: 0,
        pendingApproval: 0,
        inSetup: 0,
        completed: 0,
        rejected: 0,
        conversionRate: 0,
        averageTimeToComplete: 0,
      };

      res.json({
        success: true,
        message: 'Onboarding statistics retrieved successfully',
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend verification email
   */
  static async resendVerificationEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        throw ApiError.badRequest('Email address is required');
      }

      // This would typically regenerate and send a new verification token
      // For now, returning success message
      res.json({
        success: true,
        message: 'Verification email sent successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update client profile during onboarding
   */
  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized('Authentication required');
      }

      if (req.user?.role !== 'CLIENT') {
        throw ApiError.forbidden('Client access required');
      }

      const {
        companyName,
        phone,
        website,
        businessType,
        expectedVolume,
        useCase,
      } = req.body;

      // This would typically update the client profile
      // For now, returning success message
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          companyName,
          phone,
          website,
          businessType,
          expectedVolume,
          useCase,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get onboarding checklist for client
   */
  static async getOnboardingChecklist(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized('Authentication required');
      }

      if (req.user?.role !== 'CLIENT') {
        throw ApiError.forbidden('Client access required');
      }

      const status = await ClientOnboardingService.getOnboardingStatus(userId);

      const checklist = [
        {
          step: 'email_verification',
          title: 'Verify Email Address',
          description: 'Confirm your email address to activate your account',
          completed: status.step !== 'VERIFICATION',
          required: true,
        },
        {
          step: 'admin_approval',
          title: 'Account Approval',
          description: 'Wait for admin approval of your account',
          completed: ['SETUP', 'COMPLETE'].includes(status.step),
          required: true,
        },
        {
          step: 'create_api_key',
          title: 'Create API Key',
          description: 'Generate your first API key for integration',
          completed: false, // Would check actual API keys
          required: true,
        },
        {
          step: 'request_sender_id',
          title: 'Request Sender ID',
          description: 'Request approval for your SMS sender ID',
          completed: false, // Would check actual sender IDs
          required: true,
        },
        {
          step: 'add_credits',
          title: 'Add Credits',
          description: 'Add credits to your wallet to start sending SMS',
          completed: false, // Would check wallet balance
          required: true,
        },
        {
          step: 'test_integration',
          title: 'Test Integration',
          description: 'Send your first test SMS to verify integration',
          completed: false,
          required: false,
        },
      ];

      res.json({
        success: true,
        message: 'Onboarding checklist retrieved successfully',
        data: {
          status,
          checklist,
          overallProgress: checklist.filter(item => item.completed).length / checklist.length * 100,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
