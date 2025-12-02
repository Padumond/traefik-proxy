import { Request, Response, NextFunction } from 'express';
import { PricingService } from '../services/pricing.service';
import { ApiError } from '../middleware/error.middleware';

export class PricingController {
  /**
   * Calculate pricing for SMS
   */
  static async calculatePricing(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { volume, countryCode, smsType, baseCost } = req.body;

      if (!volume || volume <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid volume is required'
        });
      }

      const pricing = await PricingService.calculatePricing({
        userId,
        volume,
        countryCode,
        smsType,
        baseCost
      });

      res.status(200).json({
        success: true,
        message: 'Pricing calculated successfully',
        data: pricing
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
          message: 'Failed to calculate pricing'
        });
      }
    }
  }

  /**
   * Create markup rule
   */
  static async createMarkupRule(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        name,
        markupType,
        markupValue,
        minVolume,
        maxVolume,
        countryCode,
        smsType,
        priority
      } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Rule name is required'
        });
      }

      if (!markupType) {
        return res.status(400).json({
          success: false,
          message: 'Markup type is required'
        });
      }

      if (markupValue === undefined || markupValue === null) {
        return res.status(400).json({
          success: false,
          message: 'Markup value is required'
        });
      }

      const markupRule = await PricingService.createMarkupRule({
        userId,
        name,
        markupType,
        markupValue,
        minVolume,
        maxVolume,
        countryCode,
        smsType,
        priority
      });

      res.status(201).json({
        success: true,
        message: 'Markup rule created successfully',
        data: markupRule
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
          message: 'Failed to create markup rule'
        });
      }
    }
  }

  /**
   * Get markup rules
   */
  static async getMarkupRules(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { includeInactive } = req.query;

      const rules = await PricingService.getMarkupRules(
        userId, 
        includeInactive === 'true'
      );

      res.status(200).json({
        success: true,
        message: 'Markup rules retrieved successfully',
        data: rules
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get markup rules'
      });
    }
  }

  /**
   * Update markup rule
   */
  static async updateMarkupRule(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { id } = req.params;
      const updates = req.body;

      const updatedRule = await PricingService.updateMarkupRule(id, userId, updates);

      res.status(200).json({
        success: true,
        message: 'Markup rule updated successfully',
        data: updatedRule
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
          message: 'Failed to update markup rule'
        });
      }
    }
  }

  /**
   * Delete markup rule
   */
  static async deleteMarkupRule(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { id } = req.params;

      const result = await PricingService.deleteMarkupRule(id, userId);

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
          message: 'Failed to delete markup rule'
        });
      }
    }
  }

  /**
   * Get profit analytics
   */
  static async getProfitAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { days = 30 } = req.query;

      const analytics = await PricingService.getProfitAnalytics(
        userId, 
        parseInt(days as string)
      );

      res.status(200).json({
        success: true,
        message: 'Profit analytics retrieved successfully',
        data: analytics
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get profit analytics'
      });
    }
  }

  /**
   * Test markup rule
   */
  static async testMarkupRule(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { volume, countryCode, smsType, baseCost = 0.01 } = req.body;

      if (!volume || volume <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid volume is required for testing'
        });
      }

      const pricing = await PricingService.calculatePricing({
        userId,
        volume,
        countryCode,
        smsType,
        baseCost
      });

      res.status(200).json({
        success: true,
        message: 'Markup rule test completed',
        data: {
          testParameters: {
            volume,
            countryCode,
            smsType,
            baseCost
          },
          result: pricing
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
          message: 'Failed to test markup rule'
        });
      }
    }
  }

  /**
   * Get pricing recommendations
   */
  static async getPricingRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;

      // Get current markup rules and analytics
      const [markupRules, analytics] = await Promise.all([
        PricingService.getMarkupRules(userId),
        PricingService.getProfitAnalytics(userId, 30)
      ]);

      const recommendations = [];

      // Analyze current setup and provide recommendations
      if (markupRules.length === 0) {
        recommendations.push({
          type: 'setup',
          priority: 'high',
          title: 'Create Your First Markup Rule',
          description: 'Set up markup rules to start earning profit on SMS services',
          action: 'Create a basic percentage markup rule (e.g., 20%)'
        });
      }

      if (analytics.totalProfit === 0) {
        recommendations.push({
          type: 'revenue',
          priority: 'medium',
          title: 'No Profit Generated',
          description: 'You haven\'t generated any profit yet',
          action: 'Review your pricing strategy and ensure markup rules are active'
        });
      }

      // Check for volume-based optimization
      const hasVolumeRules = markupRules.some(rule => rule.minVolume > 0 || rule.maxVolume);
      if (!hasVolumeRules && analytics.totalTransactions > 100) {
        recommendations.push({
          type: 'optimization',
          priority: 'medium',
          title: 'Add Volume-Based Pricing',
          description: 'Create tiered pricing for different volume levels',
          action: 'Set up volume-based markup rules for bulk discounts'
        });
      }

      // Check for country-specific rules
      const hasCountryRules = markupRules.some(rule => rule.countryCode);
      if (!hasCountryRules && analytics.profitByType.length > 1) {
        recommendations.push({
          type: 'optimization',
          priority: 'low',
          title: 'Consider Country-Specific Pricing',
          description: 'Different countries may have different cost structures',
          action: 'Create country-specific markup rules for better optimization'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Pricing recommendations generated',
        data: {
          recommendations,
          currentSetup: {
            totalRules: markupRules.length,
            activeRules: markupRules.filter(rule => rule.isActive).length,
            totalProfit: analytics.totalProfit,
            totalTransactions: analytics.totalTransactions
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get pricing recommendations'
      });
    }
  }
}
