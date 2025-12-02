import { Request, Response, NextFunction } from 'express';
import { CampaignService } from '../services/campaign.service';
import { ApiError } from '../middleware/error.middleware';

export class CampaignController {
  /**
   * Create a new SMS campaign
   */
  static async createCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { name, message, templateId, contactGroupId, senderId, scheduledAt } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Campaign name is required'
        });
      }

      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'Campaign message is required'
        });
      }

      if (!senderId) {
        return res.status(400).json({
          success: false,
          message: 'Sender ID is required'
        });
      }

      const campaign = await CampaignService.createCampaign({
        userId,
        name,
        message,
        templateId,
        contactGroupId,
        senderId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined
      });

      res.status(201).json({
        success: true,
        message: 'Campaign created successfully',
        data: campaign
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
          message: 'Failed to create campaign'
        });
      }
    }
  }

  /**
   * Get campaigns with filtering and pagination
   */
  static async getCampaigns(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { status, search, page, limit } = req.query;

      const filters: any = {};
      if (status) filters.status = status as string;
      if (search) filters.search = search as string;
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);

      const result = await CampaignService.getCampaigns(userId, filters);

      res.status(200).json({
        success: true,
        message: 'Campaigns retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get campaigns'
      });
    }
  }

  /**
   * Get campaign by ID
   */
  static async getCampaignById(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { id } = req.params;

      const campaign = await CampaignService.getCampaignById(id, userId);

      res.status(200).json({
        success: true,
        message: 'Campaign retrieved successfully',
        data: campaign
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        res.status(error.statusCode || 404).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get campaign'
        });
      }
    }
  }

  /**
   * Update campaign
   */
  static async updateCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { id } = req.params;
      const updateData = req.body;

      // Convert scheduledAt to Date if provided
      if (updateData.scheduledAt) {
        updateData.scheduledAt = new Date(updateData.scheduledAt);
      }

      const campaign = await CampaignService.updateCampaign(id, userId, updateData);

      res.status(200).json({
        success: true,
        message: 'Campaign updated successfully',
        data: campaign
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
          message: 'Failed to update campaign'
        });
      }
    }
  }

  /**
   * Delete campaign
   */
  static async deleteCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { id } = req.params;

      const result = await CampaignService.deleteCampaign(id, userId);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        res.status(error.statusCode || 404).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to delete campaign'
        });
      }
    }
  }

  /**
   * Start campaign (send immediately)
   */
  static async startCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { id } = req.params;

      const result = await CampaignService.startCampaign(id, userId);

      res.status(200).json({
        success: true,
        message: result.message
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
          message: 'Failed to start campaign'
        });
      }
    }
  }

  /**
   * Pause campaign
   */
  static async pauseCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { id } = req.params;

      const campaign = await CampaignService.updateCampaign(id, userId, { status: 'PAUSED' });

      res.status(200).json({
        success: true,
        message: 'Campaign paused successfully',
        data: campaign
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
          message: 'Failed to pause campaign'
        });
      }
    }
  }

  /**
   * Resume campaign
   */
  static async resumeCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { id } = req.params;

      const campaign = await CampaignService.updateCampaign(id, userId, { status: 'SENDING' });

      res.status(200).json({
        success: true,
        message: 'Campaign resumed successfully',
        data: campaign
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
          message: 'Failed to resume campaign'
        });
      }
    }
  }

  /**
   * Cancel campaign
   */
  static async cancelCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { id } = req.params;

      const campaign = await CampaignService.updateCampaign(id, userId, { status: 'CANCELLED' });

      res.status(200).json({
        success: true,
        message: 'Campaign cancelled successfully',
        data: campaign
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
          message: 'Failed to cancel campaign'
        });
      }
    }
  }

  /**
   * Get campaign statistics
   */
  static async getCampaignStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;

      const stats = await CampaignService.getCampaignStats(userId);

      res.status(200).json({
        success: true,
        message: 'Campaign statistics retrieved successfully',
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get campaign statistics'
      });
    }
  }

  /**
   * Get campaigns by status
   */
  static async getCampaignsByStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { status } = req.params;
      const { page, limit } = req.query;

      const result = await CampaignService.getCampaigns(userId, {
        status: status.toUpperCase() as any,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20
      });

      res.status(200).json({
        success: true,
        message: `${status} campaigns retrieved successfully`,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get campaigns by status'
      });
    }
  }

  /**
   * Duplicate campaign
   */
  static async duplicateCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { id } = req.params;
      const { name } = req.body;

      // Get original campaign
      const originalCampaign = await CampaignService.getCampaignById(id, userId);

      // Create duplicate with new name
      const duplicatedCampaign = await CampaignService.createCampaign({
        userId,
        name: name || `${originalCampaign.name} (Copy)`,
        message: originalCampaign.message,
        templateId: originalCampaign.templateId,
        contactGroupId: originalCampaign.contactGroupId,
        senderId: originalCampaign.senderId
      });

      res.status(201).json({
        success: true,
        message: 'Campaign duplicated successfully',
        data: duplicatedCampaign
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
          message: 'Failed to duplicate campaign'
        });
      }
    }
  }
}
