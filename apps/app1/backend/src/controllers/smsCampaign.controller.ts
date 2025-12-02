import { Request, Response, NextFunction } from "express";
import { ApiError } from "../middleware/error.middleware";
import { SmsCampaignService } from "../services/smsCampaign.service";

export class SmsCampaignController {
  /**
   * Create a new SMS campaign
   */
  static async createCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const {
        name,
        templateId,
        message,
        senderId,
        recipients,
        contactGroupIds,
        scheduledAt,
        variables,
        campaignType,
        recurringConfig,
      } = req.body;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      if (!name || !message || !senderId) {
        throw ApiError.badRequest("Name, message, and sender ID are required");
      }

      if (!recipients?.length && !contactGroupIds?.length) {
        throw ApiError.badRequest("Recipients or contact groups are required");
      }

      const campaign = await SmsCampaignService.createCampaign({
        userId,
        name,
        templateId,
        message,
        senderId,
        recipients: recipients || [],
        contactGroupIds: contactGroupIds || [],
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        variables: variables || {},
        campaignType: campaignType || "IMMEDIATE",
        recurringConfig,
      });

      res.status(201).json({
        success: true,
        message: "Campaign created successfully",
        data: campaign,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's SMS campaigns
   */
  static async getUserCampaigns(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { status, limit, offset } = req.query;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      const result = await SmsCampaignService.getUserCampaigns(userId, {
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
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
   * Get campaign details
   */
  static async getCampaignById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      const campaign = await SmsCampaignService.getCampaignById(id, userId);

      res.status(200).json({
        success: true,
        data: campaign,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel scheduled campaign
   */
  static async cancelCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      const result = await SmsCampaignService.cancelCampaign(id, userId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get campaign messages
   */
  static async getCampaignMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { status, limit, offset } = req.query;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      // Verify campaign belongs to user
      const campaign = await SmsCampaignService.getCampaignById(id, userId);
      if (!campaign) {
        throw ApiError.notFound("Campaign not found");
      }

      // Get campaign messages with filtering
      const messages = await this.getCampaignMessagesWithFilters(id, {
        status: status as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });

      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get campaign analytics
   */
  static async getCampaignAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      // Verify campaign belongs to user
      const campaign = await SmsCampaignService.getCampaignById(id, userId);
      if (!campaign) {
        throw ApiError.notFound("Campaign not found");
      }

      const analytics = await this.calculateCampaignAnalytics(id);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Helper: Get campaign messages with filters
   */
  private static async getCampaignMessagesWithFilters(campaignId: string, options: {
    status?: string;
    limit: number;
    offset: number;
  }) {
    // This would be implemented to fetch messages with proper filtering
    // For now, return a placeholder structure
    return {
      messages: [],
      total: 0,
      limit: options.limit,
      offset: options.offset,
      hasMore: false,
    };
  }

  /**
   * Helper: Calculate campaign analytics
   */
  private static async calculateCampaignAnalytics(campaignId: string) {
    // This would be implemented to calculate comprehensive campaign analytics
    // For now, return a placeholder structure
    return {
      campaignId,
      totalMessages: 0,
      deliveredMessages: 0,
      failedMessages: 0,
      pendingMessages: 0,
      deliveryRate: 0,
      totalCost: 0,
      averageCostPerMessage: 0,
      deliveryTimeAnalysis: {
        averageDeliveryTime: "0 seconds",
        fastestDelivery: "0 seconds",
        slowestDelivery: "0 seconds",
      },
      recipientAnalysis: {
        totalRecipients: 0,
        uniqueRecipients: 0,
        duplicateRecipients: 0,
      },
      timelineAnalysis: {
        hourlyBreakdown: [],
        peakDeliveryHour: 0,
      },
    };
  }
}
